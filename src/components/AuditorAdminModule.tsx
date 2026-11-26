import React, { useState } from 'react';
import {
  ClipboardCheck,
  Eye,
  EyeOff,
  FileBarChart2,
  Search,
  UserCog,
} from 'lucide-react';
import {
  BenefitRule,
  BillingConfig,
  EdirState,
  Language,
  MemberRecord,
  Role,
} from '../types';
import { COPY, ROLE_LABELS, formatETB, getText } from '../i18n';
import { computeMemberFinancials, computeTreasurySummary } from '../utils/billing';
import { ReportGeneratorView } from './ReportGeneratorView';
import { SystemAdminView } from './SystemAdminView';

type AuditorAdminTab = 'audit_reports' | 'access_passwords';

interface AuditorAdminModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  firebaseStatus: { connected: boolean; note?: string };
  onManageAccess: (
    memberId: string,
    accessStatus: MemberRecord['accessStatus'],
    role?: Role,
    tempPassword?: string
  ) => void;
  onResetPasswordAndUnlock: (
    memberId: string,
    mode: 'reset' | 'unlock',
    tempPassword?: string
  ) => void;
  onUpdateBillingConfig: (config: BillingConfig) => void;
  onUpdateBenefitRule: (rule: BenefitRule) => void;
  onSyncFirebase: () => Promise<{ ok: boolean; error?: string }>;
}

export const AuditorAdminModule: React.FC<AuditorAdminModuleProps> = ({
  lang,
  currentUser,
  state,
  firebaseStatus,
  onManageAccess,
  onResetPasswordAndUnlock,
  onUpdateBillingConfig,
  onUpdateBenefitRule,
  onSyncFirebase,
}) => {
  const [tab, setTab] = useState<AuditorAdminTab>('audit_reports');
  const [showReportsPanel, setShowReportsPanel] = useState(false);
  const [showAuditList, setShowAuditList] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  const treasury = computeTreasurySummary(state);
  const reconVariances = state.reconciliations.filter((r) => r.variance !== 0);
  const overdueMembersCount = state.members.filter(
    (m) => computeMemberFinancials(m, state).overdueMonths.length > 0
  ).length;

  const filteredAuditLogs = state.auditLogs.filter((log) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  const buttons: {
    id: AuditorAdminTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'audit_reports',
      label: getText(
        lang,
        'የኦዲት እና ሪፖርት ማዕከል',
        'Audit Review & Dynamic Reports (LOV + PDF/CSV)'
      ),
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    {
      id: 'access_passwords',
      label: getText(
        lang,
        'የተጠቃሚ መብት እና ፓስወርድ',
        'User Access Grant, Role & Password Reset (No Emails)'
      ),
      icon: <UserCog className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 2 Exclusive Auditor + IT Admin Top Action Buttons */}
      <nav
        aria-label="Auditor and IT Admin Actions"
        className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 no-print"
      >
        {buttons.map((btn) => {
          const active = tab === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setTab(btn.id)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                active
                  ? 'bg-[#064E3B] text-white'
                  : 'bg-white text-[#064E3B] border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={active ? 'text-[#F59E0B]' : 'text-[#047857]'}>
                {btn.icon}
              </span>
              <span className="truncate">{btn.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 1. AUDIT REVIEW & DYNAMIC REPORTS */}
      {tab === 'audit_reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የስርዓቱ የተጣራ ካዝና ሂሳብ', 'System Net Treasury Balance')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#064E3B]">
                {formatETB(treasury.systemCalculatedCashBalance, lang)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የባንክ ልዩነቶች', 'Bank Discrepancies Flagged')}
              </p>
              <p
                className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${
                  reconVariances.length > 0 ? 'text-red-700' : 'text-[#047857]'
                }`}
              >
                {reconVariances.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ውዝፍ ያለባቸው አባላት', 'Overdue Member Accounts')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#D97706]">
                {overdueMembersCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የኦዲት መዛግብት ብዛት', 'Immutable Audit Events')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {state.auditLogs.length}
              </p>
            </div>
          </div>

          {/* Dynamic Report Generator (On Demand) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <FileBarChart2 className="w-5 h-5 text-[#064E3B]" />
                <h2 className="text-base font-bold text-[#064E3B]">
                  {getText(
                    lang,
                    'ተለዋዋጭ የሪፖርት ማመንጫ (PDF / CSV)',
                    'Dynamic Report Generator (LOV + PDF/CSV)'
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReportsPanel((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {showReportsPanel ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showReportsPanel
                    ? getText(lang, 'ሪፖርት ደብቅ', 'Hide Report Generator')
                    : getText(lang, 'ሪፖርት ምረጥ እና አውጣ', 'Open Report Selector')}
                </span>
              </button>
            </div>

            {showReportsPanel && <ReportGeneratorView lang={lang} state={state} />}
          </section>

          {/* Immutable Audit Trail (No Unsolicited List!) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder={getText(
                    lang,
                    'በኦዲት መዝገብ ውስጥ ይፈልጉ...',
                    'Search audit trail by actor or action...'
                  )}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAuditList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showAuditList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showAuditList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide Audit Log')
                    : getText(lang, 'የኦዲት ዝርዝር አሳይ', 'View Audit Log')}
                </span>
              </button>
            </div>

            {(showAuditList || auditSearch.trim().length > 0) && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                      <th className="py-2.5 px-3">{getText(lang, 'ሰዓት / ቀን', 'Timestamp')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ፈጻሚ', 'Actor')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ድርሻ', 'Role')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ድርጊት', 'Action')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ዝርዝር', 'Details')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500">
                          {COPY[lang].noRecords}
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {log.actorName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {ROLE_LABELS[log.actorRole][lang]}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-[#064E3B]">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. USER ACCESS GRANT, ROLE & PASSWORD RESET (NO EMAILS) */}
      {tab === 'access_passwords' && (
        <SystemAdminView
          lang={lang}
          currentUser={currentUser}
          state={state}
          firebaseStatus={firebaseStatus}
          onManageAccess={onManageAccess}
          onResetPasswordAndUnlock={onResetPasswordAndUnlock}
          onUpdateBillingConfig={onUpdateBillingConfig}
          onUpdateBenefitRule={onUpdateBenefitRule}
          onSyncFirebase={onSyncFirebase}
        />
      )}
    </div>
  );
};
