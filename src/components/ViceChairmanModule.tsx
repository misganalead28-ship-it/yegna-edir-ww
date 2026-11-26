import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Eye,
  EyeOff,
  FileBarChart2,
  Package,
  Plus,
  Receipt,
  Search,
  XCircle,
} from 'lucide-react';
import {
  DisbursementRequest,
  EdirRequest,
  EdirState,
  Language,
  MemberRecord,
} from '../types';
import { COPY, formatETB, formatMonthLabel, getText } from '../i18n';
import { computeMemberFinancials, computeTreasurySummary } from '../utils/billing';
import { ReportGeneratorView } from './ReportGeneratorView';

type ViceChairmanTab =
  | 'authorize_payments'
  | 'verify_member_receipts'
  | 'review_property'
  | 'lov_reports';

interface ViceChairmanModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onCreateDisbursement: (
    req: Omit<DisbursementRequest, 'id' | 'status' | 'createdAt'>
  ) => void;
  onAuthorizeDisbursement: (
    disbId: string,
    decision: 'authorized_for_cashier' | 'rejected'
  ) => void;
  onVerifyMemberReceipt: (
    receiptId: string,
    decision: 'verified' | 'rejected',
    note?: string
  ) => void;
  onAdvanceRequest: (
    reqId: string,
    nextStatus: EdirRequest['status'],
    note?: string
  ) => void;
}

export const ViceChairmanModule: React.FC<ViceChairmanModuleProps> = ({
  lang,
  state,
  onCreateDisbursement,
  onAuthorizeDisbursement,
  onVerifyMemberReceipt,
  onAdvanceRequest,
}) => {
  const [tab, setTab] = useState<ViceChairmanTab>('authorize_payments');
  const [showPaymentsList, setShowPaymentsList] = useState(false);
  const [openSinglePayment, setOpenSinglePayment] = useState(false);
  const [showCreatePaymentForm, setShowCreatePaymentForm] = useState(false);

  const [showPropertyList, setShowPropertyList] = useState(false);
  const [openSingleProperty, setOpenSingleProperty] = useState(false);

  // Member receipts verification state (Hide lists until requested)
  const [receiptSearch, setReceiptSearch] = useState('');
  const [showReceiptsList, setShowReceiptsList] = useState(false);
  const [openSingleReceipt, setOpenSingleReceipt] = useState(false);

  // Create disbursement request state
  const [disbMemberId, setDisbMemberId] = useState(state.members[0]?.id || '');
  const [disbRuleId, setDisbRuleId] = useState(state.benefitRules[0]?.id || '');
  const [disbReason, setDisbReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const treasury = computeTreasurySummary(state);

  const pendingPayments = state.disbursements.filter(
    (d) => d.status === 'pending_vice_chairman'
  );
  const authorizedPaymentsCount = state.disbursements.filter(
    (d) => d.status === 'authorized_for_cashier'
  ).length;
  const pendingReceipts = state.paymentReceipts.filter(
    (r) => r.status === 'pending'
  );
  const searchedReceipts = state.paymentReceipts.filter((r) => {
    const q = receiptSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      r.memberNameAm.toLowerCase().includes(q) ||
      r.memberNameEn.toLowerCase().includes(q) ||
      r.memberCode.toLowerCase().includes(q) ||
      r.referenceNumber.toLowerCase().includes(q)
    );
  });
  const submittedPropertyReqs = state.requests.filter(
    (r) => r.status === 'submitted'
  );
  const approvedMembersCount = state.members.filter(
    (m) => m.approvalStatus === 'approved'
  ).length;
  const overdueMembersCount = state.members.filter(
    (m) => computeMemberFinancials(m, state).overdueMonths.length > 0
  ).length;

  const buttons: {
    id: ViceChairmanTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'authorize_payments',
      label: getText(
        lang,
        'የክፍያ ጥያቄዎችን መፍቀድ',
        'Authorize Disbursements'
      ),
      icon: <Banknote className="w-4 h-4" />,
      badge: pendingPayments.length,
    },
    {
      id: 'verify_member_receipts',
      label: getText(
        lang,
        'የአባላት ደረሰኝ አረጋግጦ መፍቀድ',
        'Verify & Authorize Member Receipts'
      ),
      icon: <Receipt className="w-4 h-4" />,
      badge: pendingReceipts.length,
    },
    {
      id: 'review_property',
      label: getText(
        lang,
        'የንብረት ጥያቄ ተቀብሎ መላክ',
        'Review Property Requests'
      ),
      icon: <Package className="w-4 h-4" />,
      badge: submittedPropertyReqs.length,
    },
    {
      id: 'lov_reports',
      label: getText(
        lang,
        'የክፍያ ሁኔታ እና የአባላት አቋም (LOV)',
        'Payment & Member Status (LOV)'
      ),
      icon: <FileBarChart2 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Vice Chairman Action Buttons */}
      <nav
        aria-label="Vice Chairman Actions"
        className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 no-print"
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
              className={`inline-flex items-center justify-between gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
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

      {/* 1. AUTHORIZE PAYMENT REQUESTS TO CASHIER */}
      {tab === 'authorize_payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የም/ሰብሳቢ ፈቃድ የሚጠብቁ ክፍያዎች', 'Pending Payment Requests')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {pendingPayments.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ለገንዘብ ያዥ የተፈቀዱ ክፍያዎች', 'Authorized for Cashier')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {authorizedPaymentsCount}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'የጥቅማጥቅም ክፍያ ጥያቄዎችን መፍቀድ',
                  'Authorize Benefit Payments for Cashier'
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePaymentForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{getText(lang, 'አዲስ የክፍያ ጥያቄ', 'New Payment Request')}</span>
                </button>
                {pendingPayments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSinglePayment((v) => !v)}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {openSinglePayment
                      ? getText(lang, 'ዝጋ', 'Close Item')
                      : getText(lang, 'ቀጣይ ጥያቄ ክፈት', 'Open Next Request')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPaymentsList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showPaymentsList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showPaymentsList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>
            </div>

            {showCreatePaymentForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const mem = state.members.find((m) => m.id === disbMemberId);
                  const rule = state.benefitRules.find((b) => b.id === disbRuleId);
                  if (!mem || !rule) return;
                  onCreateDisbursement({
                    memberId: mem.id,
                    memberNameAm: mem.fullNameAm,
                    memberNameEn: mem.fullNameEn,
                    benefitType: rule.categoryEn,
                    reasonAm: disbReason || rule.categoryAm,
                    reasonEn: disbReason || rule.categoryEn,
                    amount: rule.amount,
                  });
                  setDisbReason('');
                  setShowCreatePaymentForm(false);
                  setFeedback(
                    getText(
                      lang,
                      'አዲስ የክፍያ ጥያቄ ተመዝግቧል።',
                      'New disbursement request created.'
                    )
                  );
                }}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <select
                  value={disbMemberId}
                  onChange={(e) => setDisbMemberId(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  {state.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {getText(lang, m.fullNameAm, m.fullNameEn)} ({m.memberCode})
                    </option>
                  ))}
                </select>
                <select
                  value={disbRuleId}
                  onChange={(e) => setDisbRuleId(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  {state.benefitRules.map((b) => (
                    <option key={b.id} value={b.id}>
                      {getText(lang, b.categoryAm, b.categoryEn)} ({formatETB(b.amount, lang)})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={getText(lang, 'ምክንያት / ማብራሪያ...', 'Reason / Notes...')}
                  value={disbReason}
                  onChange={(e) => setDisbReason(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {COPY[lang].submit}
                </button>
              </form>
            )}

            {pendingPayments.length === 0 && (
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'ፍቃድ የሚጠብቅ የክፍያ ጥያቄ የለም።',
                  'No payment requests awaiting authorization.'
                )}
              </p>
            )}

            {openSinglePayment && pendingPayments[0] && (
              <div className="p-4 border border-[#064E3B]/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#064E3B]">
                    {getText(
                      lang,
                      pendingPayments[0].memberNameAm,
                      pendingPayments[0].memberNameEn
                    )}{' '}
                    ·{' '}
                    <span className="font-mono">
                      {formatETB(pendingPayments[0].amount, lang)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {getText(
                      lang,
                      pendingPayments[0].reasonAm,
                      pendingPayments[0].reasonEn
                    )}{' '}
                    · {pendingPayments[0].createdAt}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onAuthorizeDisbursement(
                        pendingPayments[0].id,
                        'authorized_for_cashier'
                      );
                      setFeedback(
                        getText(
                          lang,
                          'ክፍያው ለገንዘብ ያዥ (በሀይሉ ለማ) ተፈቅዷል።',
                          'Payment authorized and forwarded to Cashier.'
                        )
                      );
                    }}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].authorizeForCashier}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onAuthorizeDisbursement(pendingPayments[0].id, 'rejected')
                    }
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].reject}
                  </button>
                </div>
              </div>
            )}

            {showPaymentsList && (
              <div className="divide-y divide-slate-100 pt-2">
                {pendingPayments.map((d) => (
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
                        {getText(lang, d.reasonAm, d.reasonEn)} · {d.createdAt}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onAuthorizeDisbursement(d.id, 'authorized_for_cashier')
                        }
                        className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {COPY[lang].authorizeForCashier}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAuthorizeDisbursement(d.id, 'rejected')}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {COPY[lang].reject}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. REVIEW PROPERTY REQUESTS & FORWARD TO CHAIRMAN */}
      {tab === 'review_property' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">
              {getText(
                lang,
                'ከአባላት የቀረቡ የንብረት ጥያቄዎች',
                'Submitted Property Requests Awaiting Review'
              )}
            </p>
            <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
              {submittedPropertyReqs.length}
            </p>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'የንብረት ጥያቄዎችን ተቀብሎ ለዋና ሰብሳቢ መላክ',
                  'Review Property Requests & Forward to Chairman'
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {submittedPropertyReqs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSingleProperty((v) => !v)}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {openSingleProperty
                      ? getText(lang, 'ዝጋ', 'Close Item')
                      : getText(lang, 'ቀጣይ ጥያቄ ክፈት', 'Open Next Request')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPropertyList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showPropertyList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showPropertyList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>
            </div>

            {submittedPropertyReqs.length === 0 && (
              <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
            )}

            {openSingleProperty && submittedPropertyReqs[0] && (
              <div className="p-4 border border-[#D97706]/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {getText(
                      lang,
                      submittedPropertyReqs[0].subjectAm,
                      submittedPropertyReqs[0].subjectEn
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {getText(
                      lang,
                      submittedPropertyReqs[0].memberNameAm,
                      submittedPropertyReqs[0].memberNameEn
                    )}{' '}
                    ({submittedPropertyReqs[0].memberCode}) ·{' '}
                    {submittedPropertyReqs[0].createdAt}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onAdvanceRequest(
                        submittedPropertyReqs[0].id,
                        'vice_chairman_reviewed'
                      );
                      setFeedback(
                        getText(
                          lang,
                          'ጥያቄው ለዋና ሰብሳቢ (አሚን ነጋሽ) ተላልፏል።',
                          'Request forwarded to Chairman (Amin Negash).'
                        )
                      );
                    }}
                    className="px-4 py-2 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].forwardToChairman}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onAdvanceRequest(submittedPropertyReqs[0].id, 'rejected')
                    }
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].reject}
                  </button>
                </div>
              </div>
            )}

            {showPropertyList && (
              <div className="divide-y divide-slate-100 pt-2">
                {submittedPropertyReqs.map((req) => (
                  <div
                    key={req.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, req.subjectAm, req.subjectEn)}
                      </p>
                      <p className="text-xs text-slate-600">
                        {getText(lang, req.memberNameAm, req.memberNameEn)} ({req.memberCode}) ·{' '}
                        {req.createdAt}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onAdvanceRequest(req.id, 'vice_chairman_reviewed')
                        }
                        className="px-3.5 py-1.5 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {COPY[lang].forwardToChairman}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdvanceRequest(req.id, 'rejected')}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {COPY[lang].reject}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 3. VERIFY & AUTHORIZE MEMBER PAYMENT RECEIPTS */}
      {tab === 'verify_member_receipts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'ማረጋገጫ እና ፈቃድ የሚጠብቁ የአባላት ደረሰኞች',
                  'Pending Member Receipts Awaiting Authorization'
                )}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {pendingReceipts.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'ጠቅላላ የተረጋገጠ እና የተፈቀደ ገቢ',
                  'Total Verified & Authorized Receipts'
                )}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {formatETB(treasury.totalVerifiedInflow, lang)}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  placeholder={getText(
                    lang,
                    'በአባል ስም፣ መለያ ወይም Ref No. ይፈልጉ...',
                    'Search receipt by member or reference...'
                  )}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex flex-wrap gap-2">
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

            {pendingReceipts.length === 0 && (
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'ማረጋገጫ የሚጠብቅ የአባል ክፍያ ደረሰኝ የለም።',
                  'No pending member payment receipts awaiting authorization.'
                )}
              </p>
            )}

            {openSingleReceipt && pendingReceipts[0] && (
              <div className="p-5 border border-[#064E3B]/20 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#064E3B]">
                      {getText(
                        lang,
                        pendingReceipts[0].memberNameAm,
                        pendingReceipts[0].memberNameEn
                      )}{' '}
                      ({pendingReceipts[0].memberCode})
                    </p>
                    <p className="text-xs text-slate-700 font-mono tabular-nums">
                      {formatETB(pendingReceipts[0].amount, lang)} ·{' '}
                      {pendingReceipts[0].channel} · Ref:{' '}
                      {pendingReceipts[0].referenceNumber} ·{' '}
                      {pendingReceipts[0].paymentDate}
                    </p>
                    {pendingReceipts[0].targetMonths &&
                      pendingReceipts[0].targetMonths.length > 0 && (
                        <p className="text-xs text-slate-600">
                          {getText(lang, 'ወራት፡ ', 'Months: ')}
                          {pendingReceipts[0].targetMonths
                            .map((m) => formatMonthLabel(m, lang))
                            .join(', ')}
                        </p>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onVerifyMemberReceipt(pendingReceipts[0].id, 'verified');
                        setFeedback(
                          getText(
                            lang,
                            'የአባሉ ክፍያ ደረሰኝ ተረጋግጦ አውቶራይዝ ተደርጓል።',
                            'Member payment receipt verified and authorized.'
                          )
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>
                        {getText(
                          lang,
                          'አረጋግጥ እና አውቶራይዝ አድርግ',
                          'Verify & Authorize'
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onVerifyMemberReceipt(pendingReceipts[0].id, 'rejected');
                        setFeedback(
                          getText(
                            lang,
                            'ደረሰኙ ውድቅ ተደርጓል።',
                            'Payment receipt rejected.'
                          )
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{COPY[lang].reject}</span>
                    </button>
                  </div>
                </div>
                {pendingReceipts[0].receiptDataUrl &&
                  pendingReceipts[0].receiptDataUrl.startsWith('data:image') && (
                    <img
                      src={pendingReceipts[0].receiptDataUrl}
                      alt={pendingReceipts[0].receiptFileName || 'Receipt'}
                      className="max-h-56 rounded-lg border border-slate-200 object-contain"
                    />
                  )}
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
                          <span className="font-mono text-[#064E3B] tabular-nums">
                            {formatETB(r.amount, lang)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 font-mono">
                          {r.channel} · Ref: {r.referenceNumber} · {r.paymentDate} ·{' '}
                          <span
                            className={
                              r.status === 'verified'
                                ? 'text-[#047857] font-bold'
                                : r.status === 'rejected'
                                ? 'text-red-700 font-bold'
                                : 'text-[#D97706] font-bold'
                            }
                          >
                            {COPY[lang][r.status]}
                          </span>
                          {r.authorizedByVc ? ` (${r.authorizedByVc})` : ''}
                        </p>
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onVerifyMemberReceipt(r.id, 'verified');
                              setFeedback(
                                getText(
                                  lang,
                                  'የአባሉ ክፍያ ደረሰኝ ተረጋግጦ አውቶራይዝ ተደርጓል።',
                                  'Member payment receipt verified and authorized.'
                                )
                              );
                            }}
                            className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {getText(lang, 'አረጋግጥ እና ፍቀድ', 'Verify & Authorize')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onVerifyMemberReceipt(r.id, 'rejected')}
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

      {/* 4. PAYMENT STATUS & MEMBER STANDING REPORTS (LIST OF VALUES / LOV) */}
      {tab === 'lov_reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ንቁ አባላት', 'Approved Members')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#064E3B]">
                {approvedMembersCount}
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
                {getText(lang, 'የተጣራ ካዝና / ባንክ ሚዛን', 'Net Treasury Balance')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#047857]">
                {formatETB(treasury.systemCalculatedCashBalance, lang)}
              </p>
            </div>
          </div>

          <ReportGeneratorView
            lang={lang}
            state={state}
            defaultReport="monthly_dues_arrears"
            requireExplicitLoad
          />
        </div>
      )}
    </div>
  );
};
