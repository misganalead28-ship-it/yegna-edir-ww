import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ListChecks,
  Megaphone,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  CommitteeDirective,
  EdirRequest,
  EdirState,
  Language,
  MeetingSession,
  MemberRecord,
  Role,
} from '../types';
import { COPY, ROLE_LABELS, getText } from '../i18n';
import { formatWhatsAppSmsMessage } from '../utils/exportUtils';

type ChairmanTab = 'message' | 'meeting' | 'member_approval' | 'property_approval';

interface ChairmanModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onIssueDirective: (
    d: Omit<CommitteeDirective, 'id' | 'issuedAt' | 'status'>
  ) => void;
  onCreateMeeting: (
    mtg: Omit<MeetingSession, 'id' | 'qrCodeValue' | 'createdAt' | 'status'>
  ) => void;
  onCloseMeeting: (meetingId: string) => void;
  onApproveMember: (memberId: string, decision: 'approved' | 'rejected') => void;
  onAdvanceRequest: (
    reqId: string,
    nextStatus: EdirRequest['status'],
    note?: string
  ) => void;
  onResolveEmergency: (
    emgId: string,
    status: 'acknowledged' | 'resolved'
  ) => void;
}

export const ChairmanModule: React.FC<ChairmanModuleProps> = ({
  lang,
  currentUser,
  state,
  onIssueDirective,
  onCreateMeeting,
  onCloseMeeting,
  onApproveMember,
  onAdvanceRequest,
  onResolveEmergency,
}) => {
  const [tab, setTab] = useState<ChairmanTab>('message');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  // Send Message & Directive form
  const [dirTitleAm, setDirTitleAm] = useState('');
  const [dirTitleEn, setDirTitleEn] = useState('');
  const [dirBody, setDirBody] = useState('');
  const [dirTarget, setDirTarget] = useState<Role | 'all_committee'>('all_committee');
  const [showDirectivesList, setShowDirectivesList] = useState(false);

  // Call Meeting form
  const [mtgTitleAm, setMtgTitleAm] = useState('');
  const [mtgTitleEn, setMtgTitleEn] = useState('');
  const [mtgDate, setMtgDate] = useState('2026-12-06');
  const [mtgTime, setMtgTime] = useState('09:00 AM');
  const [mtgVenueAm, setMtgVenueAm] = useState('አለታ ወንዶ የወጣቶች ማዕከል');
  const [mtgVenueEn, setMtgVenueEn] = useState('Aleta Wondo Youth Center');
  const [showPastMeetings, setShowPastMeetings] = useState(false);

  // Member approvals (No unsolicited list!)
  const [memberSearch, setMemberSearch] = useState('');
  const [showMembersList, setShowMembersList] = useState(false);
  const [openSingleMember, setOpenSingleMember] = useState(false);

  // Property & Chairman approvals (No unsolicited list!)
  const [showPropertyList, setShowPropertyList] = useState(false);
  const [openSingleProperty, setOpenSingleProperty] = useState(false);

  const pendingMembers = state.members.filter(
    (m) => m.approvalStatus === 'pending_chairman'
  );
  const approvedMembersCount = state.members.filter(
    (m) => m.approvalStatus === 'approved'
  ).length;
  const activeMeeting = state.meetings.find((m) => m.status === 'active');
  const vcReviewedRequests = state.requests.filter(
    (r) => r.status === 'vice_chairman_reviewed'
  );
  const activeEmergencies = state.emergencies.filter((e) => e.status !== 'resolved');

  const searchedPendingMembers = pendingMembers.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.fullNameAm.toLowerCase().includes(q) ||
      m.fullNameEn.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q)
    );
  });

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const actionButtons: {
    id: ChairmanTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'message',
      label: getText(lang, 'መልዕክት ማስተላለፊያ', 'Send Message & Directive'),
      icon: <Megaphone className="w-4 h-4" />,
    },
    {
      id: 'meeting',
      label: getText(lang, 'ስብሰባ መጥሪያ', 'Call Meeting'),
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'member_approval',
      label: getText(lang, 'የአባልነት ጥያቄ ፍቃድ መስጫ', 'Approve Member Applications'),
      icon: <UserCheck className="w-4 h-4" />,
      badge: pendingMembers.length,
    },
    {
      id: 'property_approval',
      label: getText(
        lang,
        'የቋሚ ንብረት እና የሚመለከቱትን ማጽደቂያ',
        'Approve Property & Chairman Approvals'
      ),
      icon: <ListChecks className="w-4 h-4" />,
      badge: vcReviewedRequests.length + activeEmergencies.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Exclusive Chairman Action Buttons */}
      <nav
        aria-label="Chairman Actions"
        className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
      >
        {actionButtons.map((btn) => {
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
                <span className="truncate text-left">{btn.label}</span>
              </span>
              {typeof btn.badge === 'number' && btn.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[11px] font-mono rounded shrink-0 ${
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

      {/* 1. SEND MESSAGE & DIRECTIVE */}
      {tab === 'message' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የተላኩ የሰብሳቢ ትእዛዞች', 'Issued Directives')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#064E3B]">
                {state.directives.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'አስቸኳይ የሀዘን/ድጋፍ ጥሪዎች', 'Active Emergency Alerts')}
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#D97706]">
                {activeEmergencies.length}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(
                lang,
                'መልዕክት እና የስራ መመሪያ ማስተላለፊያ',
                'Send Official Chairman Message & Directive'
              )}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dirTitleAm.trim() && !dirTitleEn.trim()) return;
                onIssueDirective({
                  titleAm: dirTitleAm.trim() || dirTitleEn.trim(),
                  titleEn: dirTitleEn.trim() || dirTitleAm.trim(),
                  instructionAm: dirBody.trim(),
                  instructionEn: dirBody.trim(),
                  targetRole: dirTarget,
                  issuedBy: `${currentUser.fullNameEn} (Chairman)`,
                });
                setDirTitleAm('');
                setDirTitleEn('');
                setDirBody('');
                setFeedback(
                  getText(
                    lang,
                    'የዋና ሰብሳቢ መልዕክት እና መመሪያ ተላልፏል።',
                    'Chairman directive sent successfully.'
                  )
                );
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder={getText(lang, 'ርዕስ (አማርኛ)', 'Headline (Amharic)')}
                  value={dirTitleAm}
                  onChange={(e) => setDirTitleAm(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={getText(lang, 'ርዕስ (English)', 'Headline (English)')}
                  value={dirTitleEn}
                  onChange={(e) => setDirTitleEn(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
                />
                <select
                  value={dirTarget}
                  onChange={(e) =>
                    setDirTarget(e.target.value as Role | 'all_committee')
                  }
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="all_committee">
                    {getText(lang, 'ለሁሉም የኮሚቴ አባላት', 'All Executive Committee')}
                  </option>
                  <option value="vice_chairman">{ROLE_LABELS.vice_chairman[lang]}</option>
                  <option value="secretary">{ROLE_LABELS.secretary[lang]}</option>
                  <option value="cashier">{ROLE_LABELS.cashier[lang]}</option>
                  <option value="pr">{ROLE_LABELS.pr[lang]}</option>
                  <option value="committee">{ROLE_LABELS.committee[lang]}</option>
                </select>
              </div>
              <textarea
                rows={3}
                required
                placeholder={getText(lang, 'ዝርዝር መልዕክት / ትእዛዝ...', 'Message or directive details...')}
                value={dirBody}
                onChange={(e) => setDirBody(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {getText(lang, 'መልዕክት ላክ', 'Send Message')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDirectivesList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showDirectivesList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showDirectivesList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'የተላኩ መልዕክቶች ዝርዝር አሳይ', 'View Sent Directives')}
                  </span>
                </button>
              </div>
            </form>
          </section>

          {showDirectivesList && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 divide-y divide-slate-100">
              {state.directives.length === 0 ? (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              ) : (
                state.directives.map((d) => (
                  <div key={d.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-xs text-slate-500 font-mono">
                      {d.issuedAt} · {d.issuedBy}
                    </p>
                    <p className="text-sm font-bold text-[#064E3B] mt-0.5">
                      {getText(lang, d.titleAm, d.titleEn)}
                    </p>
                    <p className="text-xs text-slate-700 mt-1">
                      {getText(lang, d.instructionAm, d.instructionEn)}
                    </p>
                  </div>
                ))
              )}
            </section>
          )}
        </div>
      )}

      {/* 2. CALL MEETING (CHAIRMAN ONLY) */}
      {tab === 'meeting' && (
        <div className="space-y-6">
          {activeMeeting && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
                <QRCodeSVG
                  value={activeMeeting.qrCodeValue}
                  size={128}
                  fgColor="#064E3B"
                />
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <p className="text-xs font-bold text-[#D97706]">
                  {getText(lang, 'ንቁ የስብሰባ ጥሪ', 'Active Meeting Call')}
                </p>
                <h2 className="text-base font-bold text-[#064E3B]">
                  {getText(lang, activeMeeting.titleAm, activeMeeting.titleEn)}
                </h2>
                <p className="text-xs text-slate-600">
                  {getText(lang, activeMeeting.venueAm, activeMeeting.venueEn)} ·{' '}
                  <span className="font-mono">
                    {activeMeeting.date} {activeMeeting.time}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        'mtg-call',
                        formatWhatsAppSmsMessage('meeting', lang, {
                          meetingTitle: getText(
                            lang,
                            activeMeeting.titleAm,
                            activeMeeting.titleEn
                          ),
                          meetingDate: activeMeeting.date,
                          meetingTime: activeMeeting.time,
                          venue: getText(
                            lang,
                            activeMeeting.venueAm,
                            activeMeeting.venueEn
                          ),
                        })
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>
                      {copiedId === 'mtg-call'
                        ? COPY[lang].copied
                        : getText(lang, 'የስብሰባ ጥሪ መልዕክት ቅዳ', 'Copy Meeting Call')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCloseMeeting(activeMeeting.id);
                      setFeedback(
                        getText(lang, 'ስብሰባው ተዘግቷል።', 'Active meeting closed.')
                      );
                    }}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {getText(lang, 'ስብሰባውን ዝጋ', 'Close Meeting')}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'አዲስ ስብሰባ መጥሪያ (ዋና ሰብሳቢ ብቻ)', 'Call New Meeting (Chairman Only)')}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!mtgTitleAm.trim() && !mtgTitleEn.trim()) return;
                onCreateMeeting({
                  titleAm: mtgTitleAm.trim() || mtgTitleEn.trim(),
                  titleEn: mtgTitleEn.trim() || mtgTitleAm.trim(),
                  date: mtgDate,
                  time: mtgTime,
                  venueAm: mtgVenueAm,
                  venueEn: mtgVenueEn,
                  createdBy: currentUser.fullNameEn,
                });
                setMtgTitleAm('');
                setMtgTitleEn('');
                setFeedback(
                  getText(
                    lang,
                    'አዲስ ስብሰባ ተጠርቷል እና የQR ኮድ ተዘጋጅቷል።',
                    'Meeting call issued and attendance QR generated.'
                  )
                );
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder={getText(lang, 'የስብሰባ ርዕስ (አማርኛ)', 'Meeting Title (Amharic)')}
                  value={mtgTitleAm}
                  onChange={(e) => setMtgTitleAm(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={getText(lang, 'የስብሰባ ርዕስ (English)', 'Meeting Title (English)')}
                  value={mtgTitleEn}
                  onChange={(e) => setMtgTitleEn(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="date"
                  value={mtgDate}
                  onChange={(e) => setMtgDate(e.target.value)}
                  className="px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={mtgTime}
                  onChange={(e) => setMtgTime(e.target.value)}
                  className="px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={lang === 'am' ? mtgVenueAm : mtgVenueEn}
                  onChange={(e) => {
                    setMtgVenueAm(e.target.value);
                    setMtgVenueEn(e.target.value);
                  }}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {getText(lang, 'ስብሰባ ጥራ እና ለአባላት አሳውቅ', 'Issue Meeting Call')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPastMeetings((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showPastMeetings ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showPastMeetings
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'የስብሰባዎች ዝርዝር አሳይ', 'View Meetings List')}
                  </span>
                </button>
              </div>
            </form>
          </section>

          {showPastMeetings && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 divide-y divide-slate-100">
              {state.meetings.map((m) => (
                <div
                  key={m.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {getText(lang, m.titleAm, m.titleEn)}
                    </p>
                    <p className="text-slate-500 font-mono">
                      {m.date} · {m.time} · {getText(lang, m.venueAm, m.venueEn)}
                    </p>
                  </div>
                  <span
                    className={`font-bold ${
                      m.status === 'active' ? 'text-[#047857]' : 'text-slate-500'
                    }`}
                  >
                    {m.status === 'active'
                      ? getText(lang, 'ንቁ', 'Active')
                      : getText(lang, 'የተዘጋ', 'Closed')}
                  </span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {/* 3. APPROVE MEMBER APPLICATIONS (NO UNSOLICITED LIST) */}
      {tab === 'member_approval' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ማጽደቂያ የሚጠብቁ አመልካቾች', 'Pending Applications')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {pendingMembers.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የጸደቁ ንቁ አባላት', 'Approved Members')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {approvedMembersCount}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={getText(
                    lang,
                    'በስም ወይም በመለያ ይፈልጉ...',
                    'Search applicant by name or ID...'
                  )}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSingleMember((v) => !v)}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {openSingleMember
                      ? getText(lang, 'ማመልከቻውን ደብቅ', 'Close Item')
                      : getText(lang, 'ቀጣይ ማመልከቻ ክፈት', 'Open Next Application')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowMembersList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showMembersList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showMembersList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>
            </div>

            {pendingMembers.length === 0 && (
              <p className="text-xs text-slate-500 pt-2">
                {getText(
                  lang,
                  'ማጽደቂያ የሚጠብቅ አዲስ አባል የለም።',
                  'No pending member applications.'
                )}
              </p>
            )}

            {/* Single-item review */}
            {openSingleMember && pendingMembers[0] && (
              <div className="p-4 border border-[#064E3B]/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#064E3B]">
                    {getText(
                      lang,
                      pendingMembers[0].fullNameAm,
                      pendingMembers[0].fullNameEn
                    )}{' '}
                    ({pendingMembers[0].memberCode})
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {getText(
                      lang,
                      pendingMembers[0].residenceCityAm,
                      pendingMembers[0].residenceCityEn
                    )}{' '}
                    · {pendingMembers[0].phone} ·{' '}
                    {getText(lang, 'መዝጋቢ:', 'Registered by:')}{' '}
                    {pendingMembers[0].registeredBy}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onApproveMember(pendingMembers[0].id, 'approved');
                      setFeedback(
                        getText(
                          lang,
                          `${pendingMembers[0].fullNameAm} ጸድቋል።`,
                          `Approved ${pendingMembers[0].fullNameEn}.`
                        )
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{COPY[lang].approve}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onApproveMember(pendingMembers[0].id, 'rejected')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{COPY[lang].reject}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Explicit list only when clicked or searched */}
            {(showMembersList || memberSearch.trim().length > 0) && (
              <div className="divide-y divide-slate-100 pt-2">
                {searchedPendingMembers.length === 0 ? (
                  <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
                ) : (
                  searchedPendingMembers.map((m) => (
                    <div
                      key={m.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {getText(lang, m.fullNameAm, m.fullNameEn)} ({m.memberCode})
                        </p>
                        <p className="text-xs text-slate-600">
                          {getText(lang, m.residenceCityAm, m.residenceCityEn)} ·{' '}
                          {m.phone}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApproveMember(m.id, 'approved')}
                          className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {COPY[lang].approve}
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveMember(m.id, 'rejected')}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {COPY[lang].reject}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 4. APPROVE PROPERTY & CHAIRMAN APPROVALS */}
      {tab === 'property_approval' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'በምክትል ሰብሳቢ የተላኩ የንብረት ጥያቄዎች',
                  'Property Requests Awaiting Final Approval'
                )}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {vcReviewedRequests.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'አስቸኳይ የሀዘን/ድጋፍ ጥሪዎች', 'Active Emergency Alerts')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {activeEmergencies.length}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'የዋና ሰብሳቢ የመጨረሻ ማጽደቂያ',
                  'Chairman Final Approvals'
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {(vcReviewedRequests.length > 0 || activeEmergencies.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setOpenSingleProperty((v) => !v)}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {openSingleProperty
                      ? getText(lang, 'ዝጋ', 'Close Item')
                      : getText(lang, 'ቀጣይ ጥያቄ ክፈት', 'Open Next Item')}
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

            {vcReviewedRequests.length === 0 && activeEmergencies.length === 0 && (
              <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
            )}

            {openSingleProperty && vcReviewedRequests[0] && (
              <div className="p-4 border border-[#064E3B]/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {getText(
                      lang,
                      vcReviewedRequests[0].subjectAm,
                      vcReviewedRequests[0].subjectEn
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {getText(
                      lang,
                      vcReviewedRequests[0].memberNameAm,
                      vcReviewedRequests[0].memberNameEn
                    )}{' '}
                    ({vcReviewedRequests[0].memberCode}) ·{' '}
                    {vcReviewedRequests[0].neededFrom || vcReviewedRequests[0].createdAt}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onAdvanceRequest(vcReviewedRequests[0].id, 'chairman_approved')
                    }
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].approve}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onAdvanceRequest(vcReviewedRequests[0].id, 'rejected')
                    }
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {COPY[lang].reject}
                  </button>
                </div>
              </div>
            )}

            {openSingleProperty && !vcReviewedRequests[0] && activeEmergencies[0] && (
              <div className="p-4 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {getText(
                      lang,
                      activeEmergencies[0].memberNameAm,
                      activeEmergencies[0].memberNameEn
                    )}{' '}
                    · <span className="text-red-700">{activeEmergencies[0].relationAffected}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeEmergencies[0].location} — {activeEmergencies[0].message}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {activeEmergencies[0].status === 'active' && (
                    <button
                      type="button"
                      onClick={() =>
                        onResolveEmergency(activeEmergencies[0].id, 'acknowledged')
                      }
                      className="px-3.5 py-2 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      {getText(lang, 'ተቀብያለሁ', 'Acknowledge')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onResolveEmergency(activeEmergencies[0].id, 'resolved')
                    }
                    className="px-3.5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {getText(lang, 'ተፈጽሟል', 'Resolve')}
                  </button>
                </div>
              </div>
            )}

            {showPropertyList && (
              <div className="divide-y divide-slate-100 pt-2">
                {vcReviewedRequests.map((req) => (
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
                        onClick={() => onAdvanceRequest(req.id, 'chairman_approved')}
                        className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {COPY[lang].approve}
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
                {activeEmergencies.map((em) => (
                  <div
                    key={em.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, em.memberNameAm, em.memberNameEn)} ·{' '}
                        <span className="text-red-700">{em.relationAffected}</span>
                      </p>
                      <p className="text-xs text-slate-600">
                        {em.location} — {em.message}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {em.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => onResolveEmergency(em.id, 'acknowledged')}
                          className="px-3 py-1.5 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {getText(lang, 'ተቀብያለሁ', 'Acknowledge')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onResolveEmergency(em.id, 'resolved')}
                        className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {getText(lang, 'ተፈጽሟል', 'Resolve')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
