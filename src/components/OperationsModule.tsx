import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Copy, Package, QrCode } from 'lucide-react';
import {
  EdirAsset,
  EdirRequest,
  EdirState,
  Language,
  MeetingSession,
  MemberRecord,
} from '../types';
import { COPY, formatETB, getText } from '../i18n';
import { formatWhatsAppSmsMessage } from '../utils/exportUtils';
import { QrAttendanceScanner } from './DigitalIdAndScanner';

type OperationsSubTab = 'meetings' | 'scanner' | 'property';

interface OperationsModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onCreateMeeting: (
    mtg: Omit<MeetingSession, 'id' | 'qrCodeValue' | 'createdAt' | 'status'>
  ) => void;
  onCloseMeeting: (meetingId: string) => void;
  onMarkAttendance: (
    meetingId: string,
    memberId: string,
    status: 'present' | 'absent'
  ) => void;
  onScanAttendance: (
    scannedValue: string
  ) => { ok: boolean; messageAm: string; messageEn: string };
  onAdvanceRequest: (
    reqId: string,
    nextStatus: EdirRequest['status'],
    note?: string
  ) => void;
  onAssetAction: (
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
  ) => void;
  onAddAsset: (asset: Omit<EdirAsset, 'id'>) => void;
}

export const OperationsModule: React.FC<OperationsModuleProps> = ({
  lang,
  currentUser,
  state,
  onCreateMeeting,
  onCloseMeeting,
  onMarkAttendance,
  onScanAttendance,
  onAdvanceRequest,
  onAssetAction,
  onAddAsset,
}) => {
  const [subTab, setSubTab] = useState<OperationsSubTab>('meetings');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Meeting initiation state
  const [mtgTitleAm, setMtgTitleAm] = useState('');
  const [mtgTitleEn, setMtgTitleEn] = useState('');
  const [mtgDate, setMtgDate] = useState('2026-12-06');
  const [mtgTime, setMtgTime] = useState('09:00 AM');
  const [mtgVenueAm, setMtgVenueAm] = useState('አለታ ወንዶ የወጣቶች ማዕከል');
  const [mtgVenueEn, setMtgVenueEn] = useState('Aleta Wondo Youth Center');

  // Assets check-out/in & add state
  const [assetActionId, setAssetActionId] = useState(state.assets[0]?.id || '');
  const [assetMemberId, setAssetMemberId] = useState(state.members[0]?.id || '');
  const [assetActionType, setAssetActionType] = useState<'issued' | 'returned'>(
    'issued'
  );
  const [assetQty, setAssetQty] = useState(1);
  const [assetReturnDate, setAssetReturnDate] = useState('2026-12-10');
  const [assetCondition, setAssetCondition] = useState<'good' | 'damaged'>('good');
  const [assetNotes, setAssetNotes] = useState('');
  const [newAssetNameAm, setNewAssetNameAm] = useState('');
  const [newAssetNameEn, setNewAssetNameEn] = useState('');
  const [newAssetQty, setNewAssetQty] = useState(10);
  const [newAssetVal, setNewAssetVal] = useState(1000);

  const isChairman = currentUser.role === 'chairman';
  const isViceChairman = currentUser.role === 'vice_chairman';

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

  const pendingPropertyReqs = state.requests.filter(
    (r) => r.status === 'submitted' || r.status === 'vice_chairman_reviewed'
  );
  const approvedPropertyReqs = state.requests.filter(
    (r) => r.requestType === 'property' && r.status === 'chairman_approved'
  );

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const actionTabs: {
    id: OperationsSubTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'meetings',
      label: getText(lang, 'ስብሰባ እና ቆጠራ', 'Meetings & Roll Call'),
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'scanner',
      label: getText(lang, 'የQR ስብሰባ ስካነር', 'QR Attendance Scanner'),
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'property',
      label: getText(lang, 'የዕድሩ ንብረት (ወጪ/ገቢ)', 'Property & Assets'),
      icon: <Package className="w-4 h-4" />,
      badge: pendingPropertyReqs.length + approvedPropertyReqs.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2">
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

      {/* SUB-VIEW 1: MEETINGS & ROLL CALL */}
      {subTab === 'meetings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'ንቁ ስብሰባ እና የQR ኮድ', 'Active Meeting & Session QR')}
              </h2>
              {activeMeeting ? (
                <div className="flex flex-col sm:flex-row gap-5 items-center">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
                    <QRCodeSVG
                      value={activeMeeting.qrCodeValue}
                      size={132}
                      fgColor="#064E3B"
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="text-xs font-bold text-[#D97706]">
                      {activeMeeting.status === 'active'
                        ? getText(lang, 'ንቁ ስብሰባ', 'Active Session')
                        : getText(lang, 'የተዘጋ ስብሰባ', 'Closed Session')}
                    </p>
                    <h3 className="text-base font-bold text-slate-900">
                      {getText(lang, activeMeeting.titleAm, activeMeeting.titleEn)}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {getText(lang, activeMeeting.venueAm, activeMeeting.venueEn)} ·{' '}
                      <span className="font-mono">
                        {activeMeeting.date} {activeMeeting.time}
                      </span>
                    </p>
                    {isChairman && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              'mtg-msg',
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>
                            {copiedId === 'mtg-msg'
                              ? COPY[lang].copied
                              : getText(lang, 'የስብሰባ ጥሪ ቅዳ', 'Copy Meeting Alert')}
                          </span>
                        </button>
                        {activeMeeting.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => onCloseMeeting(activeMeeting.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {getText(lang, 'ስብሰባውን ዝጋ', 'Close Meeting')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              )}
            </section>

            <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'አዲስ ስብሰባ መጥሪያ', 'Initiate New Meeting Call')}
              </h2>
              {isChairman ? (
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
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder={getText(lang, 'የስብሰባ ርዕስ (አማርኛ)', 'Meeting Title (Amharic)')}
                      value={mtgTitleAm}
                      onChange={(e) => setMtgTitleAm(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder={getText(lang, 'የስብሰባ ርዕስ (English)', 'Meeting Title (English)')}
                      value={mtgTitleEn}
                      onChange={(e) => setMtgTitleEn(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="date"
                      value={mtgDate}
                      onChange={(e) => setMtgDate(e.target.value)}
                      className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={mtgTime}
                      onChange={(e) => setMtgTime(e.target.value)}
                      className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <input
                    type="text"
                    value={lang === 'am' ? mtgVenueAm : mtgVenueEn}
                    onChange={(e) => {
                      setMtgVenueAm(e.target.value);
                      setMtgVenueEn(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {getText(lang, 'ስብሰባ ክፈት እና ለአባላት አሳውቅ', 'Initiate Meeting & Alert Members')}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
                  {getText(
                    lang,
                    'የስብሰባ ጥሪ ማስተላለፍ እና አዲስ ስብሰባ መክፈት የሚችለው ዋና ሰብሳቢ (አሚን ነጋሽ) ብቻ ነው።',
                    'Meeting call announcements and initiating new meetings are restricted exclusively to the Chairman (Amin Negash).'
                  )}
                </div>
              )}
            </section>
          </div>

          {activeMeeting && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-[#064E3B]">
                  {getText(
                    lang,
                    'የአካባቢ-ተኮር የስብሰባ ቆጠራ (አለታ ወንዶ ነዋሪዎች)',
                    'Location-Aware Attendance Roll Call (Aleta Wondo Residents)'
                  )}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {getText(
                    lang,
                    `${localMembers.length} የአለታ ወንዶ አባላት ግዴታ አለባቸው · ${exemptMembers.length} ከአለታ ወንዶ ውጪ ያሉ አባላት በራስ-ሰር ነፃ ናቸው`,
                    `${localMembers.length} Aleta Wondo residents required · ${exemptMembers.length} out-of-town members automatically exempt`
                  )}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                      <th className="py-2.5 px-3">{getText(lang, 'መለያ', 'ID')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'አባል', 'Member')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'መኖሪያ', 'Location')}</th>
                      <th className="py-2.5 px-3">{getText(lang, 'ሁኔታ', 'Status')}</th>
                      <th className="py-2.5 px-3 text-right">{getText(lang, 'መመዝገቢያ', 'Check-In')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedMembers.map((m) => {
                      const rec = state.attendance.find(
                        (a) => a.meetingId === activeMeeting.id && a.memberId === m.id
                      );
                      const isExempt = m.residenceZone === 'outside';
                      return (
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
                          <td className="py-2.5 px-3 font-semibold">
                            {isExempt ? (
                              <span className="text-slate-500">{COPY[lang].exempt}</span>
                            ) : rec?.status === 'present' ? (
                              <span className="text-[#047857]">
                                {getText(lang, 'ተገኝቷል', 'Present')} ({rec.method})
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
                            {!isExempt && (
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
        </div>
      )}

      {/* SUB-VIEW 2: QR ATTENDANCE SCANNER */}
      {subTab === 'scanner' && (
        <div className="max-w-2xl">
          <QrAttendanceScanner
            lang={lang}
            currentUser={currentUser}
            state={state}
            onScanAttendance={onScanAttendance}
          />
        </div>
      )}

      {/* SUB-VIEW 3: PROPERTY & ASSETS */}
      {subTab === 'property' && (
        <div className="space-y-6">
          {/* VC -> Chairman Property Request Approval Queue */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(
                lang,
                'የንብረት እና ድጋፍ ጥያቄዎች (ም/ሰብሳቢ ሙሉቀን → ዋና ሰብሳቢ አሚን)',
                'Property & Support Requests (VC Muluken → Chairman Amin)'
              )}
            </h2>
            {pendingPropertyReqs.length === 0 ? (
              <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingPropertyReqs.map((req) => (
                  <div
                    key={req.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                      {req.status === 'submitted' && isViceChairman && (
                        <button
                          type="button"
                          onClick={() =>
                            onAdvanceRequest(req.id, 'vice_chairman_reviewed')
                          }
                          className="px-3 py-1.5 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {COPY[lang].forwardToChairman}
                        </button>
                      )}
                      {req.status === 'vice_chairman_reviewed' && isChairman && (
                        <button
                          type="button"
                          onClick={() =>
                            onAdvanceRequest(req.id, 'chairman_approved')
                          }
                          className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {COPY[lang].approve}
                        </button>
                      )}
                      {(isViceChairman || isChairman) && (
                        <button
                          type="button"
                          onClick={() => onAdvanceRequest(req.id, 'rejected')}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {COPY[lang].reject}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {approvedPropertyReqs.length > 0 && (
            <section className="bg-white border-2 border-[#047857]/30 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'በዋና ሰብሳቢ የጸደቁ ለወጪ ዝግጁ የሆኑ ንብረቶች',
                  'Chairman-Approved Property Requests Ready for Issue'
                )}
              </h3>
              <div className="divide-y divide-slate-100">
                {approvedPropertyReqs.map((req) => (
                  <div
                    key={req.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="text-xs">
                      <p className="font-bold text-slate-900">
                        {getText(lang, req.memberNameAm, req.memberNameEn)} —{' '}
                        {getText(lang, req.assetNameAm || '', req.assetNameEn || '')} ×{' '}
                        {req.quantity}
                      </p>
                      <p className="text-slate-500 font-mono">
                        {req.neededFrom} → {req.neededUntil}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!req.assetId) return;
                        onAssetAction(req.assetId, 'issued', {
                          memberId: req.memberId,
                          quantity: req.quantity || 1,
                          expectedReturnDate: req.neededUntil,
                          notes: `Issued per approved request ${req.id}`,
                          requestId: req.id,
                        });
                      }}
                      className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                    >
                      {getText(lang, 'ንብረት ወጪ አድርግ', 'Log Check-Out (Issue)')}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(lang, 'የዕድሩ ንብረት ቆጠራ', 'Edir Property & Asset Inventory')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#064E3B]">
                    <th className="py-2.5 px-3">{getText(lang, 'የንብረት ስም', 'Asset Name')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'ጠቅላላ', 'Total')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'ዝግጁ', 'Available')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'የወጣ', 'Out')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'ዋጋ', 'Unit Value')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.assets.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {getText(lang, a.nameAm, a.nameEn)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {a.totalQuantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#047857] tabular-nums">
                        {a.availableQuantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#D97706] tabular-nums font-semibold">
                        {a.totalQuantity - a.availableQuantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatETB(a.unitValue, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'ንብረት ወጪ / ተመላሽ መመዝገቢያ', 'Log Asset Check-Out / Return')}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onAssetAction(assetActionId, assetActionType, {
                    memberId: assetMemberId,
                    quantity: assetQty,
                    expectedReturnDate:
                      assetActionType === 'issued' ? assetReturnDate : undefined,
                    condition:
                      assetActionType === 'returned' ? assetCondition : undefined,
                    notes: assetNotes || 'Standard inventory movement',
                  });
                  setAssetNotes('');
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={assetActionType}
                    onChange={(e) =>
                      setAssetActionType(e.target.value as 'issued' | 'returned')
                    }
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="issued">{getText(lang, 'ወጪ (Check-Out)', 'Issue / Check-Out')}</option>
                    <option value="returned">{getText(lang, 'ገቢ (Return)', 'Return / Check-In')}</option>
                  </select>
                  <select
                    value={assetActionId}
                    onChange={(e) => setAssetActionId(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    {state.assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {getText(lang, a.nameAm, a.nameEn)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <select
                    value={assetMemberId}
                    onChange={(e) => setAssetMemberId(e.target.value)}
                    className="col-span-2 px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {getText(lang, m.fullNameAm, m.fullNameEn)} ({m.memberCode})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={assetQty}
                    onChange={(e) => setAssetQty(Math.max(1, Number(e.target.value)))}
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                {assetActionType === 'issued' ? (
                  <input
                    type="date"
                    value={assetReturnDate}
                    onChange={(e) => setAssetReturnDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                ) : (
                  <select
                    value={assetCondition}
                    onChange={(e) =>
                      setAssetCondition(e.target.value as 'good' | 'damaged')
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="good">{getText(lang, 'በጥሩ ሁኔታ ተመልሷል', 'Returned in Good Condition')}</option>
                    <option value="damaged">{getText(lang, 'ጉዳት ደርሶበታል', 'Returned Damaged')}</option>
                  </select>
                )}
                <input
                  type="text"
                  placeholder={getText(lang, 'ማስታወሻ...', 'Notes...')}
                  value={assetNotes}
                  onChange={(e) => setAssetNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {assetActionType === 'issued'
                    ? getText(lang, 'ወጪ መዝግብ', 'Record Issue')
                    : getText(lang, 'ተመላሽ መዝግብ', 'Record Return')}
                </button>
              </form>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'አዲስ ንብረት መመዝገቢያ', 'Register New Asset Item')}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAssetNameAm.trim() && !newAssetNameEn.trim()) return;
                  onAddAsset({
                    nameAm: newAssetNameAm.trim() || newAssetNameEn.trim(),
                    nameEn: newAssetNameEn.trim() || newAssetNameAm.trim(),
                    category: 'other',
                    totalQuantity: newAssetQty,
                    availableQuantity: newAssetQty,
                    conditionSummaryAm: 'አዲስ በጥሩ ሁኔታ ላይ',
                    conditionSummaryEn: 'New, good condition',
                    unitValue: newAssetVal,
                  });
                  setNewAssetNameAm('');
                  setNewAssetNameEn('');
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  placeholder={getText(lang, 'የንብረት ስም (አማርኛ)', 'Asset Name (Amharic)')}
                  value={newAssetNameAm}
                  onChange={(e) => setNewAssetNameAm(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={getText(lang, 'የንብረት ስም (English)', 'Asset Name (English)')}
                  value={newAssetNameEn}
                  onChange={(e) => setNewAssetNameEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="number"
                    min={1}
                    value={newAssetQty}
                    onChange={(e) => setNewAssetQty(Number(e.target.value))}
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    min={0}
                    value={newAssetVal}
                    onChange={(e) => setNewAssetVal(Number(e.target.value))}
                    className="px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {getText(lang, 'ንብረት ጨምር', 'Add Asset')}
                </button>
              </form>
            </section>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-[#064E3B] pb-3 mb-4 border-b border-slate-100">
              {getText(lang, 'የንብረት ወጪ እና ገቢ ታሪክ', 'Asset Movement Log')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                    <th className="py-2.5 px-3">{getText(lang, 'ቀን', 'Date')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ድርጊት', 'Action')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ንብረት', 'Asset')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'አባል', 'Member')}</th>
                    <th className="py-2.5 px-3 text-right">{getText(lang, 'ብዛት', 'Qty')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ማስታወሻ', 'Notes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.assetLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-3 font-mono tabular-nums">{l.date}</td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span
                          className={
                            l.action === 'issued' ? 'text-[#D97706]' : 'text-[#047857]'
                          }
                        >
                          {l.action === 'issued'
                            ? getText(lang, 'ወጪ (Issued)', 'Issued')
                            : getText(lang, 'ገቢ (Returned)', 'Returned')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {getText(lang, l.assetNameAm, l.assetNameEn)}
                      </td>
                      <td className="py-2.5 px-3">
                        {getText(lang, l.memberNameAm, l.memberNameEn)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {l.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {l.notes} {l.condition ? `(${l.condition})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
