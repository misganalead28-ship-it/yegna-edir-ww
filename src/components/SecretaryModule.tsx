import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  QrCode,
  Search,
  UserPlus,
} from 'lucide-react';
import {
  DocumentArchiveItem,
  EdirState,
  Language,
  MemberRecord,
  ResidenceZone,
} from '../types';
import { COPY, ROLE_LABELS, getText } from '../i18n';
import { DEFAULT_TEMP_PASSWORD } from '../utils/password';
import { uploadFileToStorage } from '../services/edirStore';
import { DigitalIdCard, QrAttendanceScanner } from './DigitalIdAndScanner';

type SecretaryTab = 'register_member' | 'qr_attendance' | 'minutes_archive';

interface SecretaryModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onRegisterMember: (
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
  ) => MemberRecord;
  onImportLegacyMembers: (
    rows: {
      fullNameAm: string;
      fullNameEn: string;
      phone: string;
      email: string;
      residenceZone: ResidenceZone;
      residenceCityAm: string;
      residenceCityEn: string;
    }[]
  ) => MemberRecord[];
  onUpdatePhoto: (memberId: string, photoUrl: string) => void;
  onMarkAttendance: (
    meetingId: string,
    memberId: string,
    status: 'present' | 'absent'
  ) => void;
  onScanAttendance: (
    scannedValue: string
  ) => { ok: boolean; messageAm: string; messageEn: string };
  onUploadDocument: (
    docItem: Omit<DocumentArchiveItem, 'id' | 'uploadedAt'>
  ) => void;
}

export const SecretaryModule: React.FC<SecretaryModuleProps> = ({
  lang,
  currentUser,
  state,
  onRegisterMember,
  onImportLegacyMembers,
  onUpdatePhoto,
  onMarkAttendance,
  onScanAttendance,
  onUploadDocument,
}) => {
  const [tab, setTab] = useState<SecretaryTab>('register_member');

  // Register member state
  const [regNameAm, setRegNameAm] = useState('');
  const [regNameEn, setRegNameEn] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regZone, setRegZone] = useState<ResidenceZone>('aleta_wondo');
  const [regCityAm, setRegCityAm] = useState('አለታ ወንዶ');
  const [regCityEn, setRegCityEn] = useState('Aleta Wondo');
  const [regKebele, setRegKebele] = useState('ቀበሌ 01');
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    memberCode: string;
    phone: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Member lookup (no unsolicited list!)
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);
  const [selectedIdMember, setSelectedIdMember] = useState<MemberRecord | null>(null);

  // Attendance roll call (no unsolicited list!)
  const [attSearch, setAttSearch] = useState('');
  const [showRollCallList, setShowRollCallList] = useState(false);

  // Minutes & archive (no unsolicited list!)
  const [docTitleAm, setDocTitleAm] = useState('');
  const [docTitleEn, setDocTitleEn] = useState('');
  const [docType, setDocType] =
    useState<DocumentArchiveItem['docType']>('minutes');
  const [docYear, setDocYear] = useState('2026');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewText, setDocPreviewText] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [showArchiveList, setShowArchiveList] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocumentArchiveItem | null>(null);
  const [feedback, setFeedback] = useState('');

  const activeMeeting =
    state.meetings.find((m) => m.status === 'active') || state.meetings[0];
  const approvedMembers = state.members.filter(
    (m) => m.approvalStatus === 'approved'
  );
  const localMembers = approvedMembers.filter(
    (m) => m.residenceZone === 'aleta_wondo'
  );
  const exemptMembers = approvedMembers.filter(
    (m) => m.residenceZone === 'outside'
  );
  const pendingApprovalCount = state.members.filter(
    (m) => m.approvalStatus === 'pending_chairman'
  ).length;

  const filteredMembers = state.members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.fullNameAm.toLowerCase().includes(q) ||
      m.fullNameEn.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q)
    );
  });

  const filteredLocalRollCall = localMembers.filter((m) => {
    const q = attSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.fullNameAm.toLowerCase().includes(q) ||
      m.fullNameEn.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q)
    );
  });

  const filteredDocs = state.documents.filter((d) => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.titleAm.toLowerCase().includes(q) ||
      d.titleEn.toLowerCase().includes(q) ||
      d.fileName.toLowerCase().includes(q)
    );
  });

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    const parsed = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const zone: ResidenceZone =
        (cols[4] || '').toLowerCase().includes('out') ||
        (cols[4] || '').includes('ውጪ')
          ? 'outside'
          : 'aleta_wondo';
      return {
        fullNameAm: cols[0] || cols[1] || 'አዲስ አባል',
        fullNameEn: cols[1] || cols[0] || 'Imported Member',
        phone: cols[2] || '+251900000000',
        email: cols[3] || `member.${Date.now()}@aletawondoedir.org`,
        residenceZone: zone,
        residenceCityAm:
          cols[5] || (zone === 'aleta_wondo' ? 'አለታ ወንዶ' : 'ውጪ'),
        residenceCityEn:
          cols[5] || (zone === 'aleta_wondo' ? 'Aleta Wondo' : 'Outside'),
      };
    });
    const imported = onImportLegacyMembers(parsed);
    setFeedback(
      getText(
        lang,
        `${imported.length} አባላት ከCSV ተመዝግበው ወደ ዋና ሰብሳቢ ተልከዋል።`,
        `Imported ${imported.length} members from CSV and sent for Chairman approval.`
      )
    );
    e.target.value = '';
  };

  const downloadDoc = (docItem: DocumentArchiveItem) => {
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

  const buttons: { id: SecretaryTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'register_member',
      label: getText(
        lang,
        'አዲስ አባል መመዝገብ',
        'Register New Member & Send for Approval'
      ),
      icon: <UserPlus className="w-4 h-4" />,
    },
    {
      id: 'qr_attendance',
      label: getText(
        lang,
        'QR አቴንዳንስ መቀበያ',
        'Meeting QR Attendance'
      ),
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'minutes_archive',
      label: getText(
        lang,
        'ቃለ ጉባኤ እና መዛግብት',
        'Minutes & Record Archive/Import'
      ),
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3 Exclusive Secretary Action Buttons */}
      <nav
        aria-label="Secretary Actions"
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
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
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

      {feedback && (
        <div className="p-3.5 bg-[#047857]/10 border border-[#047857]/30 rounded-lg text-xs font-semibold text-[#064E3B]">
          {feedback}
        </div>
      )}

      {/* 1. REGISTER NEW MEMBER & SEND FOR APPROVAL */}
      {tab === 'register_member' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ጠቅላላ የተመዘገቡ አባላት', 'Total Registered Members')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {state.members.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የዋና ሰብሳቢ ፍቃድ የሚጠብቁ', 'Pending Chairman Approval')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {pendingApprovalCount}
              </p>
            </div>
          </div>

          {createdCredentials && (
            <section className="bg-white border-2 border-[#D97706] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#D97706]">
                  {getText(
                    lang,
                    'አባሉ ተመዝግቦ ለዋና ሰብሳቢ ተልኳል (ጊዜያዊ የይለፍ ቃል ተሰጥቷል — ምንም ኢሜይል አልተላከም)',
                    'Member Registered & Sent to Chairman (Silent Temp Password Assigned — Zero Emails)'
                  )}
                </p>
                <p className="text-sm font-bold text-[#064E3B]">
                  {createdCredentials.name} ({createdCredentials.memberCode})
                </p>
                <p className="text-xs font-mono text-slate-700">
                  ID: {createdCredentials.memberCode} · {createdCredentials.phone} ·{' '}
                  {getText(lang, 'ጊዜያዊ ቃል:', 'Temp Pass:')}{' '}
                  <strong>{createdCredentials.tempPassword}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const txt = `Aleta Wondo Edir Account\nName: ${createdCredentials.name}\nMember ID: ${createdCredentials.memberCode}\nPhone: ${createdCredentials.phone}\nEmail: ${createdCredentials.email}\nDefault Password: ${createdCredentials.tempPassword}`;
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

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'አዲስ አባል መመዝገቢያ (ለዋና ሰብሳቢ ማጽደቂያ)',
                  'Register New Member & Send for Chairman Approval'
                )}
              </h2>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer">
                <span>{getText(lang, 'CSV ፋይል አስገባ', 'Import CSV')}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvImport}
                  className="hidden"
                />
              </label>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!regNameAm.trim() && !regNameEn.trim()) return;
                const created = onRegisterMember({
                  fullNameAm: regNameAm.trim() || regNameEn.trim(),
                  fullNameEn: regNameEn.trim() || regNameAm.trim(),
                  phone: regPhone.trim() || '+251900000000',
                  email:
                    regEmail.trim() ||
                    `member.${Date.now()}@aletawondoedir.org`,
                  role: 'member',
                  residenceZone: regZone,
                  residenceCityAm: regCityAm.trim(),
                  residenceCityEn: regCityEn.trim(),
                  kebele: regKebele.trim(),
                  familyMembers: [],
                });
                setCreatedCredentials({
                  name: getText(lang, created.fullNameAm, created.fullNameEn),
                  memberCode: created.memberCode,
                  phone: created.phone,
                  email: created.email,
                  tempPassword: created.defaultTempPassword || DEFAULT_TEMP_PASSWORD,
                });
                setCopiedCreds(false);
                setRegNameAm('');
                setRegNameEn('');
                setRegPhone('');
                setRegEmail('');
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <input
                type="text"
                required
                placeholder={getText(lang, 'ሙሉ ስም (አማርኛ)', 'Full Name (Amharic)')}
                value={regNameAm}
                onChange={(e) => setRegNameAm(e.target.value)}
                className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder={getText(lang, 'ሙሉ ስም (English)', 'Full Name (English)')}
                value={regNameEn}
                onChange={(e) => setRegNameEn(e.target.value)}
                className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="tel"
                required
                placeholder={getText(lang, 'ስልክ ቁጥር (+251...)', 'Phone Number')}
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
              <input
                type="email"
                placeholder={getText(lang, 'ኢሜይል (ካለ)', 'Email (optional)')}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
              />
              <select
                value={regZone}
                onChange={(e) => {
                  const z = e.target.value as ResidenceZone;
                  setRegZone(z);
                  if (z === 'aleta_wondo') {
                    setRegCityAm('አለታ ወንዶ');
                    setRegCityEn('Aleta Wondo');
                  } else {
                    setRegCityAm('ሀዋሳ / አዲስ አበባ / ውጪ');
                    setRegCityEn('Outside Aleta Wondo');
                  }
                }}
                className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="aleta_wondo">{COPY[lang].aletaWondo}</option>
                <option value="outside">{COPY[lang].outsideAletaWondo}</option>
              </select>
              <input
                type="text"
                placeholder={getText(lang, 'ከተማ / ሀገር', 'City / Country')}
                value={lang === 'am' ? regCityAm : regCityEn}
                onChange={(e) => {
                  setRegCityAm(e.target.value);
                  setRegCityEn(e.target.value);
                }}
                className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder={getText(lang, 'ቀበሌ / ሰፈር', 'Kebele')}
                value={regKebele}
                onChange={(e) => setRegKebele(e.target.value)}
                className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {getText(lang, 'መዝግብ እና ለሰብሳቢ ላክ', 'Register & Send for Approval')}
              </button>
            </form>
          </section>

          {/* Search or Explicit View Member List (Hidden by Default) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={COPY[lang].searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMemberList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showMemberList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showMemberList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                    : getText(lang, 'የአባላት ዝርዝር አሳይ', 'View Member List')}
                </span>
              </button>
            </div>

            {(showMemberList || memberSearch.trim().length > 0) && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                      <th className="py-2.5 px-3">{getText(lang, 'መለያ', 'ID')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ስም', 'Name')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'መኖሪያ', 'Location')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ሁኔታ', 'Status')}</th>
                      <th className="py-2.5 px-3 text-right">{getText(lang, 'መታወቂያ', 'ID Card')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#064E3B]">
                          {m.memberCode}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {getText(lang, m.fullNameAm, m.fullNameEn)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {getText(lang, m.residenceCityAm, m.residenceCityEn)}
                        </td>
                        <td className="py-2.5 px-3">
                          {m.approvalStatus === 'approved'
                            ? COPY[lang].approved
                            : COPY[lang].pending}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedIdMember(m)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#064E3B] font-semibold rounded cursor-pointer"
                          >
                            {getText(lang, 'መታወቂያ አሳይ', 'View ID')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedIdMember && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#064E3B]">
                    {getText(lang, 'ዲጂታል መታወቂያ', 'Digital Member ID')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedIdMember(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {getText(lang, 'ዝጋ', 'Close')}
                  </button>
                </div>
                <div className="max-w-lg">
                  <DigitalIdCard
                    lang={lang}
                    member={selectedIdMember}
                    allowPhotoUpload
                    onUpdatePhoto={onUpdatePhoto}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. MEETING QR ATTENDANCE (AUTO-SKIPPING MEMBERS OUTSIDE ALETA WONDO) */}
      {tab === 'qr_attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'በአለታ ወንዶ ነዋሪዎች (ስብሰባ የሚመለከታቸው)', 'Aleta Wondo Residents (Required)')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {localMembers.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(
                  lang,
                  'ከአለታ ወንዶ ውጪ ያሉ (በራስ-ሰር ነፃ / Skipped)',
                  'Outside Aleta Wondo (Auto-Skipped / Exempt)'
                )}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {exemptMembers.length}
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <QrAttendanceScanner
              lang={lang}
              currentUser={currentUser}
              state={state}
              onScanAttendance={onScanAttendance}
            />
          </div>

          {activeMeeting && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={attSearch}
                    onChange={(e) => setAttSearch(e.target.value)}
                    placeholder={getText(
                      lang,
                      'የአለታ ወንዶ አባል ይፈልጉ...',
                      'Search local resident by name or ID...'
                    )}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowRollCallList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showRollCallList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showRollCallList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'የአቴንዳንስ ዝርዝር አሳይ', 'View Roll Call List')}
                  </span>
                </button>
              </div>

              {(showRollCallList || attSearch.trim().length > 0) && (
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                        <th className="py-2.5 px-3">{getText(lang, 'መለያ', 'ID')}</th>
                        <th className="py-2.5 px-3">{getText(lang, 'አባል', 'Member')}</th>
                        <th className="py-2.5 px-3">{getText(lang, 'ሁኔታ', 'Status')}</th>
                        <th className="py-2.5 px-3 text-right">{getText(lang, 'መመዝገቢያ', 'Mark')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLocalRollCall.map((m) => {
                        const rec = state.attendance.find(
                          (a) =>
                            a.meetingId === activeMeeting.id && a.memberId === m.id
                        );
                        return (
                          <tr key={m.id}>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#064E3B]">
                              {m.memberCode}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {getText(lang, m.fullNameAm, m.fullNameEn)}
                            </td>
                            <td className="py-2.5 px-3 font-semibold">
                              {rec?.status === 'present' ? (
                                <span className="text-[#047857]">
                                  {getText(lang, 'ተገኝቷል', 'Present')}
                                </span>
                              ) : rec?.status === 'absent' ? (
                                <span className="text-red-700">
                                  {getText(lang, 'ቀሪ', 'Absent')}
                                </span>
                              ) : (
                                <span className="text-[#D97706]">
                                  {getText(lang, 'ያልተመዘገበ', 'Unmarked')}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onMarkAttendance(activeMeeting.id, m.id, 'present')
                                  }
                                  className="px-2.5 py-1 bg-[#064E3B] hover:bg-[#047857] text-white rounded cursor-pointer font-semibold"
                                >
                                  {getText(lang, 'ተገኝቷል', 'Present')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onMarkAttendance(activeMeeting.id, m.id, 'absent')
                                  }
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded cursor-pointer font-semibold"
                                >
                                  {getText(lang, 'ቀሪ', 'Absent')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* 3. MINUTES & RECORD ARCHIVE / IMPORT */}
      {tab === 'minutes_archive' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">
              {getText(lang, 'በመዝገብ የተያዙ ቃለ ጉባኤዎችና ሰነዶች', 'Archived Minutes & Documents')}
            </p>
            <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
              {state.documents.length}
            </p>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FilePlus2 className="w-5 h-5 text-[#064E3B]" />
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'ቃለ ጉባኤ እና ሰነድ መጫኛ',
                  'Upload Meeting Minutes & Records'
                )}
              </h2>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!docTitleAm.trim() && !docTitleEn.trim()) return;
                let fileDataUrl: string | undefined;
                if (docFile) {
                  const up = await uploadFileToStorage('archives', docFile);
                  fileDataUrl = up.url;
                }
                onUploadDocument({
                  titleAm: docTitleAm.trim() || docTitleEn.trim(),
                  titleEn: docTitleEn.trim() || docTitleAm.trim(),
                  docType,
                  year: docYear,
                  fileName: docFile?.name || `${docType}_${docYear}.txt`,
                  fileSizeLabel: docFile
                    ? `${Math.max(1, Math.round(docFile.size / 1024))} KB`
                    : '12 KB',
                  fileDataUrl,
                  textPreview: docPreviewText.trim() || undefined,
                  uploadedBy: `${currentUser.fullNameEn} (${ROLE_LABELS[currentUser.role].en})`,
                });
                setDocTitleAm('');
                setDocTitleEn('');
                setDocFile(null);
                setDocPreviewText('');
                setFeedback(
                  getText(lang, 'ሰነዱ በመዝገብ ተቀምጧል።', 'Document saved to archive.')
                );
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <select
                value={docType}
                onChange={(e) =>
                  setDocType(e.target.value as DocumentArchiveItem['docType'])
                }
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="minutes">{getText(lang, 'ቃለ ጉባኤ', 'Meeting Minutes')}</option>
                <option value="financial">{getText(lang, 'የፋይናንስ መዝገብ', 'Financial Archive')}</option>
                <option value="legacy_import">{getText(lang, 'የቀድሞ መዝገብ', 'Legacy Record')}</option>
              </select>
              <input
                type="text"
                value={docYear}
                onChange={(e) => setDocYear(e.target.value)}
                placeholder="2026"
                className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder={getText(lang, 'ርዕስ (አማርኛ)', 'Title (Amharic)')}
                value={docTitleAm}
                onChange={(e) => setDocTitleAm(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder={getText(lang, 'ርዕስ (English)', 'Title (English)')}
                value={docTitleEn}
                onChange={(e) => setDocTitleEn(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <textarea
                rows={2}
                placeholder={getText(lang, 'የቃለ ጉባኤ ማጠቃለያ...', 'Minutes summary or content...')}
                value={docPreviewText}
                onChange={(e) => setDocPreviewText(e.target.value)}
                className="sm:col-span-2 px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/*"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {getText(lang, 'ሰነድ ጫን', 'Save to Archive')}
              </button>
            </form>
          </section>

          {/* Search or Explicit View Archive List (Hidden by Default) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder={getText(lang, 'ሰነድ ይፈልጉ...', 'Search archive...')}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowArchiveList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showArchiveList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showArchiveList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                    : getText(lang, 'የመዛግብት ዝርዝር አሳይ', 'View Archive List')}
                </span>
              </button>
            </div>

            {(showArchiveList || docSearch.trim().length > 0) && (
              <div className="divide-y divide-slate-100 pt-2">
                {filteredDocs.map((d) => (
                  <div
                    key={d.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, d.titleAm, d.titleEn)}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {d.year} · {d.fileSizeLabel} · {d.uploadedBy}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveDoc(d)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {getText(lang, 'ክፈት', 'Open')}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadDoc(d)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#064E3B] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{getText(lang, 'አውርድ', 'Download')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeDoc && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#064E3B]">
                    {getText(lang, activeDoc.titleAm, activeDoc.titleEn)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveDoc(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {getText(lang, 'ዝጋ', 'Close')}
                  </button>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-line">
                  {activeDoc.textPreview ||
                    getText(lang, 'ሰነዱ ለማውረድ ዝግጁ ነው።', 'Document ready for download.')}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
