import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, rtdb, storage } from '../firebase';
import { INITIAL_EDIR_STATE } from '../data/seedData';
import { AuditLogEntry, EdirState, Role } from '../types';

const LOCAL_CACHE_KEY = 'aleta_wondo_edir_state_v1';

const COLLECTION_KEYS: (keyof Omit<EdirState, 'billingConfig'>)[] = [
  'members',
  'specialContributions',
  'paymentReceipts',
  'benefitRules',
  'disbursements',
  'requests',
  'assets',
  'assetLogs',
  'meetings',
  'attendance',
  'announcements',
  'directives',
  'emergencies',
  'documents',
  'reconciliations',
  'auditLogs',
];

export function loadCachedState(): EdirState {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EdirState>;
      const mergedMembers = (parsed.members || INITIAL_EDIR_STATE.members).map((m) =>
        m.id === 'mem-auditor' ||
        m.email?.toLowerCase() === 'misganalead28@gmail.com' ||
        m.googleEmail?.toLowerCase() === 'misganalead28@gmail.com'
          ? {
              ...m,
              googleEmail: 'misganalead28@gmail.com',
              googleAdminPermission: true,
              isItAdmin: true,
              accessStatus: 'active' as const,
              approvalStatus: 'approved' as const,
            }
          : m
      );
      return {
        ...INITIAL_EDIR_STATE,
        ...parsed,
        members: mergedMembers,
        billingConfig: normalizeBillingConfig({
          ...INITIAL_EDIR_STATE.billingConfig,
          ...(parsed.billingConfig || {}),
        }),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return INITIAL_EDIR_STATE;
}

function normalizeBillingConfig(
  cfg: EdirState['billingConfig']
): EdirState['billingConfig'] {
  return {
    ...cfg,
    cbeAccountNumber:
      !cfg.cbeAccountNumber || cfg.cbeAccountNumber === '1000482910384'
        ? '1000772333898'
        : cfg.cbeAccountNumber,
    coopAccountNumber: cfg.coopAccountNumber || '1062700129895',
  };
}

export function saveCachedState(state: EdirState): void {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors on large attachments
  }
}

export function createAuditEntry(
  actorName: string,
  actorRole: Role,
  action: string,
  module: string,
  details: string,
  actorId?: string
): AuditLogEntry {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 16);
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId,
    actorName,
    actorRole,
    action,
    module,
    details,
    timestamp,
  };
}

export async function seedFirestoreIfEmpty(): Promise<{ connected: boolean; error?: string }> {
  try {
    const snap = await getDocs(collection(db, 'members'));
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const key of COLLECTION_KEYS) {
        const items = INITIAL_EDIR_STATE[key] as { id: string }[];
        for (const item of items) {
          batch.set(doc(db, key, item.id), item);
        }
      }
      batch.set(doc(db, 'settings', 'billingConfig'), INITIAL_EDIR_STATE.billingConfig);
      await batch.commit();
    }
    return { connected: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Firestore connection error';
    return { connected: false, error: msg };
  }
}

export async function testFirebaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await getDocFromServer(doc(db, 'settings', 'billingConfig'));
    return { connected: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to reach Firestore';
    return { connected: false, error: msg };
  }
}

export async function syncFullStateToFirestore(
  state: EdirState
): Promise<{ ok: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    for (const key of COLLECTION_KEYS) {
      const items = state[key] as { id: string }[];
      for (const item of items) {
        batch.set(doc(db, key, item.id), item);
      }
    }
    batch.set(doc(db, 'settings', 'billingConfig'), state.billingConfig);
    await batch.commit();
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return { ok: false, error: msg };
  }
}

export function subscribeToEdirFirestore(
  onPatch: (patch: Partial<EdirState>) => void,
  onSyncStatus: (connected: boolean, note?: string) => void
): () => void {
  const unsubs: (() => void)[] = [];

  for (const key of COLLECTION_KEYS) {
    const unsub = onSnapshot(
      collection(db, key),
      (snapshot) => {
        onSyncStatus(true);
        if (!snapshot.empty) {
          const items = snapshot.docs.map((d) => d.data());
          onPatch({ [key]: items } as Partial<EdirState>);
        }
      },
      (err) => {
        onSyncStatus(false, err.message);
      }
    );
    unsubs.push(unsub);
  }

  const unsubConfig = onSnapshot(
    doc(db, 'settings', 'billingConfig'),
    (docSnap) => {
      if (docSnap.exists()) {
        onPatch({
          billingConfig: normalizeBillingConfig(
            docSnap.data() as EdirState['billingConfig']
          ),
        });
      }
    },
    () => {
      // Handled by collection listeners
    }
  );
  unsubs.push(unsubConfig);

  try {
    const liveRef = rtdbRef(rtdb, 'live_alerts');
    const unsubRtdb = onValue(
      liveRef,
      () => {
        // Live RTDB channel active
      },
      () => {
        // RTDB optional if rules restrict
      }
    );
    unsubs.push(unsubRtdb);
  } catch {
    // Ignore RTDB init error
  }

  return () => {
    unsubs.forEach((fn) => fn());
  };
}

export async function persistCollectionDoc<T extends { id: string }>(
  collectionName: keyof Omit<EdirState, 'billingConfig'>,
  item: T
): Promise<void> {
  try {
    await setDoc(doc(db, collectionName, item.id), item);
  } catch {
    // Local cache already updated optimistically
  }
}

export async function persistBillingConfig(
  config: EdirState['billingConfig']
): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'billingConfig'), config);
  } catch {
    // Local cache already updated
  }
}

export async function broadcastLiveAlert(
  channel: 'emergency' | 'meeting',
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await rtdbSet(rtdbRef(rtdb, `live_alerts/${channel}`), {
      ...payload,
      updatedAt: Date.now(),
    });
  } catch {
    // Fallback handled via Firestore/local state
  }
}

export async function uploadFileToStorage(
  folder: 'receipts' | 'archives' | 'avatars',
  file: File
): Promise<{ url: string; viaFirebaseStorage: boolean }> {
  try {
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileRef = storageRef(storage, `${folder}/${safeName}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { url, viaFirebaseStorage: true };
  } catch {
    // Fallback to browser DataURL so uploaded receipts & documents preview/download immediately
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    return { url: dataUrl, viaFirebaseStorage: false };
  }
}
