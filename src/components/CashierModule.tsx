import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Eye,
  EyeOff,
  Landmark,
  Plus,
  Receipt,
  Search,
  XCircle,
} from 'lucide-react';
import {
  BankReconciliation,
  EdirState,
  Language,
  MemberRecord,
  SpecialContribution,
} from '../types';
import { COPY, formatETB, getText } from '../i18n';
import { computeTreasurySummary } from '../utils/billing';

type CashierTab = 'verify_receipts' | 'execute_payouts' | 'bank_reconciliation';

interface CashierModuleProps {
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
  onExecuteDisbursement: (disbId: string, payoutRef: string) => void;
  onSaveReconciliation: (
    rec: Omit<BankReconciliation, 'id' | 'createdAt'>
  ) => void;
}

export const CashierModule: React.FC<CashierModuleProps> = ({
  lang,
  currentUser,
  state,
  onVerifyReceipt,
  onCreateSpecialContribution,
  onExecuteDisbursement,
  onSaveReconciliation,
}) => {
  const [tab, setTab] = useState<CashierTab>('verify_receipts');
  const [feedback, setFeedback] = useState('');

  // Verify receipts (No unsolicited list!)
  const [receiptSearch, setReceiptSearch] = useState('');
  const [showReceiptsList, setShowReceiptsList] = useState(false);
  const [openSingleReceipt, setOpenSingleReceipt] = useState(false);
  const [showSpecialForm, setShowSpecialForm] = useState(false);
  const [spCat, setSpCat] = useState<SpecialContribution['category']>('tents');
  const [spTitleAm, setSpTitleAm] = useState('');
  const [spTitleEn, setSpTitleEn] = useState('');
  const [spAmount, setSpAmount] = useState(500);
  const [spDue, setSpDue] = useState('2026-12-20');

  // Execute disbursements (No unsolicited list!)
  const [payoutRefMap, setPayoutRefMap] = useState<Record<string, string>>({});
  const [showDisbList, setShowDisbList] = useState(false);
  const [openSingleDisb, setOpenSingleDisb] = useState(false);

  // Bank reconciliation
  const treasury = computeTreasurySummary(state);
  const [bankBal, setBankBal] = useState<number>(
    treasury.systemCalculatedCashBalance
  );
  const [bankName, setBankName] = useState('Commercial Bank of Ethiopia');
  const [acctLast4, setAcctLast4] = useState('8412');
  const [reconPeriod, setReconPeriod] = useState('November 2026');
  const [reconNotes, setReconNotes] = useState('');
  const [showReconList, setShowReconList] = useState(false);

  const pendingReceipts = state.paymentReceipts.filter(
    (r) => r.status === 'pending'
  );
  const authorizedPayouts = state.disbursements.filter(
    (d) => d.status === 'authorized_for_cashier'
  );
  const variance = bankBal - treasury.systemCalculatedCashBalance;

  const searchedReceipts = state.paymentReceipts.filter((r) => {
    const q = receiptSearch.trim().toLowerCase();
    if (!q) return r.status === 'pending';
    return (
      r.memberNameAm.toLowerCase().includes(q) ||
      r.memberNameEn.toLowerCase().includes(q) ||
      r.memberCode.toLowerCase().includes(q) ||
      r.referenceNumber.toLowerCase().includes(q)
    );
  });

  const buttons: {
    id: CashierTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'verify_receipts',
      label: getText(lang, 'ደረሰኝ ማረጋገጫ', 'Verify Member Payment Receipts'),
      icon: <Receipt className="w-4 h-4" />,
      badge: pendingReceipts.length,
    },
    {
      id: 'execute_payouts',
      label: getText(lang, 'ክፍያ መፈጸም', 'Execute Authorized Disbursements'),
      icon: <Banknote className="w-4 h-4" />,
      badge: authorizedPayouts.length,
    },
    {
      id: 'bank_reconciliation',
      label: getText(lang, 'የባንክ ባላንስ ግምገማ', 'Bank Balance Reconciliation'),
      icon: <Landmark className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3 Exclusive Cashier Action Buttons */}
      <nav
        aria-label="Cashier Actions"
        className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
      >
        {buttons.map((btn) => {
          const active = tab === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => {
                setTab(btn.id);
                setFeedback('');
              }}
              className={`inline-flex items-center justify-between gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                active
                  ? 'bg-[#064E3B] text-white'
                  : 'bg-white text-[#064E3B] border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className={active ? 'text-[#F59E0B]' : 'text-[#047857]'}>
                  {btn.icon}
                </span>
                <span className="truncate">{btn.label}</span>
              </span>
              {typeof btn.badge === 'number' && btn.badge > 0 && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-mono rounded shrink-0 ${
                    active
                      ? 'bg-[#F59E0B] text-[#064E3B]'
                      : 'bg-[#F59E0B]/20 text-[#D97706]'
                  }`}
                >
                  {btn.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {feedback && (
        <div className="p-3.5 bg-[#047857]/10 border border-[#047857]/30 rounded-lg text-xs font-semibold text-[#064E3B]">
          {feedback}
        </div>
      )}

      {/* 1. VERIFY MEMBER PAYMENT RECEIPTS */}
      {tab === 'verify_receipts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ማረጋገጫ የሚጠብቁ ደረሰኞች', 'Pending Receipt Verifications')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {pendingReceipts.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የተረጋገጠ ጠቅላላ ገቢ', 'Total Verified Receipts')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {formatETB(treasury.totalVerifiedInflow, lang)}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  placeholder={getText(
                    lang,
                    'በስም፣ በመለያ ወይም በRef No. ይፈልጉ...',
                    'Search receipt by member or reference...'
                  )}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSpecialForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{getText(lang, 'ልዩ መዋጮ ክፈት', 'New Special Levy')}</span>
                </button>
                {pendingReceipts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSingleReceipt((v) => !v)}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {openSingleReceipt
                      ? getText(lang, 'ዝጋ', 'Close Item')
                      : getText(lang, 'ቀጣይ ደረሰኝ ክፈት', 'Open Next Receipt')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowReceiptsList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showReceiptsList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showReceiptsList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>
            </div>

            {showSpecialForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!spTitleAm.trim() && !spTitleEn.trim()) return;
                  onCreateSpecialContribution({
                    category: spCat,
                    titleAm: spTitleAm.trim() || spTitleEn.trim(),
                    titleEn: spTitleEn.trim() || spTitleAm.trim(),
                    amount: spAmount,
                    dueDate: spDue,
                    createdBy: currentUser.fullNameEn,
                  });
                  setSpTitleAm('');
                  setSpTitleEn('');
                  setShowSpecialForm(false);
                  setFeedback(
                    getText(
                      lang,
                      'አዲስ ልዩ መዋጮ ተለጥፏል።',
                      'Special contribution published.'
                    )
                  );
                }}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <select
                  value={spCat}
                  onChange={(e) =>
                    setSpCat(e.target.value as SpecialContribution['category'])
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="wedding">{getText(lang, 'ሰርግ', 'Wedding')}</option>
                  <option value="bereavement">{getText(lang, 'ሀዘን', 'Bereavement')}</option>
                  <option value="tents">{getText(lang, 'ድንኳን', 'Tents')}</option>
                  <option value="chairs">{getText(lang, 'ወንበር', 'Chairs')}</option>
                  <option value="other">{getText(lang, 'ሌላ', 'Other')}</option>
                </select>
                <input
                  type="text"
                  placeholder={getText(lang, 'ርዕስ (አማርኛ)', 'Title (Amharic)')}
                  value={spTitleAm}
                  onChange={(e) => setSpTitleAm(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                />
                <input
                  type="number"
                  min={10}
                  value={spAmount}
                  onChange={(e) => setSpAmount(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                />
                <input
                  type="date"
                  value={spDue}
                  onChange={(e) => setSpDue(e.target.value)}
                  className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {COPY[lang].submit}
                </button>
              </form>
            )}

            {pendingReceipts.length === 0 && (
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'ማረጋገጫ የሚጠብቅ ደረሰኝ የለም።',
                  'No pending payment receipts.'
                )}
              </p>
            )}

            {openSingleReceipt && pendingReceipts[0] && (
              <div className="p-4 border border-[#064E3B]/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#064E3B]">
                    {getText(
                      lang,
                      pendingReceipts[0].memberNameAm,
                      pendingReceipts[0].memberNameEn
                    )}{' '}
                    ({pendingReceipts[0].memberCode})
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 font-mono">
                    {formatETB(pendingReceipts[0].amount, lang)} ·{' '}
                    {pendingReceipts[0].channel} · Ref:{' '}
                    {pendingReceipts[0].referenceNumber}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onVerifyReceipt(pendingReceipts[0].id, 'verified');
                      setFeedback(
                        getText(
                          lang,
                          'ደረሰኙ ተረጋግጧል።',
                          'Payment receipt verified.'
                        )
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{getText(lang, 'አረጋግጥ', 'Verify')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onVerifyReceipt(pendingReceipts[0].id, 'rejected')
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{COPY[lang].reject}</span>
                  </button>
                </div>
              </div>
            )}

            {(showReceiptsList || receiptSearch.trim().length > 0) && (
              <div className="divide-y divide-slate-100 pt-2">
                {searchedReceipts.length === 0 ? (
                  <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
                ) : (
                  searchedReceipts.map((r) => (
                    <div
                      key={r.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {getText(lang, r.memberNameAm, r.memberNameEn)} ({r.memberCode}) ·{' '}
                          <span className="font-mono text-[#064E3B]">
                            {formatETB(r.amount, lang)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 font-mono">
                          {r.channel} · Ref: {r.referenceNumber} · {r.paymentDate} ·{' '}
                          {COPY[lang][r.status]}
                        </p>
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onVerifyReceipt(r.id, 'verified')}
                            className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {getText(lang, 'አረጋግጥ', 'Verify')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onVerifyReceipt(r.id, 'rejected')}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {COPY[lang].reject}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. EXECUTE AUTHORIZED DISBURSEMENTS */}
      {tab === 'execute_payouts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ለክፍያ ዝግጁ የሆኑ (በም/ሰብሳቢ የጸደቁ)', 'Authorized & Ready for Payout')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {authorizedPayouts.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ጠቅላላ የተከፈሉ ጥቅማጥቅሞች', 'Total Disbursed')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {formatETB(treasury.totalDisbursedOutflow, lang)}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'በም/ሰብሳቢ የተፈቀዱ ክፍያዎችን መፈጸም',
                  'Execute Authorized Benefit Payouts'
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {authorizedPayouts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSingleDisb((v) => !v)}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {openSingleDisb
                      ? getText(lang, 'ዝጋ', 'Close Item')
                      : getText(lang, 'ቀጣይ ክፍያ ክፈት', 'Open Next Payout')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDisbList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showDisbList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showDisbList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>
            </div>

            {authorizedPayouts.length === 0 && (
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'ለክፍያ የተላለፈ ጥያቄ የለም።',
                  'No authorized payouts waiting.'
                )}
              </p>
            )}

            {openSingleDisb && authorizedPayouts[0] && (
              <div className="p-4 border border-[#064E3B]/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#064E3B]">
                    {getText(
                      lang,
                      authorizedPayouts[0].memberNameAm,
                      authorizedPayouts[0].memberNameEn
                    )}{' '}
                    ·{' '}
                    <span className="font-mono">
                      {formatETB(authorizedPayouts[0].amount, lang)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {getText(
                      lang,
                      authorizedPayouts[0].reasonAm,
                      authorizedPayouts[0].reasonEn
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Payout Ref (PAY-...)"
                    value={payoutRefMap[authorizedPayouts[0].id] || ''}
                    onChange={(e) =>
                      setPayoutRefMap((p) => ({
                        ...p,
                        [authorizedPayouts[0].id]: e.target.value,
                      }))
                    }
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const ref =
                        payoutRefMap[authorizedPayouts[0].id]?.trim() ||
                        `PAY-${Date.now().toString().slice(-6)}`;
                      onExecuteDisbursement(authorizedPayouts[0].id, ref);
                      setFeedback(
                        getText(
                          lang,
                          `ክፍያ ተፈጽሟል (Ref: ${ref})።`,
                          `Payout executed (Ref: ${ref}).`
                        )
                      );
                    }}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].markPaid}
                  </button>
                </div>
              </div>
            )}

            {showDisbList && (
              <div className="divide-y divide-slate-100 pt-2">
                {authorizedPayouts.map((d) => (
                  <div
                    key={d.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, d.memberNameAm, d.memberNameEn)} ·{' '}
                        <span className="font-mono text-[#064E3B]">
                          {formatETB(d.amount, lang)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-600">
                        {getText(lang, d.reasonAm, d.reasonEn)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        placeholder="Payout Ref"
                        value={payoutRefMap[d.id] || ''}
                        onChange={(e) =>
                          setPayoutRefMap((p) => ({ ...p, [d.id]: e.target.value }))
                        }
                        className="w-32 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onExecuteDisbursement(
                            d.id,
                            payoutRefMap[d.id]?.trim() ||
                              `PAY-${Date.now().toString().slice(-6)}`
                          )
                        }
                        className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {COPY[lang].markPaid}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 3. BANK BALANCE RECONCILIATION */}
      {tab === 'bank_reconciliation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የስርዓቱ የተጣራ ካዝና', 'System Ledger Balance')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#064E3B]">
                {formatETB(treasury.systemCalculatedCashBalance, lang)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የባንክ ሂሳብ መግለጫ', 'Bank Statement Balance')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatETB(bankBal, lang)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ልዩነት (Variance)', 'Variance')}
              </p>
              <p
                className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${
                  variance === 0 ? 'text-[#047857]' : 'text-red-700'
                }`}
              >
                {formatETB(variance, lang)}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'የባንክ እና የካዝና ማስታረቂያ መመዝገቢያ', 'Log Bank Reconciliation')}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveReconciliation({
                  reconciliationDate: new Date().toISOString().slice(0, 10),
                  periodLabel: reconPeriod,
                  systemCalculatedBalance: treasury.systemCalculatedCashBalance,
                  bankStatementBalance: bankBal,
                  variance,
                  bankName,
                  accountLast4: acctLast4,
                  notes:
                    reconNotes ||
                    (variance === 0 ? 'Matched cleanly' : 'Variance logged'),
                  reconciledBy: currentUser.fullNameEn,
                });
                setReconNotes('');
                setFeedback(
                  getText(
                    lang,
                    'የባንክ ማስታረቂያው ተመዝግቧል።',
                    'Bank reconciliation saved.'
                  )
                );
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <input
                type="text"
                value={reconPeriod}
                onChange={(e) => setReconPeriod(e.target.value)}
                placeholder="Period"
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank Name"
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                maxLength={4}
                value={acctLast4}
                onChange={(e) => setAcctLast4(e.target.value)}
                placeholder="Last 4"
                className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
              <input
                type="number"
                value={bankBal}
                onChange={(e) => setBankBal(Number(e.target.value))}
                className="px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                value={reconNotes}
                onChange={(e) => setReconNotes(e.target.value)}
                placeholder={getText(lang, 'ማስታወሻ...', 'Reconciliation notes...')}
                className="sm:col-span-2 lg:col-span-3 px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {getText(lang, 'ማስታረቂያ መዝግብ', 'Save Reconciliation')}
              </button>
            </form>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowReconList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showReconList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showReconList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                    : getText(lang, 'የቀድሞ ማስታረቂያዎች ዝርዝር አሳይ', 'View Reconciliation History')}
                </span>
              </button>

              {showReconList && (
                <div className="divide-y divide-slate-100 pt-3">
                  {state.reconciliations.map((rec) => (
                    <div
                      key={rec.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {rec.periodLabel} · {rec.bankName} (••••{rec.accountLast4})
                        </p>
                        <p className="text-slate-500">{rec.notes}</p>
                      </div>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          rec.variance === 0 ? 'text-[#047857]' : 'text-red-700'
                        }`}
                      >
                        {formatETB(rec.bankStatementBalance, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
