import React, { useEffect, useMemo, useState } from 'react';
import {
  Globe,
  IdCard,
  KeyRound,
  LayoutGrid,
  LogOut,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  Announcement,
  AssetMovementLog,
  AttendanceRecord,
  BankReconciliation,
  BenefitRule,
  BillingConfig,
  CommitteeDirective,
  DisbursementRequest,
  DocumentArchiveItem,
  EdirAsset,
  EdirRequest,
  EdirState,
  EmergencyAlert,
  FamilyMember,
  Language,
  MeetingSession,
  MemberRecord,
  PaymentReceipt,
  ResidenceZone,
  Role,
  SpecialContribution,
} from './types';
import { COPY, ORG_NAME, ROLE_LABELS, getText } from './i18n';
import {
  broadcastLiveAlert,
  createAuditEntry,
  loadCachedState,
  persistBillingConfig,
  persistCollectionDoc,
  saveCachedState,
  seedFirestoreIfEmpty,
  subscribeToEdirFirestore,
  syncFullStateToFirestore,
  testFirebaseConnection,
} from './services/edirStore';
import { DEFAULT_TEMP_PASSWORD, hashPassword } from './utils/password';
import { GoogleAuthPayload, LoginView } from './components/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ChairmanModule } from './components/ChairmanModule';
import { ViceChairmanModule } from './components/ViceChairmanModule';
import { SecretaryModule } from './components/SecretaryModule';
import { CashierModule } from './components/CashierModule';
import { AuditorAdminModule } from './components/AuditorAdminModule';
import { PrModule } from './components/PrModule';
import { CommitteeOpsModule } from './components/CommitteeOpsModule';
import { MemberSelfServicePortal } from './components/MemberSelfServicePortal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

const isItSystemAdmin = (user: MemberRecord | null): boolean =>
  Boolean(user && (user.role === 'auditor' || user.isItAdmin));

export default function App() {
  const [lang, setLang] = useState<Language>('am');
  const [state, setState] = useState<EdirState>(() => loadCachedState());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPersonalPortal, setShowPersonalPortal] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  const [firebaseStatus, setFirebaseStatus] = useState<{
    connected: boolean;
    note?: string;
  }>({ connected: false });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    seedFirestoreIfEmpty()
      .then((res) => {
        setFirebaseStatus({ connected: res.connected, note: res.error });
      })
      .catch(() => {});

    testFirebaseConnection()
      .then((res) => {
        setFirebaseStatus((prev) => ({
          connected: res.connected || prev.connected,
          note: res.error,
        }));
      })
      .catch(() => {});

    const unsubscribe = subscribeToEdirFirestore(
      (patch) => {
        setState((prev) => {
          const next = { ...prev, ...patch };
          saveCachedState(next);
          return next;
        });
      },
      (connected, note) => {
        setFirebaseStatus({ connected, note });
      }
    );

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser?.email) {
        const emailLower = fbUser.email.toLowerCase();
        setState((prev) => {
          const matched = prev.members.find(
            (m) =>
              m.email.toLowerCase() === emailLower ||
              (m.googleEmail && m.googleEmail.toLowerCase() === emailLower)
          );
          if (
            matched &&
            matched.accessStatus === 'active' &&
            matched.approvalStatus === 'approved' &&
            !matched.locked
          ) {
            setCurrentUserId((cur) => cur || matched.id);
          }
          return prev;
        });
      }
    });

    return () => {
      unsubscribe();
      unsubAuth();
    };
  }, []);

  const currentUser = useMemo(
    () => state.members.find((m) => m.id === currentUserId) || null,
    [state.members, currentUserId]
  );

  const commitState = (
    updater: (prev: EdirState) => EdirState,
    audit?: { action: string; module: string; details: string }
  ) => {
    setState((prev) => {
      const updated = updater(prev);
      let finalState = updated;
      if (audit && currentUser) {
        const entry = createAuditEntry(
          currentUser.fullNameEn,
          currentUser.role,
          audit.action,
          audit.module,
          audit.details,
          currentUser.memberCode
        );
        finalState = {
          ...updated,
          auditLogs: [entry, ...updated.auditLogs],
        };
        persistCollectionDoc('auditLogs', entry);
      }
      saveCachedState(finalState);
      return finalState;
    });
  };

  const handleLoginSuccess = (
    member: MemberRecord,
    usedDefaultTemp = false
  ) => {
    setCurrentUserId(member.id);
    setShowPersonalPortal(false);
    if (usedDefaultTemp) {
      setForcePasswordChange(true);
      setShowChangePassword(true);
    } else {
      setForcePasswordChange(false);
      setShowChangePassword(false);
    }
  };

  const handleGoogleSignIn = (
    payload: GoogleAuthPayload
  ): { ok: boolean; messageAm?: string; messageEn?: string } => {
    const emailLower = payload.email.trim().toLowerCase();
    const isOwnerAdmin = emailLower === 'misganalead28@gmail.com';

    const existing = state.members.find(
      (m) =>
        m.email.toLowerCase() === emailLower ||
        (m.googleEmail && m.googleEmail.toLowerCase() === emailLower)
    );

    if (existing) {
      if (
        (existing.accessStatus === 'suspended' || existing.locked) &&
        !isOwnerAdmin
      ) {
        return {
          ok: false,
          messageAm:
            'ይህ የGoogle መለያ በሲስተም አስተዳዳሪ (ምስጋና ተስፋዬ) ታግዷል ወይም ተቆልፏል።',
          messageEn:
            'This Google account is currently suspended or locked by IT System Admin.',
        };
      }
      if (
        (existing.accessStatus !== 'active' ||
          existing.approvalStatus !== 'approved') &&
        !isOwnerAdmin
      ) {
        return {
          ok: false,
          messageAm:
            'የGoogle መለያዎ የሲስተም አስተዳዳሪ (ምስጋና ተስፋዬ) ማረጋገጫ በመጠባበቅ ላይ ነው።',
          messageEn:
            'Your Google account is awaiting IT System Admin (Misgana Tesfaye) approval.',
        };
      }

      const upgraded: MemberRecord = {
        ...existing,
        googleEmail: payload.email,
        photoUrl: existing.photoUrl || payload.photoURL,
        role: isOwnerAdmin ? existing.role || 'auditor' : existing.role,
        accessStatus: isOwnerAdmin ? 'active' : existing.accessStatus,
        approvalStatus: isOwnerAdmin ? 'approved' : existing.approvalStatus,
        locked: isOwnerAdmin ? false : existing.locked,
        isItAdmin: isOwnerAdmin ? true : existing.isItAdmin,
        googleAdminPermission: isOwnerAdmin
          ? true
          : existing.googleAdminPermission,
      };
      persistCollectionDoc('members', upgraded);
      const entry = createAuditEntry(
        upgraded.fullNameEn,
        upgraded.role,
        upgraded.isItAdmin ? 'GOOGLE_IT_ADMIN_SIGNIN' : 'GOOGLE_SIGNIN',
        'Authentication',
        `Signed in via Google (${payload.email}).`,
        upgraded.memberCode
      );
      persistCollectionDoc('auditLogs', entry);
      setState((prev) => {
        const next: EdirState = {
          ...prev,
          members: prev.members.map((m) =>
            m.id === upgraded.id ? upgraded : m
          ),
          auditLogs: [entry, ...prev.auditLogs],
        };
        saveCachedState(next);
        return next;
      });
      setCurrentUserId(upgraded.id);
      setShowPersonalPortal(false);
      return { ok: true };
    }

    if (isOwnerAdmin) {
      const code = `EAW-${String(state.members.length + 1).padStart(3, '0')}`;
      const id = `mem-gadmin-${Date.now()}`;
      const newAdmin: MemberRecord = {
        id,
        memberCode: code,
        fullNameAm: 'ምስጋና ተስፋዬ',
        fullNameEn: payload.displayName || 'Misgana Tesfaye',
        email: payload.email,
        googleEmail: payload.email,
        phone: '+251911200005',
        role: 'auditor',
        accessStatus: 'active',
        approvalStatus: 'approved',
        googleAdminPermission: true,
        isItAdmin: true,
        residenceZone: 'aleta_wondo',
        residenceCityAm: 'አለታ ወንዶ',
        residenceCityEn: 'Aleta Wondo',
        joinedDate: new Date().toISOString().slice(0, 10),
        paidMonths: state.billingConfig.activeBillingMonths,
        familyMembers: [],
        registeredBy: 'IT System Admin Provisioning',
        approvedBy: 'System Admin',
        photoUrl: payload.photoURL,
        qrToken: `EAW-ID:${code}:${id}`,
      };
      const entry = createAuditEntry(
        newAdmin.fullNameEn,
        newAdmin.role,
        'GOOGLE_IT_ADMIN_SIGNIN',
        'Authentication',
        `Provisioned and signed in Misgana Tesfaye (${payload.email}) as Auditor & IT System Admin.`,
        newAdmin.memberCode
      );
      persistCollectionDoc('members', newAdmin);
      persistCollectionDoc('auditLogs', entry);
      setState((prev) => {
        const next = {
          ...prev,
          members: [...prev.members, newAdmin],
          auditLogs: [entry, ...prev.auditLogs],
        };
        saveCachedState(next);
        return next;
      });
      setCurrentUserId(newAdmin.id);
      setShowPersonalPortal(false);
      return { ok: true };
    }

    const code = `EAW-${String(state.members.length + 1).padStart(3, '0')}`;
    const id = `mem-greq-${Date.now()}`;
    const pendingUser: MemberRecord = {
      id,
      memberCode: code,
      fullNameAm: payload.displayName,
      fullNameEn: payload.displayName,
      email: payload.email,
      googleEmail: payload.email,
      phone: '+251900000000',
      role: 'member',
      accessStatus: 'pending',
      approvalStatus: 'pending_chairman',
      googleAdminPermission: false,
      residenceZone: 'aleta_wondo',
      residenceCityAm: 'አለታ ወንዶ',
      residenceCityEn: 'Aleta Wondo',
      joinedDate: new Date().toISOString().slice(0, 10),
      paidMonths: [],
      familyMembers: [],
      registeredBy: 'Google Sign-In Request',
      photoUrl: payload.photoURL,
      qrToken: `EAW-ID:${code}:${id}`,
      mustChangePassword: true,
      defaultTempPassword: DEFAULT_TEMP_PASSWORD,
    };
    persistCollectionDoc('members', pendingUser);
    setState((prev) => {
      const next = { ...prev, members: [...prev.members, pendingUser] };
      saveCachedState(next);
      return next;
    });
    return {
      ok: false,
      messageAm: `የGoogle መለያዎ (${payload.email}) በመጠባበቅ ላይ ተመዝግቧል። ዋና ሰብሳቢው ሲያጸድቁ እና የሲስተም አስተዳዳሪው (ምስጋና ተስፋዬ) ፈቃድ ሲሰጥዎ መግባት ይችላሉ።`,
      messageEn: `Your Google account (${payload.email}) has been queued for Chairman approval and IT System Admin (Misgana Tesfaye) access activation.`,
    };
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore if session was local quick-switch
    }
    setCurrentUserId(null);
    setForcePasswordChange(false);
    setShowChangePassword(false);
    setShowPersonalPortal(false);
  };

  // ============================================================================
  // HANDLERS (Persisted to Firestore + RTDB + Immutable Audit Log)
  // ============================================================================
  const handleUpdatePassword = (newPasswordHash: string) => {
    if (!currentUser) return;
    const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    commitState(
      (prev) => {
        const members = prev.members.map((m) =>
          m.id === currentUser.id
            ? {
                ...m,
                passwordHash: newPasswordHash,
                mustChangePassword: false,
                defaultTempPassword: undefined,
                lastPasswordResetAt: nowStamp,
              }
            : m
        );
        const updated = members.find((m) => m.id === currentUser.id);
        if (updated) persistCollectionDoc('members', updated);
        return { ...prev, members };
      },
      {
        action: 'USER_PASSWORD_CHANGED',
        module: 'Authentication',
        details: `${currentUser.fullNameEn} (${currentUser.memberCode}) set a new personal password in-app at ${nowStamp}.`,
      }
    );
    setForcePasswordChange(false);
    setShowChangePassword(false);
  };

  const handleSubmitReceipt = (
    payload: Omit<PaymentReceipt, 'id' | 'status' | 'submittedAt'>
  ) => {
    const newRec: PaymentReceipt = {
      ...payload,
      id: `rec-${Date.now()}`,
      status: 'pending',
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    persistCollectionDoc('paymentReceipts', newRec);
    commitState(
      (prev) => ({
        ...prev,
        paymentReceipts: [newRec, ...prev.paymentReceipts],
      }),
      {
        action: 'RECEIPT_SUBMITTED',
        module: 'Finance',
        details: `${payload.memberCode} submitted ${payload.amount} ETB via ${payload.channel} (${payload.referenceNumber}).`,
      }
    );
  };

  const handleSubmitEmergency = (
    payload: Omit<EmergencyAlert, 'id' | 'status' | 'createdAt'>
  ) => {
    const newAlert: EmergencyAlert = {
      ...payload,
      id: `emg-${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    persistCollectionDoc('emergencies', newAlert);
    broadcastLiveAlert('emergency', newAlert as unknown as Record<string, unknown>);
    commitState(
      (prev) => ({
        ...prev,
        emergencies: [newAlert, ...prev.emergencies],
      }),
      {
        action: 'EMERGENCY_ALERT_SENT',
        module: 'Emergency Notification',
        details: `${payload.memberNameEn} (${payload.memberCode}) reported ${payload.emergencyType}: ${payload.relationAffected}.`,
      }
    );
  };

  const handleSubmitRequest = (
    payload: Omit<EdirRequest, 'id' | 'status' | 'createdAt'>
  ) => {
    const newReq: EdirRequest = {
      ...payload,
      id: `req-${Date.now()}`,
      status: 'submitted',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    persistCollectionDoc('requests', newReq);
    commitState(
      (prev) => ({
        ...prev,
        requests: [newReq, ...prev.requests],
      }),
      {
        action: 'REQUEST_SUBMITTED',
        module: 'Operations & Property',
        details: `${payload.memberNameEn} submitted ${payload.requestType} request: ${payload.subjectEn}.`,
      }
    );
  };

  const handleUpdateFamily = (
    memberId: string,
    familyMembers: FamilyMember[]
  ) => {
    commitState(
      (prev) => {
        const members = prev.members.map((m) =>
          m.id === memberId ? { ...m, familyMembers } : m
        );
        const updated = members.find((m) => m.id === memberId);
        if (updated) persistCollectionDoc('members', updated);
        return { ...prev, members };
      },
      {
        action: 'FAMILY_REGISTRY_UPDATED',
        module: 'Members & Family',
        details: `Updated family registry (${familyMembers.length} dependents) for ${memberId}.`,
      }
    );
  };

  const handleUpdatePhoto = (memberId: string, photoUrl: string) => {
    commitState(
      (prev) => {
        const members = prev.members.map((m) =>
          m.id === memberId ? { ...m, photoUrl } : m
        );
        const updated = members.find((m) => m.id === memberId);
        if (updated) persistCollectionDoc('members', updated);
        return { ...prev, members };
      },
      {
        action: 'MEMBER_PHOTO_UPDATED',
        module: 'Digital ID',
        details: `Updated Digital ID photo for ${memberId}.`,
      }
    );
  };

  const handleScanAttendance = (scannedValue: string) => {
    const activeMeeting = state.meetings.find((m) => m.status === 'active');
    if (!activeMeeting) {
      return {
        ok: false,
        messageAm: 'በአሁኑ ጊዜ የተከፈተ ስብሰባ የለም።',
        messageEn: 'No active meeting session found.',
      };
    }

    let targetMember: MemberRecord | undefined;
    if (scannedValue.startsWith('EAW-MEETING:')) {
      if (!currentUser) {
        return {
          ok: false,
          messageAm: 'አባል አልተለየም።',
          messageEn: 'No active user session.',
        };
      }
      targetMember = currentUser;
    } else if (scannedValue.startsWith('EAW-ID:')) {
      const parts = scannedValue.split(':');
      targetMember = state.members.find(
        (m) => m.qrToken === scannedValue || m.memberCode === parts[1]
      );
    } else {
      targetMember = state.members.find(
        (m) => m.memberCode.toLowerCase() === scannedValue.trim().toLowerCase()
      );
    }

    if (!targetMember) {
      return {
        ok: false,
        messageAm:
          'ያልታወቀ የQR ኮድ ነው። እባክዎ ትክክለኛ የስብሰባ ወይም የመታወቂያ QR ይጠቀሙ።',
        messageEn: 'Unrecognized QR token. Scan a valid Meeting or Digital ID QR.',
      };
    }

    if (targetMember.residenceZone === 'outside') {
      return {
        ok: true,
        messageAm: `${targetMember.fullNameAm} ከአለታ ወንዶ ውጪ ነዋሪ ስለሆኑ ከአካላዊ ስብሰባ ቆጠራ በራስ-ሰር ነፃ (Exempt) ናቸው።`,
        messageEn: `${targetMember.fullNameEn} resides outside Aleta Wondo and is automatically exempt from physical attendance.`,
      };
    }

    const attId = `att-${activeMeeting.id}-${targetMember.id}`;
    const record: AttendanceRecord = {
      id: attId,
      meetingId: activeMeeting.id,
      memberId: targetMember.id,
      memberCode: targetMember.memberCode,
      memberNameAm: targetMember.fullNameAm,
      memberNameEn: targetMember.fullNameEn,
      residenceZone: targetMember.residenceZone,
      status: 'present',
      method: 'qr_scan',
      checkedInAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      checkedInBy: currentUser?.fullNameEn || 'QR Scanner',
    };
    persistCollectionDoc('attendance', record);
    commitState(
      (prev) => ({
        ...prev,
        attendance: [
          record,
          ...prev.attendance.filter((a) => a.id !== attId),
        ],
      }),
      {
        action: 'QR_ATTENDANCE_CHECKIN',
        module: 'Meetings',
        details: `QR check-in recorded for ${targetMember.fullNameEn} (${targetMember.memberCode}).`,
      }
    );

    return {
      ok: true,
      messageAm: `${targetMember.fullNameAm} (${targetMember.memberCode}) በስብሰባው ላይ መገኘታቸው በQR ተመዝግቧል!`,
      messageEn: `Attendance verified via QR for ${targetMember.fullNameEn} (${targetMember.memberCode})!`,
    };
  };

  const handleIssueDirective = (
    d: Omit<CommitteeDirective, 'id' | 'issuedAt' | 'status'>
  ) => {
    const newDir: CommitteeDirective = {
      ...d,
      id: `dir-${Date.now()}`,
      issuedAt: new Date().toISOString().slice(0, 10),
      status: 'open',
    };
    persistCollectionDoc('directives', newDir);
    commitState(
      (prev) => ({ ...prev, directives: [newDir, ...prev.directives] }),
      {
        action: 'DIRECTIVE_ISSUED',
        module: 'Executive Console',
        details: `Chairman issued directive: ${d.titleEn}`,
      }
    );
  };

  const handleApproveMember = (
    memberId: string,
    decision: 'approved' | 'rejected'
  ) => {
    commitState(
      (prev) => {
        const members = prev.members.map((m) =>
          m.id === memberId
            ? {
                ...m,
                approvalStatus: decision,
                approvedBy: currentUser?.fullNameEn,
              }
            : m
        );
        const updated = members.find((m) => m.id === memberId);
        if (updated) persistCollectionDoc('members', updated);
        return { ...prev, members };
      },
      {
        action: decision === 'approved' ? 'MEMBER_APPROVED' : 'MEMBER_REJECTED',
        module: 'Members & Approvals',
        details: `Chairman ${decision} member application ${memberId}.`,
      }
    );
  };

  const handleRegisterMember = (
    payload: Omit<
      MemberRecord,
      | 'id'
      | 'memberCode'
      | 'joinedDate'
      | 'paidMonths'
      | 'qrToken'
      | 'registeredBy'
      | 'accessStatus'
      | 'approvalStatus'
    >
  ): MemberRecord => {
    const num = state.members.length + 1;
    const code = `EAW-${String(num).padStart(3, '0')}`;
    const id = `mem-${Date.now()}`;
    const tempPwd = payload.defaultTempPassword || DEFAULT_TEMP_PASSWORD;
    const newMem: MemberRecord = {
      ...payload,
      id,
      memberCode: code,
      joinedDate: new Date().toISOString().slice(0, 10),
      qrToken: `EAW-ID:${code}:${id}`,
      paidMonths: [],
      registeredBy: currentUser?.fullNameEn || 'Zenaye Tesema (Secretary)',
      accessStatus: 'pending',
      approvalStatus: 'pending_chairman',
      mustChangePassword: true,
      defaultTempPassword: tempPwd,
    };

    hashPassword(tempPwd).then((digest) => {
      const withHash: MemberRecord = { ...newMem, passwordHash: digest };
      persistCollectionDoc('members', withHash);
      setState((prev) => {
        const next = {
          ...prev,
          members: prev.members.map((m) => (m.id === id ? withHash : m)),
        };
        saveCachedState(next);
        return next;
      });
    });

    persistCollectionDoc('members', newMem);
    commitState(
      (prev) => ({ ...prev, members: [...prev.members, newMem] }),
      {
        action: 'MEMBER_REGISTERED',
        module: 'Members & Registration',
        details: `Registered ${newMem.fullNameEn} (${code}, ${newMem.residenceCityEn}) with silent default temp password.`,
      }
    );
    return newMem;
  };

  const handleImportLegacyMembers = (
    rows: {
      fullNameAm: string;
      fullNameEn: string;
      phone: string;
      email: string;
      residenceZone: ResidenceZone;
      residenceCityAm: string;
      residenceCityEn: string;
    }[]
  ): MemberRecord[] => {
    const startNum = state.members.length + 1;
    const today = new Date().toISOString().slice(0, 10);
    const created: MemberRecord[] = rows.map((row, idx) => {
      const code = `EAW-${String(startNum + idx).padStart(3, '0')}`;
      const id = `mem-imp-${Date.now()}-${idx}`;
      const m: MemberRecord = {
        ...row,
        id,
        memberCode: code,
        role: 'member',
        joinedDate: today,
        qrToken: `EAW-ID:${code}:${id}`,
        paidMonths: [],
        familyMembers: [],
        registeredBy: currentUser?.fullNameEn || 'Zenaye Tesema (Secretary)',
        accessStatus: 'pending',
        approvalStatus: 'pending_chairman',
        mustChangePassword: true,
        defaultTempPassword: DEFAULT_TEMP_PASSWORD,
      };
      persistCollectionDoc('members', m);
      return m;
    });
    commitState(
      (prev) => ({ ...prev, members: [...prev.members, ...created] }),
      {
        action: 'LEGACY_CSV_IMPORT',
        module: 'Members & Registration',
        details: `Imported ${created.length} legacy members via CSV with silent temporary password.`,
      }
    );
    return created;
  };

  const handleManageAccess = (
    memberId: string,
    accessStatus: MemberRecord['accessStatus'],
    role?: Role,
    tempPassword?: string
  ) => {
    if (!isItSystemAdmin(currentUser) || !currentUser) return;
    const target = state.members.find((m) => m.id === memberId);
    const roleChanged = Boolean(role && target && role !== target.role);
    const auditAction = roleChanged
      ? 'USER_ROLE_CHANGED'
      : accessStatus === 'active'
      ? 'USER_ACCESS_GRANTED'
      : accessStatus === 'suspended'
      ? 'USER_ACCESS_SUSPENDED'
      : 'USER_ACCESS_UPDATED';

    const applyUpdate = (digest?: string) => {
      commitState(
        (prev) => {
          const members = prev.members.map((m) => {
            if (m.id !== memberId) return m;
            const nextRole = role ?? m.role;
            return {
              ...m,
              accessStatus,
              role: nextRole,
              locked: accessStatus === 'active' ? false : m.locked,
              isItAdmin: nextRole === 'auditor' ? true : m.isItAdmin,
              ...(digest
                ? {
                    passwordHash: digest,
                    mustChangePassword: true,
                    defaultTempPassword: tempPassword || DEFAULT_TEMP_PASSWORD,
                  }
                : {}),
            };
          });
          const updated = members.find((m) => m.id === memberId);
          if (updated) persistCollectionDoc('members', updated);
          return { ...prev, members };
        },
        {
          action: auditAction,
          module: 'IT System Admin & Access',
          details: `Admin ${currentUser.fullNameEn} (${currentUser.memberCode}) updated ${
            target?.fullNameEn || memberId
          } (${target?.memberCode || memberId}): access=${accessStatus}${
            role ? `, role=${target?.role}→${role}` : ''
          }${tempPassword ? ' (silent temp password assigned)' : ''} at ${new Date().toISOString()}.`,
        }
      );
    };

    if (tempPassword) {
      hashPassword(tempPassword).then((digest) => applyUpdate(digest));
    } else {
      applyUpdate();
    }
  };

  const handleResetPasswordAndUnlock = (
    memberId: string,
    mode: 'reset' | 'unlock',
    tempPassword?: string
  ) => {
    if (!isItSystemAdmin(currentUser) || !currentUser) return;
    const target = state.members.find((m) => m.id === memberId);
    const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const effectivePwd = tempPassword || DEFAULT_TEMP_PASSWORD;

    const applyReset = (digest?: string) => {
      commitState(
        (prev) => {
          const members = prev.members.map((m) => {
            if (m.id !== memberId) return m;
            return {
              ...m,
              locked: false,
              accessStatus:
                mode === 'unlock' && m.accessStatus === 'suspended'
                  ? 'active'
                  : m.accessStatus,
              ...(mode === 'reset'
                ? {
                    passwordHash: digest || m.passwordHash,
                    mustChangePassword: true,
                    defaultTempPassword: effectivePwd,
                    lastPasswordResetAt: nowStamp,
                    lastPasswordResetBy: `${currentUser.fullNameEn} (${currentUser.memberCode})`,
                  }
                : {}),
            };
          });
          const updated = members.find((m) => m.id === memberId);
          if (updated) persistCollectionDoc('members', updated);
          return { ...prev, members };
        },
        {
          action:
            mode === 'reset'
              ? 'SILENT_TEMP_PASSWORD_ASSIGNED'
              : 'ACCOUNT_UNLOCKED',
          module: 'IT System Admin & Security',
          details: `Admin ${currentUser.fullNameEn} (${currentUser.memberCode}) ${
            mode === 'reset'
              ? 'assigned silent temporary password & cleared lock (no email sent)'
              : 'unlocked account'
          } for ${target?.fullNameEn || memberId} (${target?.memberCode || memberId}) at ${nowStamp}.`,
        }
      );
    };

    if (mode === 'reset') {
      hashPassword(effectivePwd).then((digest) => applyReset(digest));
    } else {
      applyReset();
    }
  };

  const handleAdvanceRequest = (
    reqId: string,
    nextStatus: EdirRequest['status'],
    note?: string
  ) => {
    commitState(
      (prev) => {
        const requests = prev.requests.map((r) =>
          r.id === reqId
            ? {
                ...r,
                status: nextStatus,
                reviewedByVc:
                  nextStatus === 'vice_chairman_reviewed'
                    ? currentUser?.fullNameEn
                    : r.reviewedByVc,
                viceChairmanNote:
                  nextStatus === 'vice_chairman_reviewed'
                    ? note || r.viceChairmanNote
                    : r.viceChairmanNote,
                approvedByChairman:
                  nextStatus === 'chairman_approved'
                    ? currentUser?.fullNameEn
                    : r.approvedByChairman,
              }
            : r
        );
        const updated = requests.find((r) => r.id === reqId);
        if (updated) persistCollectionDoc('requests', updated);
        return { ...prev, requests };
      },
      {
        action: 'REQUEST_STAGE_UPDATED',
        module: 'Operations & Property',
        details: `Request ${reqId} moved to ${nextStatus}.`,
      }
    );
  };

  const handleAuthorizeDisbursement = (
    disId: string,
    decision: 'authorized_for_cashier' | 'rejected'
  ) => {
    if (currentUser?.role !== 'vice_chairman') return;
    commitState(
      (prev) => {
        const disbursements = prev.disbursements.map((d) =>
          d.id === disId
            ? {
                ...d,
                status: decision,
                authorizedBy: currentUser.fullNameEn,
                authorizedAt: new Date().toISOString().slice(0, 10),
              }
            : d
        );
        const updated = disbursements.find((d) => d.id === disId);
        if (updated) persistCollectionDoc('disbursements', updated);
        return { ...prev, disbursements };
      },
      {
        action:
          decision === 'authorized_for_cashier'
            ? 'DISBURSEMENT_AUTHORIZED'
            : 'DISBURSEMENT_REJECTED',
        module: 'Finance',
        details: `Vice Chairman ${decision} disbursement ${disId}.`,
      }
    );
  };

  const handleCreateDisbursement = (
    payload: Omit<DisbursementRequest, 'id' | 'status' | 'createdAt'>
  ) => {
    const newDis: DisbursementRequest = {
      ...payload,
      id: `dis-${Date.now()}`,
      status: 'pending_vice_chairman',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    persistCollectionDoc('disbursements', newDis);
    commitState(
      (prev) => ({ ...prev, disbursements: [newDis, ...prev.disbursements] }),
      {
        action: 'DISBURSEMENT_REQUESTED',
        module: 'Finance',
        details: `Created ${payload.benefitType} disbursement request for ${payload.memberNameEn} (${payload.amount} ETB).`,
      }
    );
  };

  const handleExecuteDisbursement = (disId: string, payoutRef: string) => {
    commitState(
      (prev) => {
        const disbursements = prev.disbursements.map((d) =>
          d.id === disId
            ? {
                ...d,
                status: 'paid' as const,
                paidBy: currentUser?.fullNameEn,
                paidAt: new Date().toISOString().slice(0, 10),
                payoutRef,
              }
            : d
        );
        const updated = disbursements.find((d) => d.id === disId);
        if (updated) persistCollectionDoc('disbursements', updated);
        return { ...prev, disbursements };
      },
      {
        action: 'DISBURSEMENT_PAID',
        module: 'Finance',
        details: `Cashier executed disbursement ${disId} (Ref: ${payoutRef}).`,
      }
    );
  };

  const handleVerifyReceipt = (
    receiptId: string,
    decision: 'verified' | 'rejected',
    note?: string
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const isVc = currentUser?.role === 'vice_chairman';
    commitState(
      (prev) => {
        const target = prev.paymentReceipts.find((r) => r.id === receiptId);
        const paymentReceipts = prev.paymentReceipts.map((r) =>
          r.id === receiptId
            ? {
                ...r,
                status: decision,
                reviewerNote: note,
                reviewedBy: currentUser?.fullNameEn,
                reviewedAt: today,
                ...(isVc
                  ? {
                      authorizedByVc: currentUser?.fullNameEn,
                      authorizedAtVc: today,
                    }
                  : {}),
              }
            : r
        );
        const updatedRec = paymentReceipts.find((r) => r.id === receiptId);
        if (updatedRec) persistCollectionDoc('paymentReceipts', updatedRec);

        let members = prev.members;
        let specialContributions = prev.specialContributions;

        if (decision === 'verified' && target) {
          if (target.targetMonths && target.targetMonths.length > 0) {
            members = prev.members.map((m) => {
              if (m.id !== target.memberId) return m;
              const merged = Array.from(
                new Set([...m.paidMonths, ...target.targetMonths!])
              );
              const updatedMem = { ...m, paidMonths: merged };
              persistCollectionDoc('members', updatedMem);
              return updatedMem;
            });
          }
          if (target.specialContributionId) {
            specialContributions = prev.specialContributions.map((sc) => {
              if (sc.id !== target.specialContributionId) return sc;
              const updatedSc = {
                ...sc,
                paidMemberIds: Array.from(
                  new Set([...sc.paidMemberIds, target.memberId])
                ),
              };
              persistCollectionDoc('specialContributions', updatedSc);
              return updatedSc;
            });
          }
        }
        return { ...prev, paymentReceipts, members, specialContributions };
      },
      {
        action:
          decision === 'verified'
            ? isVc
              ? 'RECEIPT_AUTHORIZED_BY_VC'
              : 'RECEIPT_VERIFIED'
            : 'RECEIPT_REJECTED',
        module: 'Finance',
        details: `${
          isVc ? 'Vice Chairman' : 'Cashier'
        } ${decision} receipt ${receiptId}.`,
      }
    );
  };

  const handleCreateSpecialContribution = (
    payload: Omit<SpecialContribution, 'id' | 'createdAt' | 'paidMemberIds'>
  ) => {
    const newSc: SpecialContribution = {
      ...payload,
      id: `spec-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      paidMemberIds: [],
    };
    persistCollectionDoc('specialContributions', newSc);
    commitState(
      (prev) => ({
        ...prev,
        specialContributions: [newSc, ...prev.specialContributions],
      }),
      {
        action: 'SPECIAL_CONTRIBUTION_CREATED',
        module: 'Finance',
        details: `Published ${payload.category} contribution: ${payload.titleEn} (${payload.amount} ETB).`,
      }
    );
  };

  const handleSaveReconciliation = (
    payload: Omit<BankReconciliation, 'id' | 'createdAt'>
  ) => {
    const newRecon: BankReconciliation = {
      ...payload,
      id: `recon-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    persistCollectionDoc('reconciliations', newRecon);
    commitState(
      (prev) => ({
        ...prev,
        reconciliations: [newRecon, ...prev.reconciliations],
      }),
      {
        action: 'BANK_RECONCILIATION_LOGGED',
        module: 'Finance',
        details: `Bank=${payload.bankStatementBalance} ETB vs System=${payload.systemCalculatedBalance} ETB (Variance: ${payload.variance} ETB).`,
      }
    );
  };

  const handleAssetAction = (
    assetId: string,
    action: 'issued' | 'returned',
    payload: {
      memberId: string;
      quantity: number;
      expectedReturnDate?: string;
      condition?: 'good' | 'damaged';
      notes: string;
      requestId?: string;
    }
  ) => {
    const asset = state.assets.find((a) => a.id === assetId);
    const member = state.members.find((m) => m.id === payload.memberId);
    if (!asset || !member) return;

    const newLog: AssetMovementLog = {
      id: `alog-${Date.now()}`,
      assetId,
      assetNameAm: asset.nameAm,
      assetNameEn: asset.nameEn,
      requestId: payload.requestId,
      memberId: member.id,
      memberNameAm: member.fullNameAm,
      memberNameEn: member.fullNameEn,
      quantity: payload.quantity,
      action,
      date: new Date().toISOString().slice(0, 10),
      expectedReturnDate: payload.expectedReturnDate,
      condition: payload.condition,
      notes: payload.notes,
      recordedBy: currentUser?.fullNameEn || 'Committee',
    };
    persistCollectionDoc('assetLogs', newLog);

    commitState(
      (prev) => {
        const assets = prev.assets.map((a) => {
          if (a.id !== assetId) return a;
          const nextAvail =
            action === 'issued'
              ? Math.max(0, a.availableQuantity - payload.quantity)
              : Math.min(a.totalQuantity, a.availableQuantity + payload.quantity);
          const updatedAsset = { ...a, availableQuantity: nextAvail };
          persistCollectionDoc('assets', updatedAsset);
          return updatedAsset;
        });

        let requests = prev.requests;
        if (payload.requestId) {
          requests = prev.requests.map((r) => {
            if (r.id !== payload.requestId) return r;
            const updatedReq = {
              ...r,
              status:
                action === 'issued'
                  ? ('issued' as const)
                  : ('returned' as const),
            };
            persistCollectionDoc('requests', updatedReq);
            return updatedReq;
          });
        }

        return {
          ...prev,
          assets,
          requests,
          assetLogs: [newLog, ...prev.assetLogs],
        };
      },
      {
        action: action === 'issued' ? 'ASSET_ISSUED' : 'ASSET_RETURNED',
        module: 'Operations & Property',
        details: `${action.toUpperCase()} ${payload.quantity} × ${asset.nameEn} (${member.fullNameEn}).`,
      }
    );
  };

  const handleAddAsset = (payload: Omit<EdirAsset, 'id'>) => {
    const newAsset: EdirAsset = {
      ...payload,
      id: `ast-${Date.now()}`,
    };
    persistCollectionDoc('assets', newAsset);
    commitState(
      (prev) => ({ ...prev, assets: [...prev.assets, newAsset] }),
      {
        action: 'ASSET_ADDED',
        module: 'Operations & Property',
        details: `Added ${payload.totalQuantity} × ${payload.nameEn}.`,
      }
    );
  };

  const handleCreateMeeting = (
    payload: Omit<MeetingSession, 'id' | 'qrCodeValue' | 'createdAt' | 'status'>
  ) => {
    if (!currentUser || currentUser.role !== 'chairman') return;
    const id = `mtg-${Date.now()}`;
    const newMtg: MeetingSession = {
      ...payload,
      id,
      status: 'active',
      qrCodeValue: `EAW-MEETING:${id}:${payload.date}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    persistCollectionDoc('meetings', newMtg);
    broadcastLiveAlert('meeting', newMtg as unknown as Record<string, unknown>);
    commitState(
      (prev) => ({
        ...prev,
        meetings: [
          newMtg,
          ...prev.meetings.map((m) => ({ ...m, status: 'closed' as const })),
        ],
      }),
      {
        action: 'MEETING_INITIATED',
        module: 'Operations & Meetings',
        details: `Initiated meeting "${payload.titleEn}" on ${payload.date}.`,
      }
    );
  };

  const handleCloseMeeting = (meetingId: string) => {
    if (!currentUser || currentUser.role !== 'chairman') return;
    commitState(
      (prev) => {
        const meetings = prev.meetings.map((m) =>
          m.id === meetingId ? { ...m, status: 'closed' as const } : m
        );
        const updated = meetings.find((m) => m.id === meetingId);
        if (updated) persistCollectionDoc('meetings', updated);
        return { ...prev, meetings };
      },
      {
        action: 'MEETING_CLOSED',
        module: 'Operations & Meetings',
        details: `Closed meeting ${meetingId}.`,
      }
    );
  };

  const handleMarkAttendance = (
    meetingId: string,
    memberId: string,
    status: 'present' | 'absent'
  ) => {
    const m = state.members.find((x) => x.id === memberId);
    if (!m || m.residenceZone === 'outside') return;
    const attId = `att-${meetingId}-${memberId}`;
    const rec: AttendanceRecord = {
      id: attId,
      meetingId,
      memberId: m.id,
      memberCode: m.memberCode,
      memberNameAm: m.fullNameAm,
      memberNameEn: m.fullNameEn,
      residenceZone: m.residenceZone,
      status,
      method: 'manual',
      checkedInAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      checkedInBy: currentUser?.fullNameEn,
    };
    persistCollectionDoc('attendance', rec);
    commitState(
      (prev) => ({
        ...prev,
        attendance: [rec, ...prev.attendance.filter((a) => a.id !== attId)],
      }),
      {
        action: 'ATTENDANCE_MARKED',
        module: 'Operations & Meetings',
        details: `Marked ${m.fullNameEn} as ${status} for meeting ${meetingId}.`,
      }
    );
  };

  const handlePublishAnnouncement = (
    payload: Omit<Announcement, 'id' | 'createdAt'>
  ) => {
    if (!currentUser) return;
    if (payload.category === 'meeting' && currentUser.role !== 'chairman') return;
    const newAnn: Announcement = {
      ...payload,
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    persistCollectionDoc('announcements', newAnn);
    commitState(
      (prev) => ({ ...prev, announcements: [newAnn, ...prev.announcements] }),
      {
        action: 'ANNOUNCEMENT_PUBLISHED',
        module: 'Info & Communications',
        details: `Published ${payload.priority} ${payload.category} announcement: ${payload.titleEn}.`,
      }
    );
  };

  const handleUploadDocument = (
    payload: Omit<DocumentArchiveItem, 'id' | 'uploadedAt'>
  ) => {
    const newDoc: DocumentArchiveItem = {
      ...payload,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    persistCollectionDoc('documents', newDoc);
    commitState(
      (prev) => ({ ...prev, documents: [newDoc, ...prev.documents] }),
      {
        action: 'DOCUMENT_UPLOADED',
        module: 'Info & Archive',
        details: `Uploaded ${payload.docType} document: ${payload.titleEn}.`,
      }
    );
  };

  const handleResolveEmergency = (
    emgId: string,
    status: 'acknowledged' | 'resolved'
  ) => {
    commitState(
      (prev) => {
        const emergencies = prev.emergencies.map((e) =>
          e.id === emgId ? { ...e, status } : e
        );
        const updated = emergencies.find((e) => e.id === emgId);
        if (updated) persistCollectionDoc('emergencies', updated);
        return { ...prev, emergencies };
      },
      {
        action: 'EMERGENCY_UPDATED',
        module: 'Emergency Queue',
        details: `Updated emergency alert ${emgId} to ${status}.`,
      }
    );
  };

  const handleSyncFirebase = async () => {
    const res = await syncFullStateToFirestore(state);
    if (res.ok) {
      setFirebaseStatus({ connected: true });
    } else {
      setFirebaseStatus({ connected: false, note: res.error });
    }
    return res;
  };

  const handleUpdateBillingConfig = (config: BillingConfig) => {
    if (!isItSystemAdmin(currentUser) || !currentUser) return;
    persistBillingConfig(config);
    commitState(
      (prev) => ({ ...prev, billingConfig: config }),
      {
        action: 'SYSTEM_BILLING_CONFIG_UPDATED',
        module: 'IT System Settings',
        details: `Admin ${currentUser.fullNameEn} (${currentUser.memberCode}) updated monthlyFee=${config.monthlyFee} ETB, latePenalty=${config.latePenaltyFee} ETB.`,
      }
    );
  };

  const handleUpdateBenefitRule = (rule: BenefitRule) => {
    if (!isItSystemAdmin(currentUser) || !currentUser) return;
    persistCollectionDoc('benefitRules', rule);
    commitState(
      (prev) => ({
        ...prev,
        benefitRules: prev.benefitRules.map((b) =>
          b.id === rule.id ? rule : b
        ),
      }),
      {
        action: 'BENEFIT_PAYOUT_RULE_UPDATED',
        module: 'IT System Settings',
        details: `Admin ${currentUser.fullNameEn} (${currentUser.memberCode}) updated benefit payout "${rule.categoryEn}" to ${rule.amount} ETB.`,
      }
    );
  };

  // ============================================================================
  // RENDER LOGIN IF NOT SIGNED IN
  // ============================================================================
  if (!currentUser) {
    return (
      <LoginView
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'am' ? 'en' : 'am'))}
        members={state.members}
        onLoginSuccess={handleLoginSuccess}
        onGoogleSignIn={handleGoogleSignIn}
      />
    );
  }

  const isCommitteeUser = currentUser.role !== 'member';

  const getRoleModuleTitle = () => {
    if (currentUser.role === 'member' || showPersonalPortal) {
      return COPY[lang].navMemberPortal;
    }
    switch (currentUser.role) {
      case 'chairman':
        return getText(lang, 'የዋና ሰብሳቢ ክፍል', 'Chairman Module');
      case 'vice_chairman':
        return getText(lang, 'የምክትል ሰብሳቢ ክፍል', 'Vice Chairman Module');
      case 'secretary':
        return getText(lang, 'የጸሐፊ ክፍል', 'Secretary Module');
      case 'cashier':
        return getText(lang, 'የገንዘብ ያዥ ክፍል', 'Cashier Module');
      case 'auditor':
        return getText(
          lang,
          'የኦዲተር እና የሲስተም አስተዳደር',
          'Auditor & IT Admin Module'
        );
      case 'pr':
        return getText(lang, 'የህዝብ ግንኙነት ክፍል', 'Public Relations Module');
      case 'committee':
        return getText(lang, 'የኮሚቴ አባል ክፍል', 'Committee Operations Module');
      default:
        return getText(lang, ORG_NAME.shortAm, ORG_NAME.shortEn);
    }
  };

  const renderRoleWorkspace = () => {
    if (currentUser.role === 'member' || showPersonalPortal) {
      return (
        <MemberSelfServicePortal
          lang={lang}
          currentUser={currentUser}
          state={state}
          onSubmitReceipt={handleSubmitReceipt}
          onSubmitEmergency={handleSubmitEmergency}
          onSubmitRequest={handleSubmitRequest}
          onUpdateFamily={handleUpdateFamily}
          onUpdatePhoto={handleUpdatePhoto}
          onScanAttendance={handleScanAttendance}
        />
      );
    }

    switch (currentUser.role) {
      case 'chairman':
        return (
          <ChairmanModule
            lang={lang}
            currentUser={currentUser}
            state={state}
            onIssueDirective={handleIssueDirective}
            onCreateMeeting={handleCreateMeeting}
            onCloseMeeting={handleCloseMeeting}
            onApproveMember={handleApproveMember}
            onAdvanceRequest={handleAdvanceRequest}
            onResolveEmergency={handleResolveEmergency}
          />
        );
      case 'vice_chairman':
        return (
          <ViceChairmanModule
            lang={lang}
            currentUser={currentUser}
            state={state}
            onCreateDisbursement={handleCreateDisbursement}
            onAuthorizeDisbursement={handleAuthorizeDisbursement}
            onVerifyMemberReceipt={handleVerifyReceipt}
            onAdvanceRequest={handleAdvanceRequest}
          />
        );
      case 'secretary':
        return (
          <SecretaryModule
            lang={lang}
            currentUser={currentUser}
            state={state}
            onRegisterMember={handleRegisterMember}
            onImportLegacyMembers={handleImportLegacyMembers}
            onUpdatePhoto={handleUpdatePhoto}
            onMarkAttendance={handleMarkAttendance}
            onScanAttendance={handleScanAttendance}
            onUploadDocument={handleUploadDocument}
          />
        );
      case 'cashier':
        return (
          <CashierModule
            lang={lang}
            currentUser={currentUser}
            state={state}
            onVerifyReceipt={handleVerifyReceipt}
            onCreateSpecialContribution={handleCreateSpecialContribution}
            onExecuteDisbursement={handleExecuteDisbursement}
            onSaveReconciliation={handleSaveReconciliation}
          />
        );
      case 'auditor':
        return (
          <AuditorAdminModule
            lang={lang}
            currentUser={currentUser}
            state={state}
            firebaseStatus={firebaseStatus}
            onManageAccess={handleManageAccess}
            onResetPasswordAndUnlock={handleResetPasswordAndUnlock}
            onUpdateBillingConfig={handleUpdateBillingConfig}
            onUpdateBenefitRule={handleUpdateBenefitRule}
            onSyncFirebase={handleSyncFirebase}
          />
        );
      case 'pr':
        return (
          <PrModule
            lang={lang}
            currentUser={currentUser}
            state={state}
            onPublishAnnouncement={handlePublishAnnouncement}
            onUploadDocument={handleUploadDocument}
          />
        );
      case 'committee':
        return (
          <CommitteeOpsModule
            lang={lang}
            state={state}
            onAssetAction={handleAssetAction}
            onAddAsset={handleAddAsset}
            onResolveEmergency={handleResolveEmergency}
          />
        );
      default:
        return (
          <MemberSelfServicePortal
            lang={lang}
            currentUser={currentUser}
            state={state}
            onSubmitReceipt={handleSubmitReceipt}
            onSubmitEmergency={handleSubmitEmergency}
            onSubmitRequest={handleSubmitRequest}
            onUpdateFamily={handleUpdateFamily}
            onUpdatePhoto={handleUpdatePhoto}
            onScanAttendance={handleScanAttendance}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Clean Single-Header Brand Navigation (Zero Cross-Role Sidebar Clutter) */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/assets/aistudio/logo_27d4fad1.png"
            alt="Edir Logo"
            className="w-10 h-10 rounded-full object-cover border border-[#D97706] bg-white shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[#064E3B] truncate">
              {getRoleModuleTitle()}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              {getText(lang, currentUser.fullNameAm, currentUser.fullNameEn)} ·{' '}
              {ROLE_LABELS[currentUser.role][lang]} · {currentUser.memberCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton lang={lang} variant="header" />
          <button
            type="button"
            onClick={() => {
              setForcePasswordChange(false);
              setShowChangePassword(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#064E3B] bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#D97706]/30 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#D97706]" />
            <span className="hidden sm:inline">{COPY[lang].changePassword}</span>
          </button>
          <button
            type="button"
            onClick={() => setLang((l) => (l === 'am' ? 'en' : 'am'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#064E3B] hover:bg-[#047857] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{COPY[lang].languageToggle}</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{COPY[lang].signOut}</span>
          </button>
        </div>
      </header>

      {/* Main Single-Owner Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Committee Officers are also Edir Members: Clear Role vs Member Self-Service Module Switcher */}
        {isCommitteeUser && (
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 no-print">
            <button
              type="button"
              onClick={() => setShowPersonalPortal(false)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                !showPersonalPortal
                  ? 'bg-[#064E3B] text-white'
                  : 'bg-white text-[#064E3B] border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid
                className={`w-4 h-4 ${
                  !showPersonalPortal ? 'text-[#F59E0B]' : 'text-[#047857]'
                }`}
              />
              <span>
                {getText(
                  lang,
                  `የኮሚቴ ስራዬ (${ROLE_LABELS[currentUser.role].am})`,
                  `Committee Module (${ROLE_LABELS[currentUser.role].en})`
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowPersonalPortal(true)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                showPersonalPortal
                  ? 'bg-[#064E3B] text-white'
                  : 'bg-white text-[#064E3B] border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <IdCard
                className={`w-4 h-4 ${
                  showPersonalPortal ? 'text-[#F59E0B]' : 'text-[#D97706]'
                }`}
              />
              <span>
                {getText(
                  lang,
                  'የአባላት መገልገያ (የእኔ ክፍያ፣ ደረሰኝ እና መታወቂያ)',
                  'Member Self-Service Portal (My Dues, Receipt & ID)'
                )}
              </span>
            </button>
          </div>
        )}

        {renderRoleWorkspace()}
      </main>

      {/* In-App Change Password Modal (Mandatory on First Default-Password Sign-in, Voluntary Anytime) */}
      {showChangePassword && (
        <ChangePasswordModal
          lang={lang}
          currentUser={currentUser}
          forced={forcePasswordChange}
          onClose={() => {
            if (!forcePasswordChange) {
              setShowChangePassword(false);
            }
          }}
          onPasswordUpdated={handleUpdatePassword}
        />
      )}
      <OfflineIndicator lang={lang} />
    </div>
  );
}
