import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  FileBarChart2,
  Package,
  Users,
} from 'lucide-react';
import {
  CommitteeDirective,
  EdirState,
  Language,
  MemberRecord,
  Role,
} from '../types';
import { COPY, ROLE_LABELS, formatETB, getText } from '../i18n';
import { computeTreasurySummary } from '../utils/billing';

export type ConsolidatedRoute =
  | 'overview'
  | 'finance'
  | 'members'
  | 'operations'
  | 'info_reports'
  | 'member_portal';

interface ExecutiveOverviewProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  firebaseStatus: { connected: boolean; note?: string };
  onSyncFirebase: () => Promise<{ ok: boolean; error?: string }>;
  onIssueDirective: (
    d: Omit<CommitteeDirective, 'id' | 'issuedAt' | 'status'>
  ) => void;
  onResolveEmergency: (
    emgId: string,
    status: 'acknowledged' | 'resolved'
  ) => void;
  onNavigateModule: (route: ConsolidatedRoute) => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  lang,
  currentUser,
  state,
  firebaseStatus,
  onSyncFirebase,
  onIssueDirective,
  onResolveEmergency,
  onNavigateModule,
}) => {
  const [dirTitleAm, setDirTitleAm] = useState('');
  const [dirTitleEn, setDirTitleEn] = useState('');
  const [dirBodyAm, setDirBodyAm] = useState('');
  const [dirTarget, setDirTarget] = useState<Role | 'all_committee'>(
    'all_committee'
  );
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const treasury = computeTreasurySummary(state);
  const pendingMembers = state.members.filter(
    (m) => m.approvalStatus === 'pending_chairman'
  );
  const activeEmergencies = state.emergencies.filter(
    (e) => e.status !== 'resolved'
  );
  const pendingReceiptsCount = state.paymentReceipts.filter(
    (r) => r.status === 'pending'
  ).length;
  const pendingPropertyCount = state.requests.filter(
    (r) => r.status === 'submitted' || r.status === 'vice_chairman_reviewed'
  ).length;

  const isChairman = currentUser.role === 'chairman';

  const moduleShortcuts: {
    id: ConsolidatedRoute;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    metric: string;
  }[] = [
    {
      id: 'finance',
      title: COPY[lang].navFinanceModule,
      subtitle: getText(
        lang,
        'ወርሃዊ ክፍያ፣ ቅጣት፣ ደረሰኝ እና ባንክ ማስታረቂያ',
        'Dues, Penalties, Receipts, Disbursements & Bank Recon'
      ),
      icon: <Banknote className="w-5 h-5 text-[#064E3B]" />,
      metric: `${pendingReceiptsCount} ${getText(lang, 'ደረሰኞች', 'pending receipts')}`,
    },
    {
      id: 'members',
      title: COPY[lang].navMembersModule,
      subtitle: getText(
        lang,
        'የአባላት መዝገብ፣ ምዝገባ፣ ማጽደቂያ እና የIT አስተዳደር',
        'Registry, Registration, Approvals, Digital IDs & IT Admin'
      ),
      icon: <Users className="w-5 h-5 text-[#064E3B]" />,
      metric: `${pendingMembers.length} ${getText(lang, 'ማመልከቻዎች', 'pending approvals')}`,
    },
    {
      id: 'operations',
      title: COPY[lang].navOperationsModule,
      subtitle: getText(
        lang,
        'ስብሰባ፣ QR ስካነር እና የድንኳን/ወንበር ንብረት',
        'Meetings, QR Scanner & Tent/Chair Property Control'
      ),
      icon: <Package className="w-5 h-5 text-[#064E3B]" />,
      metric: `${pendingPropertyCount} ${getText(lang, 'የንብረት ጥያቄዎች', 'property requests')}`,
    },
    {
      id: 'info_reports',
      title: COPY[lang].navInfoReportsModule,
      subtitle: getText(
        lang,
        'ማስታወቂያ፣ መዛግብት፣ ሪፖርት ማመንጫ እና ኦዲት',
        'Announcements, Bylaws Archive, Reports & Audit Trail'
      ),
      icon: <FileBarChart2 className="w-5 h-5 text-[#064E3B]" />,
      metric: `${state.documents.length} ${getText(lang, 'ሰነዶች', 'archived files')}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {getText(lang, 'ንቁ አባላት / አዲስ ማመልከቻ', 'Active / Pending Members')}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#064E3B] font-mono tabular-nums">
            {state.members.filter((m) => m.approvalStatus === 'approved').length}{' '}
            <span className="text-sm font-semibold text-[#D97706]">
              (+{pendingMembers.length})
            </span>
          </p>
        </div>
        <div className="bg-[#064E3B] text-white rounded-xl p-5">
          <p className="text-xs font-medium text-[#F59E0B]">
            {getText(lang, 'የስርዓቱ የተጣራ ካዝና', 'System Net Cash Balance')}
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums">
            {formatETB(treasury.systemCalculatedCashBalance, lang)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {getText(lang, 'ያልተሰበሰበ ውዝፍ እና ቅጣት', 'Outstanding Arrears')}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#D97706] font-mono tabular-nums">
            {formatETB(treasury.totalOutstandingReceivables, lang)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {getText(lang, 'አስቸኳይ የሀዘን/ድጋፍ ጥሪዎች', 'Active Emergency Alerts')}
          </p>
          <p className="mt-2 text-2xl font-bold text-red-700 font-mono tabular-nums">
            {activeEmergencies.length}
          </p>
        </div>
      </div>

      {/* 4 Consolidated Module Jump Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {moduleShortcuts.map((mod) => (
          <button
            key={mod.id}
            type="button"
            onClick={() => onNavigateModule(mod.id)}
            className="text-left bg-white border border-slate-200 hover:border-[#064E3B] rounded-xl p-5 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#064E3B]/10 flex items-center justify-center shrink-0">
                {mod.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-[#064E3B] truncate">
                  {mod.title}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                  {mod.subtitle}
                </p>
                <p className="text-[11px] font-mono font-semibold text-[#D97706] mt-1">
                  {mod.metric}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#064E3B] shrink-0" />
          </button>
        ))}
      </div>

      {/* Firebase Cloud Sync Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#064E3B]">
            {getText(lang, 'የFirebase ዳታቤዝ ግንኙነት (aleta-pt)', 'Firebase Cloud Connection (aleta-pt)')}
            <span className="mx-2 text-slate-300">·</span>
            <span
              className={
                firebaseStatus.connected ? 'text-[#047857]' : 'text-[#D97706]'
              }
            >
              {firebaseStatus.connected
                ? getText(lang, 'ተገናኝቷል (Live Sync)', 'Connected (Live Sync)')
                : getText(lang, 'Cached / Pending Rules', 'Cached / Pending Rules')}
            </span>
          </p>
          {(syncMsg || firebaseStatus.note) && (
            <p className="text-[11px] text-slate-500">
              {syncMsg || firebaseStatus.note}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            setSyncMsg('');
            const res = await onSyncFirebase();
            setSyncMsg(
              res.ok
                ? getText(
                    lang,
                    'ሁሉም መረጃዎች ወደ Firebase (aleta-pt) በተሳካ ሁኔታ ተመሳስለዋል።',
                    'All collections synced to Firebase (aleta-pt).'
                  )
                : res.error || 'Sync failed'
            );
            setSyncing(false);
          }}
          className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0 disabled:opacity-50"
        >
          {syncing
            ? getText(lang, 'በማመሳሰል ላይ...', 'Syncing...')
            : getText(lang, 'Firebase አመሳስል', 'Sync Firebase')}
        </button>
      </section>

      {/* Active Bereavement / Emergency Queue */}
      {activeEmergencies.length > 0 && (
        <section className="bg-white border border-red-200 rounded-xl p-6 space-y-3">
          <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-700" />
            <span>
              {getText(
                lang,
                'አስቸኳይ የሀዘን እና የድጋፍ ማሳወቂያዎች',
                'Active Bereavement & Emergency Alerts'
              )}
            </span>
          </h3>
          <div className="divide-y divide-red-100">
            {activeEmergencies.map((em) => (
              <div
                key={em.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {getText(lang, em.memberNameAm, em.memberNameEn)} ({em.memberCode}) ·{' '}
                    <span className="text-red-700">{em.relationAffected}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {em.location} · {em.phone} — {em.message}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {em.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onResolveEmergency(em.id, 'acknowledged')}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#D97706] hover:bg-[#F59E0B] text-white rounded-lg cursor-pointer"
                    >
                      {getText(lang, 'ተቀብያለሁ', 'Acknowledge')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onResolveEmergency(em.id, 'resolved')}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#064E3B] hover:bg-[#047857] text-white rounded-lg cursor-pointer"
                  >
                    {getText(lang, 'ተፈጽሟል', 'Mark Resolved')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chairman Directives */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-[#064E3B]">
            {getText(
              lang,
              'የዋና ሰብሳቢ ትእዛዞች እና መመሪያዎች',
              'Chairman Directives & Committee Orders'
            )}
          </h3>
        </div>

        {isChairman && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!dirTitleAm.trim() && !dirTitleEn.trim()) return;
              onIssueDirective({
                titleAm: dirTitleAm.trim() || dirTitleEn.trim(),
                titleEn: dirTitleEn.trim() || dirTitleAm.trim(),
                instructionAm: dirBodyAm.trim(),
                instructionEn: dirBodyAm.trim(),
                targetRole: dirTarget,
                issuedBy: `${currentUser.fullNameEn} (Chairman)`,
              });
              setDirTitleAm('');
              setDirTitleEn('');
              setDirBodyAm('');
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <input
              type="text"
              placeholder={getText(lang, 'የትእዛዝ ርዕስ (አማርኛ)', 'Directive Title (Amharic)')}
              value={dirTitleAm}
              onChange={(e) => setDirTitleAm(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            />
            <input
              type="text"
              placeholder={getText(lang, 'የትእዛዝ ርዕስ (English)', 'Directive Title (English)')}
              value={dirTitleEn}
              onChange={(e) => setDirTitleEn(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            />
            <select
              value={dirTarget}
              onChange={(e) =>
                setDirTarget(e.target.value as Role | 'all_committee')
              }
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all_committee">
                {getText(lang, 'ለሁሉም የኮሚቴ አባላት', 'All Executive Committee')}
              </option>
              <option value="vice_chairman">{ROLE_LABELS.vice_chairman[lang]}</option>
              <option value="secretary">{ROLE_LABELS.secretary[lang]}</option>
              <option value="cashier">{ROLE_LABELS.cashier[lang]}</option>
              <option value="pr">{ROLE_LABELS.pr[lang]}</option>
            </select>
            <textarea
              rows={2}
              required
              placeholder={getText(lang, 'ዝርዝር መመሪያ / ትእዛዝ...', 'Official instruction details...')}
              value={dirBodyAm}
              onChange={(e) => setDirBodyAm(e.target.value)}
              className="sm:col-span-2 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              {getText(lang, 'ትእዛዝ አስቀምጥ', 'Issue Directive')}
            </button>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {state.directives.map((d) => (
            <div key={d.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-[#047857]">{d.issuedBy}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{d.issuedAt}</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {getText(lang, d.titleAm, d.titleEn)}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {getText(lang, d.instructionAm, d.instructionEn)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
