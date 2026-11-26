import React, { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Coins,
  Copy,
  FileCheck2,
  HandCoins,
  Landmark,
} from 'lucide-react';
import {
  BankReconciliation,
  DisbursementRequest,
  EdirState,
  Language,
  MemberRecord,
  SpecialContribution,
} from '../types';
import { COPY, formatETB, getText } from '../i18n';
import { computeMemberFinancials, computeTreasurySummary } from '../utils/billing';
import { formatWhatsAppSmsMessage } from '../utils/exportUtils';

type FinanceSubTab =
  | 'dues'
  | 'special'
  | 'receipts'
  | 'disbursements'
  | 'reconciliation';

interface FinanceModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onVerifyReceipt: (
    receiptId: string,
    decision: 'verified' | 'rejected',
    note?: string
  ) => void;
  onCreateSpecialContribution: (
    sc: Omit<SpecialContribution, 'id' | 'createdAt' | 'paidMemberIds'>
  ) => void;
  onCreateDisbursement: (
    dis: Omit<DisbursementRequest, 'id' | 'status' | 'createdAt'>
  ) => void;
  onAuthorizeDisbursement: (
    disId: string,
    decision: 'authorized_for_cashier' | 'rejected'
  ) => void;
  onExecuteDisbursement: (disId: string, payoutRef: string) => void;
  onSaveReconciliation: (
    recon: Omit<BankReconciliation, 'id' | 'createdAt'>
  ) => void;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({
  lang,
  currentUser,
  state,
  onVerifyReceipt,
  onCreateSpecialContribution,
  onCreateDisbursement,
  onAuthorizeDisbursement,
  onExecuteDisbursement,
  onSaveReconciliation,
}) => {
  const defaultTab: FinanceSubTab =
    currentUser.role === 'vice_chairman' ? 'disbursements' : 'receipts';
  const [subTab, setSubTab] = useState<FinanceSubTab>(defaultTab);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchDues, setSearchDues] = useState('');

  // Special contribution form
  const [specialCat, setSpecialCat] =
    useState<SpecialContribution['category']>('wedding');
  const [specialTitleAm, setSpecialTitleAm] = useState('');
  const [specialTitleEn, setSpecialTitleEn] = useState('');
  const [specialAmt, setSpecialAmt] = useState(200);
  const [specialDue, setSpecialDue] = useState('2026-12-20');

  // Disbursement request form
  const [disMemberId, setDisMemberId] = useState(state.members[0]?.id || '');
  const [disBenefitType, setDisBenefitType] = useState(
    state.benefitRules[0]?.categoryEn || ''
  );
  const [disAmt, setDisAmt] = useState(state.benefitRules[0]?.amount || 5000);
  const [disReason, setDisReason] = useState('');
  const [payoutRefMap, setPayoutRefMap] = useState<Record<string, string>>({});

  // Bank reconciliation form
  const treasury = computeTreasurySummary(state);
  const [bankBalanceInput, setBankBalanceInput] = useState(
    String(treasury.systemCalculatedCashBalance)
  );
  const [bankNameInput, setBankNameInput] = useState(
    'Commercial Bank of Ethiopia (CBE)'
  );
  const [bankAcctLast4, setBankAcctLast4] = useState('4821');
  const [reconNotes, setReconNotes] = useState('');

  const isChairman = currentUser.role === 'chairman';
  const isViceChairman = currentUser.role === 'vice_chairman';
  const isCashier = currentUser.role === 'cashier';
  const isAuditor = currentUser.role === 'auditor';
  const canCashierAct = isCashier || isChairman;

  const pendingReceipts = state.paymentReceipts.filter((r) => r.status === 'pending');
  const pendingVcDisbursements = state.disbursements.filter(
    (d) => d.status === 'pending_vice_chairman'
  );
  const authorizedDisbursements = state.disbursements.filter(
    (d) => d.status === 'authorized_for_cashier'
  );

  const memberFinancialRows = state.members
    .filter((m) => m.approvalStatus === 'approved')
    .map((m) => ({ member: m, fin: computeMemberFinancials(m, state) }))
    .filter(({ member }) => {
      const q = searchDues.trim().toLowerCase();
      return (
        !q ||
        member.fullNameAm.toLowerCase().includes(q) ||
        member.fullNameEn.toLowerCase().includes(q) ||
        member.memberCode.toLowerCase().includes(q)
      );
    });

  const parsedBank = Number(bankBalanceInput) || 0;
  const liveVariance = parsedBank - treasury.systemCalculatedCashBalance;

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const actionTabs: {
    id: FinanceSubTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'dues',
      label: getText(lang, 'ወርሃዊ ክፍያ እና ቅጣት', 'Dues & Auto-Penalties'),
      icon: <AlertCircle className="w-4 h-4" />,
    },
    {
      id: 'special',
      label: getText(lang, 'ልዩ መዋጮዎች', 'Special Contributions'),
      icon: <Coins className="w-4 h-4" />,
    },
    {
      id: 'receipts',
      label: getText(lang, 'ደረሰኝ ማረጋገጫ', 'Receipt Verification'),
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: pendingReceipts.length,
    },
    {
      id: 'disbursements',
      label: getText(lang, 'የመረዳጃ ወጪዎች', 'Benefit Disbursements'),
      icon: <HandCoins className="w-4 h-4" />,
      badge: pendingVcDisbursements.length + authorizedDisbursements.length,
    },
    {
      id: 'reconciliation',
      label: getText(lang, 'የባንክ ማስታረቂያ', 'Bank Reconciliation'),
      icon: <Landmark className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Treasury KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {getText(lang, 'መነሻ የባንክ ሂሳብ', 'Opening Balance')}
          </p>
          <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatETB(treasury.openingBalance, lang)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {getText(lang, 'የተረጋገጠ ገቢ', 'Verified Inflow')}
          </p>
          <p className="mt-2 text-xl font-bold font-mono tabular-nums text-[#047857]">
            +{formatETB(treasury.totalVerifiedInflow, lang)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {getText(lang, 'የተፈጸመ ወጪ', 'Executed Disbursements')}
          </p>
          <p className="mt-2 text-xl font-bold font-mono tabular-nums text-[#D97706]">
            -{formatETB(treasury.totalDisbursedOutflow, lang)}
          </p>
        </div>
        <div className="bg-[#064E3B] text-white rounded-xl p-5">
          <p className="text-xs font-medium text-[#F59E0B]">
            {getText(lang, 'የስርዓቱ የተጣራ ካዝና ሂሳብ', 'System Net Cash Balance')}
          </p>
          <p className="mt-2 text-xl font-bold font-mono tabular-nums">
            {formatETB(treasury.systemCalculatedCashBalance, lang)}
          </p>
        </div>
      </div>

      {/* Top Action Buttons Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {actionTabs.map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#064E3B] text-white'
                    : 'bg-white text-[#064E3B] border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[11px] font-mono rounded ${
                      active
                        ? 'bg-[#F59E0B] text-[#064E3B] font-bold'
                        : 'bg-[#F59E0B]/20 text-[#D97706] font-bold'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isAuditor && (
          <span className="text-xs font-semibold text-[#D97706] px-2">
            {getText(lang, 'የኦዲተር (የንባብ ብቻ) እይታ', 'Auditor Read-Only Oversight')}
          </span>
        )}
      </div>

      {/* SUB-VIEW 1: MONTHLY DUES & AUTO-PENALTY TRACKER */}
      {subTab === 'dues' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'የአባላት ወርሃዊ ክፍያ እና አውቶማቲክ ቅጣት መከታተያ',
                  'Monthly Dues & Auto-Penalty Tracker'
                )}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {getText(
                  lang,
                  `ወርሃዊ መዋጮ ${formatETB(state.billingConfig.monthlyFee, lang)} · አውቶማቲክ ቅጣት ${formatETB(state.billingConfig.latePenaltyFee, lang)}/ወር · ጠቅላላ ተሰብሳቢ ${formatETB(treasury.totalOutstandingReceivables, lang)}`,
                  `Monthly due ${formatETB(state.billingConfig.monthlyFee, lang)} · Auto penalty ${formatETB(state.billingConfig.latePenaltyFee, lang)}/mo · Total receivables ${formatETB(treasury.totalOutstandingReceivables, lang)}`
                )}
              </p>
            </div>
            <input
              type="text"
              value={searchDues}
              onChange={(e) => setSearchDues(e.target.value)}
              placeholder={COPY[lang].searchPlaceholder}
              className="w-full sm:w-64 px-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                  <th className="py-3 px-3">{getText(lang, 'መለያ', 'ID')}</th>
                  <th className="py-3 px-3">{getText(lang, 'አባል', 'Member')}</th>
                  <th className="py-3 px-3 text-right">{getText(lang, 'የተከፈሉ ወራት', 'Paid Mos')}</th>
                  <th className="py-3 px-3 text-right">{getText(lang, 'ያለፉ ወራት', 'Overdue Mos')}</th>
                  <th className="py-3 px-3 text-right">{getText(lang, 'ቅጣት', 'Auto Penalty')}</th>
                  <th className="py-3 px-3 text-right">{getText(lang, 'ጠቅላላ ቀሪ', 'Total Due')}</th>
                  <th className="py-3 px-3 text-right">{getText(lang, 'ማሳሰቢያ', 'Reminder')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberFinancialRows.map(({ member, fin }) => {
                  const msg = formatWhatsAppSmsMessage('overdue', lang, {
                    memberName: getText(lang, member.fullNameAm, member.fullNameEn),
                    amount: fin.totalDue,
                    overdueMonths: fin.overdueMonths.length || 1,
                  });
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono font-bold text-[#064E3B] tabular-nums">
                        {member.memberCode}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">
                          {getText(lang, member.fullNameAm, member.fullNameEn)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">{member.phone}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#047857] font-semibold">
                        {fin.paidMonths.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#D97706] font-semibold">
                        {fin.overdueMonths.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatETB(fin.autoPenaltyDue, lang)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold tabular-nums ${
                          fin.totalDue > 0 ? 'text-red-700' : 'text-[#047857]'
                        }`}
                      >
                        {formatETB(fin.totalDue, lang)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {fin.totalDue > 0 ? (
                          <button
                            type="button"
                            onClick={() => copyText(member.id, msg)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#064E3B] rounded-lg cursor-pointer font-semibold"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#D97706]" />
                            <span>
                              {copiedId === member.id ? COPY[lang].copied : COPY[lang].copyMessage}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[#047857] font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {COPY[lang].active}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-VIEW 2: SPECIAL CONTRIBUTIONS */}
      {subTab === 'special' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {canCashierAct && (
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(
                  lang,
                  'አዲስ ልዩ መዋጮ መክፈቻ (ሰርግ / ሀዘን / ድንኳን / ወንበር)',
                  'Publish Special Contribution'
                )}
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!specialTitleAm.trim() && !specialTitleEn.trim()) return;
                  onCreateSpecialContribution({
                    category: specialCat,
                    titleAm: specialTitleAm.trim() || specialTitleEn.trim(),
                    titleEn: specialTitleEn.trim() || specialTitleAm.trim(),
                    amount: specialAmt,
                    dueDate: specialDue,
                    createdBy: currentUser.fullNameEn,
                  });
                  setSpecialTitleAm('');
                  setSpecialTitleEn('');
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <select
                    value={specialCat}
                    onChange={(e) =>
                      setSpecialCat(e.target.value as SpecialContribution['category'])
                    }
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="wedding">{getText(lang, 'ሰርግ (Wedding)', 'Wedding')}</option>
                    <option value="bereavement">{getText(lang, 'ሀዘን (Bereavement)', 'Bereavement')}</option>
                    <option value="chairs">{getText(lang, 'ወንበር (Chairs)', 'Chairs')}</option>
                    <option value="tents">{getText(lang, 'ድንኳን (Tents)', 'Tents')}</option>
                    <option value="other">{getText(lang, 'ሌላ (Other)', 'Other')}</option>
                  </select>
                  <input
                    type="number"
                    min={10}
                    value={specialAmt}
                    onChange={(e) => setSpecialAmt(Number(e.target.value))}
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                  <input
                    type="date"
                    value={specialDue}
                    onChange={(e) => setSpecialDue(e.target.value)}
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  placeholder={getText(lang, 'ርዕስ (አማርኛ)', 'Title (Amharic)')}
                  value={specialTitleAm}
                  onChange={(e) => setSpecialTitleAm(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={getText(lang, 'ርዕስ (English)', 'Title (English)')}
                  value={specialTitleEn}
                  onChange={(e) => setSpecialTitleEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {getText(lang, 'ለሁሉም አባላት አስተላልፍ', 'Publish to All Members')}
                </button>
              </form>
            </section>
          )}

          <section
            className={`${
              canCashierAct ? 'lg:col-span-7' : 'lg:col-span-12'
            } bg-white border border-slate-200 rounded-xl p-6 space-y-4`}
          >
            <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'ንቁ ልዩ መዋጮዎች አሰባሰብ', 'Active Special Contributions Collection')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                    <th className="py-2.5 px-3">{getText(lang, 'ርዕስ', 'Contribution')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'መጠን', 'Amount')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ማለቂያ ቀን', 'Due Date')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'የከፈሉ', 'Paid')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'የተሰበሰበ', 'Collected')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.specialContributions.map((sc) => {
                    const totalMembers = state.members.filter(
                      (m) => m.approvalStatus === 'approved'
                    ).length;
                    const collected = sc.paidMemberIds.length * sc.amount;
                    return (
                      <tr key={sc.id}>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">
                            {getText(lang, sc.titleAm, sc.titleEn)}
                          </p>
                          <p className="text-[11px] uppercase text-[#D97706] font-semibold">
                            {sc.category}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                          {formatETB(sc.amount, lang)}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                          {sc.dueDate}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          {sc.paidMemberIds.length}/{totalMembers}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#047857] tabular-nums">
                          {formatETB(collected, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* SUB-VIEW 3: RECEIPT VERIFICATION */}
      {subTab === 'receipts' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'ማረጋገጫ የሚጠብቁ የአባላት ደረሰኞች', 'Pending Receipt Verification Queue')}
            </h2>
            {pendingReceipts.length === 0 ? (
              <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingReceipts.map((r) => (
                  <div
                    key={r.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, r.memberNameAm, r.memberNameEn)}{' '}
                        <span className="font-mono text-xs text-[#064E3B]">
                          ({r.memberCode})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">
                        {r.channel} · Ref: {r.referenceNumber} · {r.paymentDate}
                      </p>
                      {r.receiptDataUrl && (
                        <a
                          href={r.receiptDataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs text-[#047857] font-semibold underline mt-1"
                        >
                          {getText(lang, 'የተላከውን ደረሰኝ ይመልከቱ', 'View Uploaded Receipt')}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base font-bold font-mono text-[#064E3B] tabular-nums">
                        {formatETB(r.amount, lang)}
                      </span>
                      {canCashierAct && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onVerifyReceipt(r.id, 'verified')}
                            className="px-3.5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {getText(lang, 'አረጋግጥና መዝግብ', 'Verify & Credit')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onVerifyReceipt(
                                r.id,
                                'rejected',
                                'Reference not found on bank statement'
                              )
                            }
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {COPY[lang].reject}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'ሁሉም የደረሰኝ መዝገብ', 'All Submitted Receipts Ledger')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                    <th className="py-2.5 px-3">{getText(lang, 'ቀን', 'Date')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'አባል', 'Member')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ቻናል / Ref', 'Channel & Ref')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'መጠን', 'Amount')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'ሁኔታ', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.paymentReceipts.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                        {r.paymentDate}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {getText(lang, r.memberNameAm, r.memberNameEn)} ({r.memberCode})
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.channel} · {r.referenceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#064E3B] tabular-nums">
                        {formatETB(r.amount, lang)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        <span
                          className={
                            r.status === 'verified'
                              ? 'text-[#047857]'
                              : r.status === 'rejected'
                              ? 'text-red-700'
                              : 'text-[#D97706]'
                          }
                        >
                          {COPY[lang][r.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* SUB-VIEW 4: BENEFIT DISBURSEMENTS (VC AUTHORIZE -> CASHIER EXECUTE) */}
      {subTab === 'disbursements' && (
        <div className="space-y-6">
          {(isViceChairman || isChairman || currentUser.role === 'secretary' || currentUser.role === 'committee') && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'አዲስ የመረዳጃ ክፍያ (ወጪ) መጠየቂያ', 'Request Benefit Disbursement')}
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const mem = state.members.find((m) => m.id === disMemberId);
                  if (!mem || disAmt <= 0) return;
                  onCreateDisbursement({
                    memberId: mem.id,
                    memberNameAm: mem.fullNameAm,
                    memberNameEn: mem.fullNameEn,
                    benefitType: disBenefitType,
                    reasonAm: disReason || disBenefitType,
                    reasonEn: disReason || disBenefitType,
                    amount: disAmt,
                  });
                  setDisReason('');
                }}
                className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-[#064E3B] mb-1">
                    {getText(lang, 'ተቀባይ አባል', 'Recipient')}
                  </label>
                  <select
                    value={disMemberId}
                    onChange={(e) => setDisMemberId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {getText(lang, m.fullNameAm, m.fullNameEn)} ({m.memberCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#064E3B] mb-1">
                    {getText(lang, 'የድጋፍ አይነት', 'Benefit Type')}
                  </label>
                  <select
                    value={disBenefitType}
                    onChange={(e) => {
                      setDisBenefitType(e.target.value);
                      const matched = state.benefitRules.find(
                        (b) => b.categoryEn === e.target.value
                      );
                      if (matched) setDisAmt(matched.amount);
                    }}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    {state.benefitRules.map((b) => (
                      <option key={b.id} value={b.categoryEn}>
                        {getText(lang, b.categoryAm, b.categoryEn)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#064E3B] mb-1">
                    {getText(lang, 'መጠን (ብር)', 'Amount (ETB)')}
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={disAmt}
                    onChange={(e) => setDisAmt(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#064E3B] mb-1">
                    {getText(lang, 'ምክንያት', 'Reason / Note')}
                  </label>
                  <input
                    type="text"
                    value={disReason}
                    onChange={(e) => setDisReason(e.target.value)}
                    placeholder={getText(lang, 'ዝርዝር ማብራሪያ...', 'Details...')}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer h-[36px]"
                >
                  {getText(lang, 'ክፍያ ጠይቅ', 'Create Payout')}
                </button>
              </form>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stage 1: Pending VC (Muluken Yonas) Authorization */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(
                  lang,
                  'የምክትል ሰብሳቢ (ሙሉቀን ዮናስ) ፈቃድ የሚጠብቁ',
                  'Awaiting Vice Chairman (Muluken Yonas)'
                )}
              </h3>
              {pendingVcDisbursements.length === 0 ? (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingVcDisbursements.map((d) => (
                    <div
                      key={d.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {getText(lang, d.memberNameAm, d.memberNameEn)} ·{' '}
                          <span className="font-mono text-[#064E3B]">
                            {formatETB(d.amount, lang)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600">
                          {d.benefitType} — {getText(lang, d.reasonAm, d.reasonEn)}
                        </p>
                      </div>
                      {isViceChairman ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onAuthorizeDisbursement(d.id, 'authorized_for_cashier')
                            }
                            className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {COPY[lang].authorizeForCashier}
                          </button>
                          <button
                            type="button"
                            onClick={() => onAuthorizeDisbursement(d.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {COPY[lang].reject}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[#D97706]">
                          {COPY[lang].pending}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Stage 2: Authorized for Cashier (Behailu Lemma) Execution */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(
                  lang,
                  'በገንዘብ ያዥ (በሀይሉ ለማ) የሚከፈሉ የተፈቀዱ ወጪዎች',
                  'Authorized Disbursements for Cashier'
                )}
              </h3>
              {authorizedDisbursements.length === 0 ? (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {authorizedDisbursements.map((d) => (
                    <div key={d.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {getText(lang, d.memberNameAm, d.memberNameEn)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {d.benefitType} · Authorized by {d.authorizedBy}
                          </p>
                        </div>
                        <span className="text-sm font-bold font-mono text-[#D97706] tabular-nums">
                          {formatETB(d.amount, lang)}
                        </span>
                      </div>
                      {canCashierAct && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="PAY-2026-..."
                            value={payoutRefMap[d.id] || ''}
                            onChange={(e) =>
                              setPayoutRefMap((p) => ({
                                ...p,
                                [d.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onExecuteDisbursement(
                                d.id,
                                payoutRefMap[d.id] ||
                                  `PAY-${Date.now().toString().slice(-5)}`
                              )
                            }
                            className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {COPY[lang].markPaid}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'የተፈጸሙ እና የቀረቡ ወጪዎች ታሪክ', 'Disbursement History')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                    <th className="py-2.5 px-3">{getText(lang, 'ቀን', 'Date')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ተቀባይ', 'Recipient')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'አይነት', 'Benefit')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'መጠን', 'Amount')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ማጣቀሻ Ref', 'Payout Ref')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'ሁኔታ', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.disbursements.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                        {d.paidAt || d.createdAt}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {getText(lang, d.memberNameAm, d.memberNameEn)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{d.benefitType}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#064E3B] tabular-nums">
                        {formatETB(d.amount, lang)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {d.payoutRef || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        <span
                          className={
                            d.status === 'paid'
                              ? 'text-[#047857]'
                              : d.status === 'rejected'
                              ? 'text-red-700'
                              : 'text-[#D97706]'
                          }
                        >
                          {d.status === 'paid'
                            ? COPY[lang].paid
                            : d.status === 'rejected'
                            ? COPY[lang].rejected
                            : d.status === 'authorized_for_cashier'
                            ? getText(lang, 'ለገንዘብ ያዥ ተፈቅዷል', 'Ready for Cashier')
                            : COPY[lang].pending}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* SUB-VIEW 5: BANK RECONCILIATION */}
      {subTab === 'reconciliation' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Banknote className="w-5 h-5 text-[#064E3B]" />
            <div>
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(lang, 'የባንክ ሂሳብ ማስታረቂያ (Bank Reconciliation)', 'Bank Reconciliation')}
              </h2>
              <p className="text-xs text-slate-600">
                {getText(
                  lang,
                  'የባንክ መግለጫውን ሚዛን ያስገቡና ከስርዓቱ ሂሳብ ጋር ያለውን ልዩነት ወዲያውኑ ያረጋግጡ።',
                  'Compare actual bank statement balance against system cash ledger.'
                )}
              </p>
            </div>
          </div>

          {canCashierAct && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveReconciliation({
                  reconciliationDate: new Date().toISOString().slice(0, 10),
                  periodLabel: 'Nov 2026 / ህዳር',
                  systemCalculatedBalance: treasury.systemCalculatedCashBalance,
                  bankStatementBalance: parsedBank,
                  variance: liveVariance,
                  bankName: bankNameInput,
                  accountLast4: bankAcctLast4,
                  notes:
                    reconNotes ||
                    (liveVariance === 0
                      ? 'Balanced exactly'
                      : 'Variance flagged for Auditor'),
                  reconciledBy: currentUser.fullNameEn,
                });
                setReconNotes('');
              }}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                  {getText(lang, 'የባንክ ስም', 'Bank Name')}
                </label>
                <input
                  type="text"
                  value={bankNameInput}
                  onChange={(e) => setBankNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                  {getText(lang, 'መለያ (4 አሃዝ)', 'Acct Last 4')}
                </label>
                <input
                  type="text"
                  value={bankAcctLast4}
                  onChange={(e) => setBankAcctLast4(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                  {getText(lang, 'የባንክ ሚዛን (ETB)', 'Bank Statement Balance')}
                </label>
                <input
                  type="number"
                  value={bankBalanceInput}
                  onChange={(e) => setBankBalanceInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                  {getText(lang, 'ልዩነት (Variance)', 'Variance')}
                </label>
                <div
                  className={`px-3 py-2 text-xs font-mono font-bold rounded-lg border tabular-nums ${
                    liveVariance === 0
                      ? 'bg-[#047857]/10 border-[#047857]/30 text-[#064E3B]'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {liveVariance > 0 ? '+' : ''}
                  {formatETB(liveVariance, lang)}
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer h-[36px]"
              >
                {getText(lang, 'ማስታረቂያ መዝግብ', 'Record Reconciliation')}
              </button>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder={getText(
                    lang,
                    'የባንክ ማስታረቂያ ማስታወሻ...',
                    'Reconciliation notes or deposit reference...'
                  )}
                  value={reconNotes}
                  onChange={(e) => setReconNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                  <th className="py-2.5 px-3">{getText(lang, 'ቀን', 'Date')}</th>
                  <th className="py-2.5 px-3">{getText(lang, 'ባንክ', 'Bank')}</th>
                  <th className="py-2.5 px-3 text-right">{getText(lang, 'የስርዓት ሂሳብ', 'System Cash')}</th>
                  <th className="py-2.5 px-3 text-right">{getText(lang, 'የባንክ ሂሳብ', 'Bank Balance')}</th>
                  <th className="py-2.5 px-3 text-right">{getText(lang, 'ልዩነት', 'Variance')}</th>
                  <th className="py-2.5 px-3">{getText(lang, 'አስታራቂ', 'Reconciled By')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.reconciliations.map((rec) => (
                  <tr key={rec.id}>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      {rec.reconciliationDate}
                    </td>
                    <td className="py-2.5 px-3">{rec.bankName}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatETB(rec.systemCalculatedBalance, lang)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatETB(rec.bankStatementBalance, lang)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                        rec.variance === 0 ? 'text-[#047857]' : 'text-red-700'
                      }`}
                    >
                      {formatETB(rec.variance, lang)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{rec.reconciledBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
