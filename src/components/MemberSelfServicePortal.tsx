import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  HeartHandshake,
  IdCard,
  PhoneCall,
  Plus,
  Send,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  EdirRequest,
  EdirState,
  EmergencyAlert,
  FamilyMember,
  Language,
  MemberRecord,
  PaymentReceipt,
} from '../types';
import { COPY, ROLE_LABELS, formatETB, formatMonthLabel, getText } from '../i18n';
import { computeMemberFinancials, computeTreasurySummary } from '../utils/billing';
import { ApprovalStepper, StepItem } from './ApprovalStepper';
import { uploadFileToStorage } from '../services/edirStore';
import { DigitalIdCard, QrAttendanceScanner } from './DigitalIdAndScanner';

export type PortalTab = 'status_id' | 'pay_receipt' | 'family_requests' | 'records_alerts';

interface MemberSelfServicePortalProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onSubmitReceipt: (
    receipt: Omit<PaymentReceipt, 'id' | 'status' | 'submittedAt'>
  ) => void;
  onSubmitEmergency: (
    alert: Omit<EmergencyAlert, 'id' | 'status' | 'createdAt'>
  ) => void;
  onSubmitRequest: (
    req: Omit<EdirRequest, 'id' | 'status' | 'createdAt'>
  ) => void;
  onUpdateFamily: (memberId: string, familyMembers: FamilyMember[]) => void;
  onUpdatePhoto: (memberId: string, photoUrl: string) => void;
  onScanAttendance: (
    scannedValue: string
  ) => { ok: boolean; messageAm: string; messageEn: string };
}

export const MemberSelfServicePortal: React.FC<MemberSelfServicePortalProps> = ({
  lang,
  currentUser,
  state,
  onSubmitReceipt,
  onSubmitEmergency,
  onSubmitRequest,
  onUpdateFamily,
  onUpdatePhoto,
  onScanAttendance,
}) => {
  const [tab, setTab] = useState<PortalTab>('status_id');

  const fin = computeMemberFinancials(currentUser, state);
  const treasury = computeTreasurySummary(state);
  const activeMeeting = state.meetings.find((m) => m.status === 'active');

  // --- Payments form state ---
  const [payType, setPayType] = useState<'monthly' | 'special'>('monthly');
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const unpaid = state.billingConfig.activeBillingMonths.filter(
      (m) => !currentUser.paidMonths.includes(m)
    );
    return unpaid.slice(0, 1);
  });
  const [selectedSpecialId, setSelectedSpecialId] = useState<string>(
    fin.unpaidSpecialContributions[0]?.id || ''
  );
  const [channel, setChannel] = useState<PaymentReceipt['channel']>('CBE');
  const [refNumber, setRefNumber] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [payFeedback, setPayFeedback] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cbeAccount = state.billingConfig.cbeAccountNumber || '1000772333898';
  const cbeAccountName =
    state.billingConfig.cbeAccountName || 'Aleta Wondo Youth Mutual Aid Edir';
  const coopAccount = state.billingConfig.coopAccountNumber || '1062700129895';

  // --- Emergency form state ---
  const [emgType, setEmgType] =
    useState<EmergencyAlert['emergencyType']>('bereavement');
  const [relationAffected, setRelationAffected] = useState('');
  const [emgLocation, setEmgLocation] = useState(
    getText(lang, currentUser.residenceCityAm, currentUser.residenceCityEn)
  );
  const [emgMessage, setEmgMessage] = useState('');
  const [emgSent, setEmgSent] = useState(false);

  // --- Request form state ---
  const [reqType, setReqType] =
    useState<EdirRequest['requestType']>('property');
  const [reqAssetId, setReqAssetId] = useState(state.assets[0]?.id || '');
  const [reqQty, setReqQty] = useState(1);
  const [reqFrom, setReqFrom] = useState('2026-12-05');
  const [reqUntil, setReqUntil] = useState('2026-12-07');
  const [reqSubject, setReqSubject] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [reqSent, setReqSent] = useState(false);

  // --- Family form state ---
  const [famNameAm, setFamNameAm] = useState('');
  const [famNameEn, setFamNameEn] = useState('');
  const [famRel, setFamRel] = useState<FamilyMember['relationship']>('spouse');
  const [famAge, setFamAge] = useState(25);

  // --- On-demand visibility toggles (Hide Lists Until Requested) ---
  const [showBenefitRates, setShowBenefitRates] = useState(false);
  const [showReceiptsList, setShowReceiptsList] = useState(false);
  const [showFamilyList, setShowFamilyList] = useState(false);
  const [showRequestsList, setShowRequestsList] = useState(false);
  const [showMessagesList, setShowMessagesList] = useState(false);
  const [showDocsList, setShowDocsList] = useState(false);

  // --- Records filter ---
  const [docSearch, setDocSearch] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [previewDocId, setPreviewDocId] = useState<string | null>(
    state.documents[0]?.id || null
  );

  // Calculations for payment form
  const unpaidMonthsAll = state.billingConfig.activeBillingMonths.filter(
    (m) => !currentUser.paidMonths.includes(m)
  );
  const penaltyMonthsCount = selectedMonths.filter((m) =>
    fin.overdueMonths.includes(m)
  ).length;
  const computedPenalty = penaltyMonthsCount * state.billingConfig.latePenaltyFee;
  const selectedSpecial = state.specialContributions.find(
    (s) => s.id === selectedSpecialId
  );
  const computedPayAmount =
    payType === 'monthly'
      ? selectedMonths.length * state.billingConfig.monthlyFee + computedPenalty
      : selectedSpecial?.amount || 0;

  const handleReceiptFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const { url } = await uploadFileToStorage('receipts', file);
    setReceiptDataUrl(url);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNumber.trim()) return;
    if (payType === 'monthly' && selectedMonths.length === 0) return;
    if (payType === 'special' && !selectedSpecial) return;

    onSubmitReceipt({
      memberId: currentUser.id,
      memberCode: currentUser.memberCode,
      memberNameAm: currentUser.fullNameAm,
      memberNameEn: currentUser.fullNameEn,
      paymentType: payType,
      targetMonths: payType === 'monthly' ? selectedMonths : undefined,
      specialContributionId:
        payType === 'special' ? selectedSpecial?.id : undefined,
      amount: computedPayAmount,
      penaltyIncluded: payType === 'monthly' ? computedPenalty : 0,
      channel,
      referenceNumber: refNumber.trim(),
      paymentDate: payDate,
      receiptFileName: receiptFileName || undefined,
      receiptDataUrl: receiptDataUrl || undefined,
    });
    setRefNumber('');
    setReceiptFileName('');
    setReceiptDataUrl('');
    setPayFeedback(
      getText(
        lang,
        'የክፍያ ደረሰኝዎ በተሳካ ሁኔታ ተልኳል፤ የገንዘብ ያዥ ማረጋገጫ በመጠባበቅ ላይ ነው።',
        'Payment receipt submitted successfully. Awaiting Cashier verification.'
      )
    );
  };

  const submitEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationAffected.trim() || !emgMessage.trim()) return;
    onSubmitEmergency({
      memberId: currentUser.id,
      memberCode: currentUser.memberCode,
      memberNameAm: currentUser.fullNameAm,
      memberNameEn: currentUser.fullNameEn,
      phone: currentUser.phone,
      emergencyType: emgType,
      relationAffected: relationAffected.trim(),
      location: emgLocation.trim(),
      message: emgMessage.trim(),
    });
    setRelationAffected('');
    setEmgMessage('');
    setEmgSent(true);
  };

  const submitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = state.assets.find((a) => a.id === reqAssetId);
    const subj =
      reqSubject.trim() ||
      (reqType === 'property' && asset
        ? `${asset.nameEn} (${reqQty})`
        : getText(lang, 'አጠቃላይ ጥያቄ', 'General Request'));
    onSubmitRequest({
      memberId: currentUser.id,
      memberCode: currentUser.memberCode,
      memberNameAm: currentUser.fullNameAm,
      memberNameEn: currentUser.fullNameEn,
      requestType: reqType,
      assetId: reqType === 'property' ? asset?.id : undefined,
      assetNameAm: reqType === 'property' ? asset?.nameAm : undefined,
      assetNameEn: reqType === 'property' ? asset?.nameEn : undefined,
      quantity: reqType === 'property' ? reqQty : undefined,
      neededFrom: reqType === 'property' ? reqFrom : undefined,
      neededUntil: reqType === 'property' ? reqUntil : undefined,
      subjectAm: subj,
      subjectEn: subj,
      details: reqDetails.trim() || subj,
    });
    setReqSubject('');
    setReqDetails('');
    setReqSent(true);
  };

  const addFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!famNameAm.trim() && !famNameEn.trim()) return;
    const next: FamilyMember = {
      id: `fam-${Date.now()}`,
      fullNameAm: famNameAm.trim() || famNameEn.trim(),
      fullNameEn: famNameEn.trim() || famNameAm.trim(),
      relationship: famRel,
      age: famAge,
    };
    onUpdateFamily(currentUser.id, [...currentUser.familyMembers, next]);
    setFamNameAm('');
    setFamNameEn('');
  };

  const getRequestStepper = (req: EdirRequest): StepItem[] => {
    if (req.requestType !== 'property') {
      return [
        {
          labelAm: 'ጥያቄ ቀርቧል',
          labelEn: 'Submitted',
          actorAm: req.createdAt,
          actorEn: req.createdAt,
          state: 'completed',
        },
        {
          labelAm: 'የኮሚቴ ግምገማ',
          labelEn: 'Committee Review',
          state:
            req.status === 'submitted'
              ? 'current'
              : req.status === 'rejected'
              ? 'rejected'
              : 'completed',
        },
        {
          labelAm: 'ውሳኔ ተሰጥቷል',
          labelEn: 'Resolved',
          state:
            req.status === 'chairman_approved' || req.status === 'returned'
              ? 'completed'
              : 'upcoming',
        },
      ];
    }

    return [
      {
        labelAm: 'ጥያቄ ቀርቧል',
        labelEn: 'Submitted',
        actorAm: req.createdAt,
        actorEn: req.createdAt,
        state: 'completed',
      },
      {
        labelAm: 'ምክትል ሰብሳቢ ግምገማ',
        labelEn: 'Vice Chairman Review',
        actorAm: req.reviewedByVc || 'ሙሉቀን ዮናስ',
        actorEn: req.reviewedByVc || 'Muluken Yonas',
        state:
          req.status === 'submitted'
            ? 'current'
            : req.status === 'rejected'
            ? 'rejected'
            : 'completed',
      },
      {
        labelAm: 'ዋና ሰብሳቢ ማጽደቂያ',
        labelEn: 'Chairman Approval',
        actorAm: req.approvedByChairman || 'አሚን ነጋሽ',
        actorEn: req.approvedByChairman || 'Amin Negash',
        state:
          req.status === 'vice_chairman_reviewed'
            ? 'current'
            : req.status === 'chairman_approved' ||
              req.status === 'issued' ||
              req.status === 'returned'
            ? 'completed'
            : req.status === 'rejected'
            ? 'rejected'
            : 'upcoming',
      },
      {
        labelAm: 'ንብረት ወጪ / ተመላሽ',
        labelEn: 'Issued / Returned',
        state:
          req.status === 'issued' || req.status === 'returned'
            ? 'completed'
            : req.status === 'chairman_approved'
            ? 'current'
            : 'upcoming',
      },
    ];
  };

  const myReceipts = state.paymentReceipts.filter(
    (r) => r.memberId === currentUser.id
  );
  const myRequests = state.requests.filter((r) => r.memberId === currentUser.id);
  const filteredDocs = state.documents.filter((d) => {
    const matchesType = docFilter === 'all' || d.docType === docFilter;
    const q = docSearch.toLowerCase();
    const matchesQuery =
      !q ||
      d.titleAm.toLowerCase().includes(q) ||
      d.titleEn.toLowerCase().includes(q) ||
      d.fileName.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });
  const activeDoc =
    filteredDocs.find((d) => d.id === previewDocId) || filteredDocs[0] || null;

  const downloadDoc = (docItem: typeof activeDoc) => {
    if (!docItem) return;
    if (docItem.fileDataUrl) {
      const a = document.createElement('a');
      a.href = docItem.fileDataUrl;
      a.download = docItem.fileName;
      a.click();
      return;
    }
    const blob = new Blob([docItem.textPreview || docItem.titleEn], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docItem.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const portalButtons: { id: PortalTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'status_id',
      label: getText(lang, '1. የእኔ ሁኔታ እና መታወቂያ', '1. My Status & ID'),
      icon: <IdCard className="w-4 h-4" />,
    },
    {
      id: 'pay_receipt',
      label: getText(lang, '2. ክፍያ እና ደረሰኝ', '2. Pay & Upload Receipt'),
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'family_requests',
      label: getText(lang, '3. ቤተሰብ እና ጥያቄዎች', '3. Family & Requests'),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'records_alerts',
      label: getText(lang, '4. መዛግብት እና መልዕክቶች', '4. Records & Alerts'),
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Clean 4-Button Navigation Bar */}
      <nav
        aria-label="Member Self-Service"
        className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 no-print"
      >
        {portalButtons.map((btn) => {
          const active = tab === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setTab(btn.id)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white text-[#064E3B] border border-slate-200 hover:bg-[#064E3B]/5'
              }`}
            >
              <span className={active ? 'text-[#F59E0B]' : 'text-[#047857]'}>
                {btn.icon}
              </span>
              <span>{btn.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TAB 1: MY STATUS & DIGITAL ID */}
      {tab === 'status_id' && (
        <div className="space-y-6">
          {activeMeeting && (
            <div className="bg-[#064E3B] text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#F59E0B] font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>{getText(lang, 'ንቁ የስብሰባ ጥሪ', 'Active Meeting Call')}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{activeMeeting.date}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold">
                  {getText(lang, activeMeeting.titleAm, activeMeeting.titleEn)}
                </h2>
                <p className="text-xs text-white/85">
                  {getText(lang, activeMeeting.venueAm, activeMeeting.venueEn)} ·{' '}
                  {activeMeeting.time}
                </p>
                {currentUser.residenceZone === 'outside' && (
                  <p className="text-xs text-[#F59E0B] pt-1">
                    {getText(
                      lang,
                      'ማሳሰቢያ፡ ከአለታ ወንዶ ውጪ ስለሚኖሩ ከአካላዊ ስብሰባ ቅጣት በራስ-ሰር ነፃ ነዎት።',
                      'Note: Residing outside Aleta Wondo — automatically exempt from physical attendance.'
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTab('pay_receipt')}
                className="px-4 py-2.5 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-bold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                {getText(lang, 'ክፍያ / ደረሰኝ ይላኩ', 'Pay & Upload Receipt')}
              </button>
            </div>
          )}

          {/* 4 Personal KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">
                {getText(lang, 'የአባልነት ሁኔታ', 'Membership Status')}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {fin.standingStatus === 'overdue' ? (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#047857] shrink-0" />
                )}
                <span
                  className={`text-lg font-bold ${
                    fin.standingStatus === 'overdue'
                      ? 'text-red-700'
                      : 'text-[#064E3B]'
                  }`}
                >
                  {fin.standingStatus === 'overdue'
                    ? COPY[lang].overdue
                    : COPY[lang].active}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-mono">
                {currentUser.memberCode} · {ROLE_LABELS[currentUser.role][lang]}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">
                {getText(lang, 'ጠቅላላ የተከፈለ መዋጮ', 'Total Paid')}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#064E3B] font-mono tabular-nums">
                {formatETB(fin.totalPaidEstimated, lang)}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                {currentUser.paidMonths.length} {getText(lang, 'ወራት', 'months settled')}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">
                {getText(lang, 'ቀሪ የሚከፈል ሂሳብ', 'Balance Due')}
              </p>
              <p
                className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
                  fin.totalDue > 0 ? 'text-[#D97706]' : 'text-[#047857]'
                }`}
              >
                {formatETB(fin.totalDue, lang)}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                {fin.autoPenaltyDue > 0
                  ? getText(
                      lang,
                      `ቅጣትን ጨምሮ (${formatETB(fin.autoPenaltyDue, lang)})`,
                      `Includes ${formatETB(fin.autoPenaltyDue, lang)} penalty`
                    )
                  : getText(lang, 'ምንም ቅጣት የለም', 'Zero penalties')}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">
                {getText(lang, 'የተመዘገቡ ቤተሰቦች', 'Registered Family')}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#064E3B] font-mono tabular-nums">
                {currentUser.familyMembers.length}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                {getText(lang, currentUser.residenceCityAm, currentUser.residenceCityEn)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <DigitalIdCard
                lang={lang}
                member={currentUser}
                allowPhotoUpload
                onUpdatePhoto={onUpdatePhoto}
              />
            </div>
            <div className="lg:col-span-5">
              <QrAttendanceScanner
                lang={lang}
                currentUser={currentUser}
                state={state}
                onScanAttendance={onScanAttendance}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLEAR, EASY-TO-USE PAYMENT SCREEN */}
      {tab === 'pay_receipt' && (
        <div className="space-y-6">
          {/* 3 Large, Plain Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
              <p className="text-xs font-semibold text-slate-500">
                {getText(lang, '1. ወርሃዊ ክፍያ እና ቅጣት', '1. Monthly Due + Auto Penalty')}
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {formatETB(fin.monthlyFeeDue + fin.autoPenaltyDue, lang)}
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                {getText(
                  lang,
                  `${unpaidMonthsAll.length} ያልተከፈሉ ወራት (${formatETB(fin.monthlyFeeDue, lang)}) · ቅጣት ${formatETB(fin.autoPenaltyDue, lang)}`,
                  `${unpaidMonthsAll.length} unpaid mo (${formatETB(fin.monthlyFeeDue, lang)}) · Penalty ${formatETB(fin.autoPenaltyDue, lang)}`
                )}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
              <p className="text-xs font-semibold text-slate-500">
                {getText(
                  lang,
                  '2. ልዩ መዋጮዎች (ሰርግ፣ ሀዘን፣ ወንበር፣ ድንኳን)',
                  '2. Special Contributions (Wedding, Bereavement, Chair, Tent)'
                )}
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {formatETB(fin.specialDue, lang)}
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                {getText(
                  lang,
                  `${fin.unpaidSpecialContributions.length} ያልተከፈሉ ልዩ መዋጮዎች`,
                  `${fin.unpaidSpecialContributions.length} pending special contributions`
                )}
              </p>
            </div>

            <div className="bg-[#064E3B] text-white rounded-xl p-6 space-y-2">
              <p className="text-xs font-semibold text-[#F59E0B]">
                {getText(lang, '3. ጠቅላላ የሚከፈል', '3. Total Due')}
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums text-white">
                {formatETB(fin.totalDue, lang)}
              </p>
              <p className="text-xs text-white/80 tabular-nums">
                {fin.totalDue > 0
                  ? getText(
                      lang,
                      `ወርሃዊ ${formatETB(state.billingConfig.monthlyFee, lang)} · ቅጣት ${formatETB(state.billingConfig.latePenaltyFee, lang)}/ወር`,
                      `Monthly ${formatETB(state.billingConfig.monthlyFee, lang)} · Late penalty ${formatETB(state.billingConfig.latePenaltyFee, lang)}/mo`
                    )
                  : getText(lang, 'ሁሉም ክፍያዎች ተከፍለዋል!', 'All dues settled!')}
              </p>
            </div>
          </div>

          {/* Simple 3-Step Payment Flow: 1. Due Amount -> 2. Bank -> 3. Pay */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 mb-5 border-b border-slate-100">
              {getText(
                lang,
                'ክፍያ መፈፀሚያ — የሚከፈል መጠን፣ ባንክ እና ክፍያ',
                'Pay Dues — Due Amount, Bank & Pay'
              )}
            </h2>
            <form onSubmit={submitPayment} className="space-y-6">
              {/* 1. Due Amount */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-[#064E3B]">
                    {getText(lang, '1. የሚከፈል መጠን (Due Amount)', '1. Due Amount')}
                  </label>
                  <span className="text-sm font-bold font-mono text-[#D97706] tabular-nums">
                    {formatETB(computedPayAmount, lang)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayType('monthly')}
                    className={`px-4 py-3 text-xs sm:text-sm font-bold rounded-lg border cursor-pointer transition-colors ${
                      payType === 'monthly'
                        ? 'bg-[#064E3B] border-[#064E3B] text-white'
                        : 'bg-white border-slate-200 text-[#064E3B] hover:bg-slate-50'
                    }`}
                  >
                    {getText(lang, 'ወርሃዊ ክፍያ እና ቅጣት', 'Monthly Due & Auto Penalty')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayType('special')}
                    className={`px-4 py-3 text-xs sm:text-sm font-bold rounded-lg border cursor-pointer transition-colors ${
                      payType === 'special'
                        ? 'bg-[#064E3B] border-[#064E3B] text-white'
                        : 'bg-white border-slate-200 text-[#064E3B] hover:bg-slate-50'
                    }`}
                  >
                    {getText(
                      lang,
                      'ልዩ መዋጮ (ሰርግ፣ ሀዘን፣ ወንበር፣ ድንኳን)',
                      'Special Contribution (Wedding, Bereavement, Chair, Tent)'
                    )}
                  </button>
                </div>

                {payType === 'monthly' ? (
                  <div className="pt-1">
                    {unpaidMonthsAll.length === 0 ? (
                      <p className="text-xs text-[#047857] font-semibold">
                        {getText(lang, 'ሁሉም ወርሃዊ ክፍያዎች ተከፍለዋል!', 'All active monthly dues are settled!')}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {unpaidMonthsAll.map((m) => {
                          const checked = selectedMonths.includes(m);
                          const isOverdue = fin.overdueMonths.includes(m);
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() =>
                                setSelectedMonths((prev) =>
                                  prev.includes(m)
                                    ? prev.filter((x) => x !== m)
                                    : [...prev, m]
                                )
                              }
                              className={`px-3.5 py-2 text-xs rounded-lg border cursor-pointer font-semibold ${
                                checked
                                  ? 'bg-[#064E3B] border-[#064E3B] text-white'
                                  : isOverdue
                                  ? 'bg-red-50 border-red-200 text-red-800'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              {formatMonthLabel(m, lang)}
                              {isOverdue ? ` (+${state.billingConfig.latePenaltyFee})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    value={selectedSpecialId}
                    onChange={(e) => setSelectedSpecialId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {fin.unpaidSpecialContributions.length === 0 && (
                      <option value="">
                        {getText(lang, 'ያልተከፈለ ልዩ መዋጮ የለም', 'No unpaid special contributions')}
                      </option>
                    )}
                    {fin.unpaidSpecialContributions.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {getText(lang, sc.titleAm, sc.titleEn)} — {formatETB(sc.amount, lang)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. Bank Selection (CBE & Coop only) */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <label className="block text-xs font-bold text-[#064E3B]">
                  {getText(lang, '2. ባንክ ይምረጡ (Bank)', '2. Select Bank')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: 'CBE',
                        titleAm: 'CBE (የኢትዮጵያ ንግድ ባንክ)',
                        titleEn: 'CBE (Commercial Bank of Ethiopia)',
                        account: cbeAccount,
                      },
                      {
                        id: 'Coop',
                        titleAm: 'Coop (ኮኦፕ ባንክ)',
                        titleEn: 'Coop (Cooperative Bank of Oromia)',
                        account: coopAccount,
                      },
                    ] as const
                  ).map((bank) => {
                    const active = channel === bank.id;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setChannel(bank.id)}
                        className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#064E3B] border-[#064E3B] text-white'
                            : 'bg-white border-slate-200 text-[#064E3B] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building2
                            className={`w-5 h-5 shrink-0 ${
                              active ? 'text-[#F59E0B]' : 'text-[#047857]'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold truncate">
                              {getText(lang, bank.titleAm, bank.titleEn)}
                            </p>
                            <p
                              className={`text-xs font-mono tabular-nums ${
                                active ? 'text-[#F59E0B]' : 'text-slate-600'
                              }`}
                            >
                              {bank.account}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Bank Payment Details */}
                <div className="p-5 bg-slate-50 border border-[#064E3B]/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#064E3B]">
                      {channel === 'CBE'
                        ? getText(
                            lang,
                            'የኢትዮጵያ ንግድ ባንክ (CBE)',
                            'Commercial Bank of Ethiopia (CBE)'
                          )
                        : getText(
                            lang,
                            'ኮኦፕ ባንክ (Coop Bank)',
                            'Cooperative Bank of Oromia (Coop)'
                          )}
                    </p>
                    <p className="text-xs text-slate-600">
                      {getText(lang, 'የተቀባይ ስም፡ ', 'Account Name: ')}
                      <strong className="text-slate-900">{cbeAccountName}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-slate-600">
                        {getText(lang, 'የሂሳብ ቁጥር፡', 'Account No:')}
                      </span>
                      <code className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-sm font-mono font-bold text-[#064E3B] select-all">
                        {channel === 'CBE' ? cbeAccount : coopAccount}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            'account',
                            channel === 'CBE' ? cbeAccount : coopAccount
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-[#064E3B] rounded-md cursor-pointer"
                      >
                        {copiedKey === 'account' ? (
                          <Check className="w-3.5 h-3.5 text-[#047857]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {copiedKey === 'account'
                            ? COPY[lang].copied
                            : getText(lang, 'ቁጥር ቅዳ', 'Copy')}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyValue('amount', String(computedPayAmount))}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-[#064E3B] rounded-lg cursor-pointer"
                    >
                      {copiedKey === 'amount' ? (
                        <Check className="w-3.5 h-3.5 text-[#047857]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="font-mono tabular-nums">
                        {copiedKey === 'amount'
                          ? COPY[lang].copied
                          : formatETB(computedPayAmount, lang)}
                      </span>
                    </button>

                    <a
                      href={channel === 'CBE' ? 'tel:*889%23' : 'tel:*841%23'}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-bold rounded-lg whitespace-nowrap"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>
                        {channel === 'CBE'
                          ? getText(lang, 'በCBE (*889#) ክፈል', 'Pay via *889#')
                          : getText(lang, 'በCoop (*841#) ክፈል', 'Pay via *841#')}
                      </span>
                    </a>
                  </div>
                </div>
              </div>

              {/* 3. Pay & Confirm */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <label className="block text-xs font-bold text-[#064E3B]">
                  {getText(
                    lang,
                    '3. ክፍያ ይፈጽሙ እና ደረሰኝ ያስገቡ (Pay)',
                    '3. Pay & Submit Reference'
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {getText(lang, 'የግብይት መለያ ቁጥር (Ref No.)', 'Transaction Reference')}
                    </label>
                    <input
                      type="text"
                      required
                      value={refNumber}
                      onChange={(e) => setRefNumber(e.target.value)}
                      placeholder={channel === 'CBE' ? 'FT26...' : 'COOP...'}
                      className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {getText(lang, 'የክፍያ ቀን', 'Payment Date')}
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold text-[#064E3B] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                    <Upload className="w-4 h-4 text-[#047857]" />
                    <span>
                      {receiptFileName
                        ? receiptFileName
                        : getText(lang, 'ደረሰኝ አታች (Image / PDF)', 'Attach Receipt File')}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                  </label>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-slate-500">
                        {channel} · {getText(lang, 'የሚከፈል መጠን', 'Due Amount')}
                      </p>
                      <p className="text-lg font-bold font-mono text-[#064E3B] tabular-nums">
                        {formatETB(computedPayAmount, lang)}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={computedPayAmount <= 0}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#064E3B] hover:bg-[#047857] text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-[#F59E0B]" />
                      <span>{getText(lang, 'ክፍያ ላክ / Pay', 'Pay & Submit')}</span>
                    </button>
                  </div>
                </div>

                {payFeedback && (
                  <div className="p-3 bg-[#047857]/10 border border-[#047857]/30 rounded-lg text-xs text-[#064E3B] font-semibold">
                    {payFeedback}
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* On-Demand Action Buttons: View Benefit Payout Rates + View Submitted Receipts */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBenefitRates((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs sm:text-sm font-bold rounded-lg cursor-pointer"
            >
              {showBenefitRates ? (
                <EyeOff className="w-4 h-4 text-[#D97706]" />
              ) : (
                <Eye className="w-4 h-4 text-[#047857]" />
              )}
              <span>
                {showBenefitRates
                  ? getText(lang, 'የጥቅማጥቅም ክፍያ መጠን ደብቅ', 'Hide Benefit Payout Rates')
                  : getText(
                      lang,
                      'የጥቅማጥቅም ክፍያ መጠን ይመልከቱ',
                      'View Benefit Payout Rates'
                    )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowReceiptsList((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs sm:text-sm font-bold rounded-lg cursor-pointer"
            >
              {showReceiptsList ? (
                <EyeOff className="w-4 h-4 text-[#D97706]" />
              ) : (
                <Eye className="w-4 h-4 text-[#047857]" />
              )}
              <span>
                {showReceiptsList
                  ? getText(lang, 'የተላኩ ደረሰኞችን ደብቅ', 'Hide Submitted Receipts')
                  : getText(
                      lang,
                      `የተላኩ ደረሰኞች ዝርዝር አሳይ (${myReceipts.length})`,
                      `View Submitted Receipts (${myReceipts.length})`
                    )}
              </span>
            </button>
          </div>

          {/* On-Demand Benefit Payout Schedule (Hidden by default) */}
          {showBenefitRates && (
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-[#064E3B] pb-3 mb-4 border-b border-slate-100">
                {getText(
                  lang,
                  'ለእድሩ አባላት የሚፈፀሙ የመረዳጃ ክፍያዎች መርሃ-ግብር',
                  'Benefit Payout Schedule (Edir Entitlements)'
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                      <th className="py-2.5 px-3">{getText(lang, 'የክፍያ አይነት', 'Category')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ዝርዝር', 'Description')}</th>
                      <th className="py-2.5 px-3 text-right">{getText(lang, 'መጠን', 'Payout Amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.benefitRules.map((b) => (
                      <tr key={b.id}>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {getText(lang, b.categoryAm, b.categoryEn)}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {getText(lang, b.descriptionAm, b.descriptionEn)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#047857] tabular-nums whitespace-nowrap">
                          {formatETB(b.amount, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* On-Demand Receipt History (Hidden by default) */}
          {showReceiptsList && (
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-[#064E3B] pb-3 mb-4 border-b border-slate-100">
                {getText(lang, 'የእርስዎ የክፍያ ደረሰኞች ታሪክ', 'Your Submitted Payment Receipts')}
              </h3>
              {myReceipts.length === 0 ? (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                        <th className="py-2.5 px-3">{getText(lang, 'ቀን', 'Date')}</th>
                        <th className="py-2.5 px-3">{getText(lang, 'መንገድ / Ref', 'Channel & Ref')}</th>
                        <th className="py-2.5 px-3 text-right">{getText(lang, 'መጠን', 'Amount')}</th>
                        <th className="py-2.5 px-3 text-right">{getText(lang, 'ሁኔታ', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myReceipts.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3 font-mono tabular-nums">{r.paymentDate}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800">{r.channel}</span> ·{' '}
                            <span className="font-mono text-slate-500">{r.referenceNumber}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
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
              )}
            </section>
          )}
        </div>
      )}

      {/* TAB 3: FAMILY & REQUESTS (INCLUDES EMERGENCY BEREAVEMENT ALERT) */}
      {tab === 'family_requests' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Family Registry */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'የቤተሰብ አባላት ዝርዝር', 'Covered Family Dependents')}
              </h2>
              <form onSubmit={addFamilyMember} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder={getText(lang, 'ሙሉ ስም (አማርኛ)', 'Full Name (Amharic)')}
                  value={famNameAm}
                  onChange={(e) => setFamNameAm(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={getText(lang, 'ሙሉ ስም (English)', 'Full Name (English)')}
                  value={famNameEn}
                  onChange={(e) => setFamNameEn(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <select
                  value={famRel}
                  onChange={(e) =>
                    setFamRel(e.target.value as FamilyMember['relationship'])
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                >
                  <option value="spouse">{getText(lang, 'የትዳር አጋር', 'Spouse')}</option>
                  <option value="child">{getText(lang, 'ልጅ', 'Child')}</option>
                  <option value="parent">{getText(lang, 'ወላጅ', 'Parent')}</option>
                  <option value="sibling">{getText(lang, 'እህት / ወንድም', 'Sibling')}</option>
                  <option value="dependent">{getText(lang, 'ተረጂ', 'Dependent')}</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={famAge}
                    onChange={(e) => setFamAge(Number(e.target.value))}
                    className="w-20 px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{getText(lang, 'ጨምር', 'Add')}</span>
                  </button>
                </div>
              </form>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 tabular-nums">
                  {getText(
                    lang,
                    `የተመዘገቡ ቤተሰቦች፡ ${currentUser.familyMembers.length}`,
                    `Registered dependents: ${currentUser.familyMembers.length}`
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFamilyList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showFamilyList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showFamilyList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>

              {showFamilyList && (
                currentUser.familyMembers.length === 0 ? (
                  <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {currentUser.familyMembers.map((f) => (
                      <div key={f.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {getText(lang, f.fullNameAm, f.fullNameEn)}
                          </p>
                          <p className="text-slate-500 capitalize">
                            {f.relationship} · {getText(lang, 'ዕድሜ', 'Age')} {f.age}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateFamily(
                              currentUser.id,
                              currentUser.familyMembers.filter((x) => x.id !== f.id)
                            )
                          }
                          className="inline-flex items-center gap-1 text-red-700 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{getText(lang, 'አስወግድ', 'Remove')}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </section>

            {/* Urgent Bereavement / Emergency Alert */}
            <section className="bg-white border border-red-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-red-100">
                <HeartHandshake className="w-5 h-5 text-red-700 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-red-900">
                    {getText(lang, 'ሀዘን ሲገጥም / አስቸኳይ ማሳወቂያ', 'Urgent Bereavement / Emergency Alert')}
                  </h2>
                  <p className="text-xs text-slate-600">
                    {getText(
                      lang,
                      'ወዲያውኑ ለዋና ሰብሳቢ፣ ለምክትል ሰብሳቢ እና ለኮሚቴ ይደርሳል።',
                      'Immediately alerts Executive Committee officers.'
                    )}
                  </p>
                </div>
              </div>
              <form onSubmit={submitEmergency} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select
                    value={emgType}
                    onChange={(e) =>
                      setEmgType(e.target.value as EmergencyAlert['emergencyType'])
                    }
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="bereavement">{getText(lang, 'ሀዘን (Bereavement)', 'Bereavement')}</option>
                    <option value="medical">{getText(lang, 'አስቸኳይ ህክምና', 'Medical Emergency')}</option>
                    <option value="urgent_support">{getText(lang, 'ሌላ አስቸኳይ ድጋፍ', 'Other Support')}</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={relationAffected}
                    onChange={(e) => setRelationAffected(e.target.value)}
                    placeholder={getText(lang, 'ዝምድና (ለምሳሌ፡ አባት/እናት)', 'Affected Relative')}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={emgLocation}
                  onChange={(e) => setEmgLocation(e.target.value)}
                  placeholder={getText(lang, 'ቦታ / አድራሻ', 'Exact Location')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <textarea
                  rows={2}
                  required
                  value={emgMessage}
                  onChange={(e) => setEmgMessage(e.target.value)}
                  placeholder={getText(lang, 'ዝርዝር መልዕክት...', 'Ceremony schedule & needs...')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{getText(lang, 'አስቸኳይ ማሳወቂያ ላክ', 'Send High-Priority Alert')}</span>
                </button>
                {emgSent && (
                  <p className="text-xs text-[#047857] font-semibold">
                    {getText(lang, 'ማሳወቂያው ለኮሚቴው ተልኳል።', 'Alert dispatched to Executive Committee.')}
                  </p>
                )}
              </form>
            </section>
          </div>

          {/* Property / Support Request & Tracker */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'የድንኳን / ወንበር / ድጋፍ ጥያቄ ማቅረቢያ', 'Submit Property or Support Request')}
            </h3>
            <form onSubmit={submitRequest} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={reqType}
                  onChange={(e) =>
                    setReqType(e.target.value as EdirRequest['requestType'])
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                >
                  <option value="property">{getText(lang, 'የዕድር ንብረት (ድንኳን / ወንበር)', 'Edir Property (Tent / Chairs)')}</option>
                  <option value="support">{getText(lang, 'የገንዘብ ድጋፍ ጥያቄ', 'Financial Support')}</option>
                  <option value="inquiry">{getText(lang, 'አጠቃላይ ጥያቄ', 'General Inquiry')}</option>
                </select>
                {reqType === 'property' ? (
                  <>
                    <select
                      value={reqAssetId}
                      onChange={(e) => setReqAssetId(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    >
                      {state.assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {getText(lang, a.nameAm, a.nameEn)} ({a.availableQuantity}{' '}
                          {getText(lang, 'ዝግጁ', 'avail')})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={reqQty}
                      onChange={(e) => setReqQty(Math.max(1, Number(e.target.value)))}
                      className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                    />
                  </>
                ) : (
                  <input
                    type="text"
                    required
                    value={reqSubject}
                    onChange={(e) => setReqSubject(e.target.value)}
                    placeholder={getText(lang, 'ርዕስ', 'Subject')}
                    className="sm:col-span-2 px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                )}
              </div>
              {reqType === 'property' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={reqFrom}
                    onChange={(e) => setReqFrom(e.target.value)}
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                  <input
                    type="date"
                    value={reqUntil}
                    onChange={(e) => setReqUntil(e.target.value)}
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={reqDetails}
                  onChange={(e) => setReqDetails(e.target.value)}
                  placeholder={getText(lang, 'ዝርዝር ማብራሪያ...', 'Details / Purpose...')}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                >
                  {getText(lang, 'ጥያቄ አስገባ', 'Submit Request')}
                </button>
              </div>
              {reqSent && (
                <p className="text-xs text-[#047857] font-semibold">
                  {getText(lang, 'ጥያቄዎ ገብቷል!', 'Request submitted!')}
                </p>
              )}
            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-600 tabular-nums">
                {getText(
                  lang,
                  `የቀረቡ ጥያቄዎች፡ ${myRequests.length}`,
                  `Submitted requests: ${myRequests.length}`
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowRequestsList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showRequestsList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showRequestsList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                    : getText(lang, 'የጥያቄዎች ዝርዝር አሳይ', 'View My Requests')}
                </span>
              </button>
            </div>

            {showRequestsList && (
              myRequests.length === 0 ? (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              ) : (
                <div className="pt-2 divide-y divide-slate-200">
                  {myRequests.map((req) => (
                    <div key={req.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, req.subjectAm, req.subjectEn)}
                      </p>
                      <ApprovalStepper steps={getRequestStepper(req)} lang={lang} />
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      )}

      {/* TAB 4: RECORDS & ALERTS */}
      {tab === 'records_alerts' && (
        <div className="space-y-6">
          {/* Overall Edir Standing Summary */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 mb-4 border-b border-slate-100">
              {getText(lang, 'የዕድሩ ጠቅላላ አቋምና የግልጽነት ሪፖርት', 'Overall Edir Standing')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500">
                  {getText(lang, 'ንቁ አባላት', 'Active Members')}
                </p>
                <p className="text-xl font-bold font-mono text-[#064E3B] mt-1">
                  {state.members.filter((m) => m.approvalStatus === 'approved').length}
                </p>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500">
                  {getText(lang, 'የዕድሩ የተጣራ ካዝና / ባንክ', 'Net Edir Cash Balance')}
                </p>
                <p className="text-xl font-bold font-mono text-[#047857] mt-1">
                  {formatETB(treasury.systemCalculatedCashBalance, lang)}
                </p>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500">
                  {getText(lang, 'ጠቅላላ የንብረት ግምት', 'Asset Valuation')}
                </p>
                <p className="text-xl font-bold font-mono text-[#D97706] mt-1">
                  {formatETB(treasury.totalAssetValue, lang)}
                </p>
              </div>
            </div>
          </section>

          {/* Official Committee Messages (Hidden Until Requested) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#D97706]" />
                <div>
                  <h3 className="text-base font-bold text-[#064E3B]">
                    {getText(lang, 'ከኮሚቴ የተላኩ መልዕክቶች', 'Official Committee Messages')}
                  </h3>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {getText(
                      lang,
                      `ጠቅላላ መልዕክቶች፡ ${state.announcements.length}`,
                      `Total announcements: ${state.announcements.length}`
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMessagesList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showMessagesList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showMessagesList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide Messages')
                    : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                </span>
              </button>
            </div>

            {showMessagesList && (
              <div className="divide-y divide-slate-100 pt-2 border-t border-slate-100">
                {state.announcements.map((ann) => (
                  <article key={ann.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span
                        className={
                          ann.priority === 'urgent'
                            ? 'text-red-700 font-bold'
                            : 'text-[#047857] font-semibold'
                        }
                      >
                        {ann.priority === 'urgent'
                          ? getText(lang, 'አስቸኳይ', 'Urgent')
                          : ann.category.toUpperCase()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{ann.createdAt}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {getText(lang, ann.titleAm, ann.titleEn)}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {getText(lang, ann.bodyAm, ann.bodyEn)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Bylaws & Minutes Viewer (Search or Click View List) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#064E3B]">
                  {getText(lang, 'መተዳደሪያ ደንብ እና ቃለ ጉባኤ', 'Edir Records & Bylaws')}
                </h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  {getText(
                    lang,
                    `ጠቅላላ ሰነዶች፡ ${state.documents.length}`,
                    `Archived documents: ${state.documents.length}`
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder={getText(lang, 'ሰነድ ይፈልጉ...', 'Search documents...')}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowDocsList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showDocsList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showDocsList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide Documents')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>
            </div>

            {(showDocsList || docSearch.trim().length > 0 || docFilter !== 'all') && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-3 border-t border-slate-100">
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {['all', 'bylaws', 'minutes', 'financial'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDocFilter(t)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                          docFilter === t
                            ? 'bg-[#064E3B] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t === 'all'
                          ? getText(lang, 'ሁሉም', 'All')
                          : t === 'bylaws'
                          ? getText(lang, 'ደንብ', 'Bylaws')
                          : t === 'minutes'
                          ? getText(lang, 'ቃለ ጉባኤ', 'Minutes')
                          : getText(lang, 'ፋይናንስ', 'Financial')}
                      </button>
                    ))}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filteredDocs.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setPreviewDocId(d.id)}
                        className={`w-full text-left py-2.5 px-2 rounded-lg cursor-pointer ${
                          activeDoc?.id === d.id ? 'bg-[#064E3B]/10' : 'hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-900">
                          {getText(lang, d.titleAm, d.titleEn)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {d.year} · {d.fileSizeLabel}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  {activeDoc ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="text-base font-bold text-[#064E3B]">
                            {getText(lang, activeDoc.titleAm, activeDoc.titleEn)}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {activeDoc.fileName} · {activeDoc.uploadedAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadDoc(activeDoc)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{getText(lang, 'አውርድ', 'Download')}</span>
                        </button>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                        {activeDoc.textPreview ||
                          getText(lang, 'ፋይሉ ለማውረድ ዝግጁ ነው።', 'File ready for download.')}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
