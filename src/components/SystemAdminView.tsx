import React, { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Download,
  KeyRound,
  LockOpen,
  Settings,
  ShieldCheck,
  Sliders,
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
import { DEFAULT_TEMP_PASSWORD } from '../utils/password';

interface SystemAdminViewProps {
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

export const SystemAdminView: React.FC<SystemAdminViewProps> = ({
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
  const [search, setSearch] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [tempPasswordInput, setTempPasswordInput] = useState(DEFAULT_TEMP_PASSWORD);
  const [issuedCredentials, setIssuedCredentials] = useState<{
    memberName: string;
    memberCode: string;
    loginId: string;
    phone: string;
    tempPassword: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Technical billing settings state
  const [monthlyFee, setMonthlyFee] = useState(state.billingConfig.monthlyFee);
  const [latePenaltyFee, setLatePenaltyFee] = useState(
    state.billingConfig.latePenaltyFee
  );
  const [openingBalance, setOpeningBalance] = useState(
    state.billingConfig.openingBalance
  );
  const [newBillingMonth, setNewBillingMonth] = useState('2026-12');

  // Benefit schedule draft amounts
  const [benefitDrafts, setBenefitDrafts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    state.benefitRules.forEach((b) => {
      map[b.id] = b.amount;
    });
    return map;
  });

  const [syncing, setSyncing] = useState(false);

  // Strict UI-level guard: only Misgana Tesfaye (Auditor + IT System Admin)
  const isAuthorizedItAdmin =
    currentUser.role === 'auditor' || Boolean(currentUser.isItAdmin);

  if (!isAuthorizedItAdmin) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-2">
        <ShieldCheck className="w-8 h-8 text-red-700 mx-auto" />
        <h2 className="text-base font-bold text-red-900">
          {getText(lang, 'ያልተፈቀደ መዳረሻ', 'Restricted System Admin Area')}
        </h2>
        <p className="text-xs text-slate-600">
          {getText(
            lang,
            'ይህ የሲስተም እና የፈቃድ አስተዳደር ክፍል ለምስጋና ተስፋዬ (ኦዲተር እና የሲስተም አስተዳዳሪ) ብቻ የተወሰነ ነው።',
            'User Access, Role Management, and System Settings are strictly restricted to Misgana Tesfaye (Auditor & IT System Admin).'
          )}
        </p>
      </div>
    );
  }

  const filteredMembers = state.members.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      m.fullNameAm.toLowerCase().includes(q) ||
      m.fullNameEn.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q)
    );
  });

  const effectiveTempPassword = tempPasswordInput.trim() || DEFAULT_TEMP_PASSWORD;

  const showCredentialsCard = (member: MemberRecord, pwd: string) => {
    setIssuedCredentials({
      memberName: getText(lang, member.fullNameAm, member.fullNameEn),
      memberCode: member.memberCode,
      loginId: member.email,
      phone: member.phone,
      tempPassword: pwd,
    });
    setCopiedCreds(false);
  };

  const handleSilentPasswordReset = (member: MemberRecord) => {
    setActionNotice('');
    onResetPasswordAndUnlock(member.id, 'reset', effectiveTempPassword);
    showCredentialsCard(member, effectiveTempPassword);
    setActionNotice(
      getText(
        lang,
        `ለ ${member.fullNameAm} (${member.memberCode}) ጊዜያዊ የይለፍ ቃል ተሰጥቷል (ምንም ኢሜይል አልተላከም)።`,
        `Temporary password assigned silently for ${member.fullNameEn} (${member.memberCode}) — no email sent.`
      )
    );
  };

  const handleDownloadBackup = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aleta_wondo_edir_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionNotice(
      getText(
        lang,
        'የሙሉ ሲስተሙ JSON ምትኬ (Backup) ተወርዷል።',
        'Full JSON system backup downloaded.'
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-[#064E3B] text-white rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
            <UserCog className="w-4 h-4" />
            <span>
              {getText(
                lang,
                'ልዩ የሲስተም አስተዳዳሪ እና የኦዲት ቁጥጥር ፓነል',
                'Exclusive IT System Admin Control Panel'
              )}
            </span>
          </div>
          <h2 className="text-lg font-bold">
            {getText(
              lang,
              'ምስጋና ተስፋዬ — ኦዲተር እና የሲስተም አስተዳዳሪ',
              'Misgana Tesfaye — Auditor & IT System Admin'
            )}
          </h2>
          <p className="text-xs text-white/85">
            {getText(
              lang,
              'ፈቃድ መስጠት፣ ሚና መቀየር እና ጊዜያዊ የይለፍ ቃል ማዘጋጀት (ያለ ኢሜይል መልዕክት) በዚህ ክፍል ብቻ ይከናወናል።',
              'Grant access, assign roles, and issue silent default/temporary passwords directly on screen (zero automated emails).'
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#047857] hover:bg-[#047857]/80 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{getText(lang, 'ምትኬ (JSON Backup)', 'Download Backup')}</span>
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              const res = await onSyncFirebase();
              setActionNotice(
                res.ok
                  ? getText(
                      lang,
                      'Firebase (aleta-pt) በተሳካ ሁኔታ ተመሳስሏል።',
                      'Firebase (aleta-pt) synced successfully.'
                    )
                  : res.error || 'Sync failed'
              );
              setSyncing(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {syncing
                ? getText(lang, 'በማመሳሰል ላይ...', 'Syncing...')
                : getText(lang, 'Firebase አመሳስል', 'Sync Firebase')}
            </span>
          </button>
        </div>
      </section>

      {/* Handover Card for Newly Assigned / Reset Default Credentials */}
      {issuedCredentials && (
        <section className="bg-white border-2 border-[#D97706] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#D97706]">
              {getText(
                lang,
                'ለአባሉ የሚሰጥ የመግቢያ መረጃ (ኢሜይል አልተላከም)',
                'Silent Login Credentials Ready for Handover (No Email Sent)'
              )}
            </p>
            <p className="text-sm font-bold text-[#064E3B]">
              {issuedCredentials.memberName} ({issuedCredentials.memberCode})
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-slate-800 pt-0.5">
              <span>
                {getText(lang, 'መግቢያ ID:', 'Login ID:')} {issuedCredentials.memberCode} /{' '}
                {issuedCredentials.phone} / {issuedCredentials.loginId}
              </span>
              <span className="font-bold text-[#064E3B]">
                {getText(lang, 'ጊዜያዊ የይለፍ ቃል:', 'Temp Password:')} {issuedCredentials.tempPassword}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              {getText(
                lang,
                'ተጠቃሚው ለመጀመሪያ ጊዜ ሲገባ የራሱን የግል የይለፍ ቃል እንዲቀይር ስርዓቱ ይጠይቀዋል።',
                'User will be prompted to replace this temporary password with a personal password upon first sign-in.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const txt = `Aleta Wondo Edir Login\nName: ${issuedCredentials.memberName}\nID: ${issuedCredentials.memberCode}\nPhone: ${issuedCredentials.phone}\nEmail: ${issuedCredentials.loginId}\nTemporary Password: ${issuedCredentials.tempPassword}`;
              navigator.clipboard?.writeText(txt).catch(() => {});
              setCopiedCreds(true);
              setTimeout(() => setCopiedCreds(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
          >
            {copiedCreds ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>
              {copiedCreds
                ? COPY[lang].copied
                : getText(lang, 'መረጃውን ቅዳ', 'Copy Credentials')}
            </span>
          </button>
        </section>
      )}

      {actionNotice && (
        <div className="p-3.5 bg-[#047857]/10 border border-[#047857]/30 rounded-lg text-xs text-[#064E3B] font-semibold">
          {actionNotice}
        </div>
      )}

      {/* 1. User Access, Role & Silent Credential Management */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#064E3B]">
              {getText(
                lang,
                'የተጠቃሚ መግቢያ ፈቃድ፣ የስራ ድርሻ እና ጊዜያዊ የይለፍ ቃል አስተዳደር',
                'User Access, Role Assignment & Silent Default Passwords'
              )}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {getText(
                lang,
                'ፈቃድ ሲሰጡ ወይም የይለፍ ቃል ዳግም ሲያስጀምሩ ከታች ያለው ጊዜያዊ የይለፍ ቃል በስክሪን ላይ ይታያል፤ ሁሉም በኦዲት መዝገብ ይመዘገባል።',
                'Assigning or resetting access silently applies the temporary password below and logs every action in the immutable Audit Trail.'
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-[11px] font-semibold text-[#064E3B] whitespace-nowrap">
                {getText(lang, 'ነባሪ ቃል፡', 'Default Pass:')}
              </span>
              <input
                type="text"
                value={tempPasswordInput}
                onChange={(e) => setTempPasswordInput(e.target.value)}
                className="w-28 text-xs font-mono font-semibold text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={COPY[lang].searchPlaceholder}
              className="w-full sm:w-64 px-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[#064E3B] font-bold bg-slate-50">
                <th className="py-3 px-3">{getText(lang, 'መለያ', 'ID')}</th>
                <th className="py-3 px-3">{getText(lang, 'ተጠቃሚ', 'User')}</th>
                <th className="py-3 px-3">{getText(lang, 'የስራ ድርሻ (Role)', 'Role')}</th>
                <th className="py-3 px-3">{getText(lang, 'ሁኔታ', 'Access State')}</th>
                <th className="py-3 px-3 text-right">
                  {getText(lang, 'የሲስተም አስተዳዳሪ እርምጃዎች', 'IT Admin Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 font-mono font-bold text-[#064E3B] tabular-nums">
                    {m.memberCode}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900">
                      {getText(lang, m.fullNameAm, m.fullNameEn)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {m.phone} · {m.email}
                      {m.googleEmail && m.googleEmail !== m.email
                        ? ` · G: ${m.googleEmail}`
                        : ''}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={m.role}
                      disabled={m.id === currentUser.id}
                      onChange={(e) => {
                        const newRole = e.target.value as Role;
                        onManageAccess(m.id, m.accessStatus, newRole);
                        setActionNotice(
                          getText(
                            lang,
                            `የ ${m.fullNameAm} የስራ ድርሻ ወደ ${ROLE_LABELS[newRole].am} ተቀይሯል።`,
                            `Updated ${m.fullNameEn}'s role to ${ROLE_LABELS[newRole].en}.`
                          )
                        );
                      }}
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white disabled:opacity-60"
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r][lang]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-bold ${
                        m.accessStatus === 'active'
                          ? 'text-[#047857]'
                          : m.accessStatus === 'suspended'
                          ? 'text-red-700'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {COPY[lang][m.accessStatus]}
                    </span>
                    {m.locked && (
                      <span className="ml-1.5 text-red-700 font-semibold">
                        ({getText(lang, 'የተቆለፈ', 'Locked')})
                      </span>
                    )}
                    {m.mustChangePassword && (
                      <p className="text-[11px] font-mono text-[#D97706] mt-0.5">
                        {getText(lang, 'ጊዜያዊ ቃል:', 'Temp:')}{' '}
                        {m.defaultTempPassword || DEFAULT_TEMP_PASSWORD}
                      </p>
                    )}
                    {m.lastPasswordResetAt && !m.mustChangePassword && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Reset: {m.lastPasswordResetAt}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      {m.accessStatus !== 'active' ? (
                        <button
                          type="button"
                          onClick={() => {
                            onManageAccess(m.id, 'active', undefined, effectiveTempPassword);
                            showCredentialsCard(m, effectiveTempPassword);
                            setActionNotice(
                              getText(
                                lang,
                                `ለ ${m.fullNameAm} የመግቢያ ፈቃድ እና ጊዜያዊ የይለፍ ቃል ተሰጥቷል።`,
                                `Activated access and assigned temporary password for ${m.fullNameEn}.`
                              )
                            );
                          }}
                          className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white rounded-lg cursor-pointer font-semibold"
                        >
                          {getText(lang, 'ፈቃድ ስጥ', 'Grant / Activate')}
                        </button>
                      ) : (
                        m.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => {
                              onManageAccess(m.id, 'suspended');
                              setActionNotice(
                                getText(
                                  lang,
                                  `የ ${m.fullNameAm} መለያ ታግዷል።`,
                                  `Suspended access for ${m.fullNameEn}.`
                                )
                              );
                            }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg cursor-pointer font-semibold"
                          >
                            {getText(lang, 'አግድ / አንሳ', 'Suspend / Revoke')}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => handleSilentPasswordReset(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#064E3B] border border-[#D97706]/30 rounded-lg cursor-pointer font-semibold"
                      >
                        <KeyRound className="w-3 h-3 text-[#D97706]" />
                        <span>{getText(lang, 'ጊዜያዊ ቃል ስጥ', 'Assign Temp Password')}</span>
                      </button>

                      {(m.locked || m.accessStatus === 'suspended') && (
                        <button
                          type="button"
                          onClick={() => {
                            onResetPasswordAndUnlock(m.id, 'unlock');
                            setActionNotice(
                              getText(
                                lang,
                                `የ ${m.fullNameAm} መለያ ተከፍቷል።`,
                                `Unlocked account for ${m.fullNameEn}.`
                              )
                            );
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#064E3B] border border-[#064E3B]/30 rounded-lg cursor-pointer font-semibold"
                        >
                          <LockOpen className="w-3 h-3" />
                          <span>{getText(lang, 'ክፈት', 'Unlock')}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Technical System Settings & Benefit Payout Schedule Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-5 h-5 text-[#064E3B]" />
            <h3 className="text-base font-bold text-[#064E3B]">
              {getText(
                lang,
                'የወርሃዊ ክፍያ እና ቅጣት ቅንብር',
                'Monthly Dues & Auto-Penalty Config'
              )}
            </h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateBillingConfig({
                ...state.billingConfig,
                monthlyFee,
                latePenaltyFee,
                openingBalance,
              });
              setActionNotice(
                getText(
                  lang,
                  'የክፍያ እና የቅጣት ቅንብሮች ተቀምጠዋል።',
                  'Billing rates & automatic penalty rules updated.'
                )
              );
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {getText(lang, 'ወርሃዊ መዋጮ (ETB)', 'Monthly Due Rate (ETB)')}
              </label>
              <input
                type="number"
                min={10}
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {getText(lang, 'አውቶማቲክ የዘገየ ቅጣት (ETB/ወር)', 'Auto Late Penalty Fee (ETB/mo)')}
              </label>
              <input
                type="number"
                min={0}
                value={latePenaltyFee}
                onChange={(e) => setLatePenaltyFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {getText(lang, 'መነሻ የባንክ ሂሳብ (ETB)', 'Treasury Opening Balance (ETB)')}
              </label>
              <input
                type="number"
                min={0}
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              {getText(lang, 'የክፍያ ቅንብር አስቀምጥ', 'Save Billing Configuration')}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {getText(lang, 'ንቁ የክፍያ ወር ጨምር (YYYY-MM)', 'Add Active Billing Cycle')}
            </label>
            <div className="flex gap-2">
              <input
                type="month"
                value={newBillingMonth}
                onChange={(e) => setNewBillingMonth(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  if (
                    !newBillingMonth ||
                    state.billingConfig.activeBillingMonths.includes(newBillingMonth)
                  )
                    return;
                  onUpdateBillingConfig({
                    ...state.billingConfig,
                    activeBillingMonths: [
                      ...state.billingConfig.activeBillingMonths,
                      newBillingMonth,
                    ].sort(),
                  });
                  setActionNotice(
                    getText(
                      lang,
                      `አዲስ የክፍያ ወር ${newBillingMonth} ታክሏል።`,
                      `Added billing month ${newBillingMonth}.`
                    )
                  );
                }}
                className="px-3.5 py-1.5 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {getText(lang, 'ጨምር', 'Add Cycle')}
              </button>
            </div>
            <p className="text-[11px] font-mono text-slate-500">
              {state.billingConfig.activeBillingMonths.join(' · ')}
            </p>
          </div>

          <p className="text-[11px] text-slate-500 pt-2">
            Firebase (`aleta-pt`):{' '}
            <span
              className={
                firebaseStatus.connected ? 'text-[#047857] font-semibold' : 'text-[#D97706]'
              }
            >
              {firebaseStatus.connected ? 'Connected' : firebaseStatus.note || 'Cached'}
            </span>
          </p>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-[#D97706]" />
            <h3 className="text-base font-bold text-[#064E3B]">
              {getText(
                lang,
                'የመረዳጃ ክፍያ መጠኖች ማስተካከያ (Benefit Payout Schedule)',
                'Benefit Payout Schedule Configuration'
              )}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {state.benefitRules.map((rule) => (
              <div
                key={rule.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">
                    {getText(lang, rule.categoryAm, rule.categoryEn)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {getText(lang, rule.descriptionAm, rule.descriptionEn)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    value={benefitDrafts[rule.id] ?? rule.amount}
                    onChange={(e) =>
                      setBenefitDrafts((prev) => ({
                        ...prev,
                        [rule.id]: Number(e.target.value),
                      }))
                    }
                    className="w-28 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg text-right"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextAmt = benefitDrafts[rule.id] ?? rule.amount;
                      onUpdateBenefitRule({ ...rule, amount: nextAmt });
                      setActionNotice(
                        getText(
                          lang,
                          `የ ${rule.categoryAm} ክፍያ ወደ ${formatETB(nextAmt, lang)} ተቀይሯል።`,
                          `Updated ${rule.categoryEn} payout to ${formatETB(nextAmt, lang)}.`
                        )
                      );
                    }}
                    className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].save}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
