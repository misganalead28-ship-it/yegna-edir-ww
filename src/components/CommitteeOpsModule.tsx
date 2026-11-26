import React, { useState } from 'react';
import { Eye, EyeOff, HeartHandshake, Package } from 'lucide-react';
import { EdirAsset, EdirState, Language } from '../types';
import { COPY, formatETB, getText } from '../i18n';

type CommitteeOpsTab = 'property_tracking' | 'bereavement_support';

interface CommitteeOpsModuleProps {
  lang: Language;
  state: EdirState;
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
  onResolveEmergency: (
    emgId: string,
    status: 'acknowledged' | 'resolved'
  ) => void;
}

export const CommitteeOpsModule: React.FC<CommitteeOpsModuleProps> = ({
  lang,
  state,
  onAssetAction,
  onAddAsset,
  onResolveEmergency,
}) => {
  const [tab, setTab] = useState<CommitteeOpsTab>('property_tracking');
  const [feedback, setFeedback] = useState('');

  // Asset check-out / return state
  const [assetActionId, setAssetActionId] = useState(state.assets[0]?.id || '');
  const [assetMemberId, setAssetMemberId] = useState(state.members[0]?.id || '');
  const [assetActionType, setAssetActionType] = useState<'issued' | 'returned'>(
    'issued'
  );
  const [assetQty, setAssetQty] = useState(1);
  const [assetReturnDate, setAssetReturnDate] = useState('2026-12-10');
  const [assetCondition, setAssetCondition] = useState<'good' | 'damaged'>('good');
  const [assetNotes, setAssetNotes] = useState('');

  // Add asset state
  const [newAssetNameAm, setNewAssetNameAm] = useState('');
  const [newAssetNameEn, setNewAssetNameEn] = useState('');
  const [newAssetQty, setNewAssetQty] = useState(10);
  const [newAssetVal, setNewAssetVal] = useState(1000);
  const [showInventoryList, setShowInventoryList] = useState(false);

  // Bereavement coordination
  const [openSingleAlert, setOpenSingleAlert] = useState(false);
  const [showAlertsList, setShowAlertsList] = useState(false);

  const totalAvailableUnits = state.assets.reduce(
    (s, a) => s + a.availableQuantity,
    0
  );
  const totalOutUnits = state.assets.reduce(
    (s, a) => s + (a.totalQuantity - a.availableQuantity),
    0
  );
  const approvedPropertyReqs = state.requests.filter(
    (r) => r.requestType === 'property' && r.status === 'chairman_approved'
  );
  const activeEmergencies = state.emergencies.filter(
    (e) => e.status !== 'resolved'
  );

  const buttons: {
    id: CommitteeOpsTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'property_tracking',
      label: getText(
        lang,
        'የዕድሩ ንብረት ወጪ ገቢ',
        'Track Property Check-Out & Check-In'
      ),
      icon: <Package className="w-4 h-4" />,
      badge: approvedPropertyReqs.length,
    },
    {
      id: 'bereavement_support',
      label: getText(
        lang,
        'የሀዘን እና ዝግጅት ክትትል',
        'Coordinate Bereavement & Event Support'
      ),
      icon: <HeartHandshake className="w-4 h-4" />,
      badge: activeEmergencies.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 2 Exclusive Committee Member Action Buttons */}
      <nav
        aria-label="Committee Operations Actions"
        className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
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

      {/* 1. TRACK PROPERTY CHECK-OUT & CHECK-IN */}
      {tab === 'property_tracking' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ዝግጁ የሆኑ ንብረቶች (ብዛት)', 'Available Asset Units')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {totalAvailableUnits}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'በውሰት የወጡ ንብረቶች', 'Currently Checked Out')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {totalOutUnits}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'በሰብሳቢ የጸደቁ ለወጪ ዝግጁ', 'Chairman-Approved to Issue')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#047857]">
                {approvedPropertyReqs.length}
              </p>
            </div>
          </div>

          {approvedPropertyReqs.length > 0 && (
            <section className="bg-white border border-[#047857]/30 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'በዋና ሰብሳቢ የጸደቁ ንብረቶች (ወጪ ለማድረግ)',
                  'Chairman-Approved Requests Ready for Check-Out'
                )}
              </h2>
              <div className="divide-y divide-slate-100">
                {approvedPropertyReqs.map((req) => (
                  <div
                    key={req.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
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
                        setFeedback(
                          getText(lang, 'ንብረቱ ወጪ ሆኗል።', 'Asset checked out.')
                        );
                      }}
                      className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-lg cursor-pointer shrink-0"
                    >
                      {getText(lang, 'ወጪ አድርግ', 'Issue Property')}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'ንብረት ወጪ / ገቢ መመዝገቢያ', 'Log Asset Check-Out / Return')}
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
                    notes: assetNotes || 'Standard movement',
                  });
                  setAssetNotes('');
                  setFeedback(
                    getText(
                      lang,
                      'የንብረት እንቅስቃሴ ተመዝግቧል።',
                      'Asset movement logged.'
                    )
                  );
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={assetActionType}
                    onChange={(e) =>
                      setAssetActionType(e.target.value as 'issued' | 'returned')
                    }
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="issued">{getText(lang, 'ወጪ (Check-Out)', 'Issue / Check-Out')}</option>
                    <option value="returned">{getText(lang, 'ገቢ (Return)', 'Return / Check-In')}</option>
                  </select>
                  <select
                    value={assetActionId}
                    onChange={(e) => setAssetActionId(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
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
                    className="col-span-2 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
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
                  className="px-4 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {assetActionType === 'issued'
                    ? getText(lang, 'ወጪ መዝግብ', 'Record Issue')
                    : getText(lang, 'ገቢ መዝግብ', 'Record Return')}
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
                  setFeedback(
                    getText(lang, 'አዲስ ንብረት ተመዝግቧል።', 'New asset added.')
                  );
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
                  className="px-4 py-2.5 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {getText(lang, 'ንብረት ጨምር', 'Add Asset')}
                </button>
              </form>
            </section>
          </div>

          {/* Inventory & Movement Log (Hidden Until Requested) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#064E3B]">
                {getText(lang, 'የዕድሩ ንብረት ቆጠራ እና ታሪክ', 'Inventory & Movement Log')}
              </h3>
              <button
                type="button"
                onClick={() => setShowInventoryList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showInventoryList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showInventoryList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                    : getText(lang, 'ዝርዝር አሳይ', 'View Inventory & Log')}
                </span>
              </button>
            </div>

            {showInventoryList && (
              <div className="space-y-6 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                        <th className="py-2.5 px-3">{getText(lang, 'ንብረት', 'Asset')}</th>
                        <th className="py-2.5 px-3 text-right">{getText(lang, 'ጠቅላላ', 'Total')}</th>
                        <th className="py-2.5 px-3 text-right">{getText(lang, 'ዝግጁ', 'Available')}</th>
                        <th className="py-2.5 px-3 text-right">{getText(lang, 'የወጣ', 'Out')}</th>
                        <th className="py-2.5 px-3 text-right">{getText(lang, 'ዋጋ', 'Unit Value')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.assets.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {getText(lang, a.nameAm, a.nameEn)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {a.totalQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#047857] tabular-nums">
                            {a.availableQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#D97706] tabular-nums">
                            {a.totalQuantity - a.availableQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {formatETB(a.unitValue, lang)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {state.assetLogs.map((l) => (
                    <div key={l.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">
                          {getText(lang, l.assetNameAm, l.assetNameEn)} × {l.quantity} ·{' '}
                          {getText(lang, l.memberNameAm, l.memberNameEn)}
                        </p>
                        <p className="text-slate-500">
                          {l.date} · {l.notes}
                        </p>
                      </div>
                      <span
                        className={`font-bold ${
                          l.action === 'issued' ? 'text-[#D97706]' : 'text-[#047857]'
                        }`}
                      >
                        {l.action === 'issued'
                          ? getText(lang, 'ወጪ', 'Issued')
                          : getText(lang, 'ገቢ', 'Returned')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. COORDINATE BEREAVEMENT & EVENT SUPPORT */}
      {tab === 'bereavement_support' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">
              {getText(lang, 'ንቁ የሀዘን እና የድጋፍ ክትትሎች', 'Active Bereavement & Event Cases')}
            </p>
            <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
              {activeEmergencies.length}
            </p>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(lang, 'የሀዘን እና የዝግጅት ድጋፍ ክትትል', 'Bereavement & Event Support')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {activeEmergencies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSingleAlert((v) => !v)}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {openSingleAlert
                      ? getText(lang, 'ዝጋ', 'Close Item')
                      : getText(lang, 'ቀጣይ ጥሪ ክፈት', 'Open Next Case')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAlertsList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showAlertsList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showAlertsList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'ዝርዝር አሳይ', 'View List')}
                  </span>
                </button>
              </div>
            </div>

            {activeEmergencies.length === 0 && (
              <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
            )}

            {openSingleAlert && activeEmergencies[0] && (
              <div className="p-4 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {getText(
                      lang,
                      activeEmergencies[0].memberNameAm,
                      activeEmergencies[0].memberNameEn
                    )}{' '}
                    ({activeEmergencies[0].memberCode}) ·{' '}
                    <span className="text-red-700">{activeEmergencies[0].relationAffected}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeEmergencies[0].location} · {activeEmergencies[0].phone} —{' '}
                    {activeEmergencies[0].message}
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
                    {getText(lang, 'ተፈጽሟል', 'Mark Resolved')}
                  </button>
                </div>
              </div>
            )}

            {showAlertsList && (
              <div className="divide-y divide-slate-100 pt-2">
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
                      <p className="text-xs text-slate-600">
                        {em.location} · {em.phone} — {em.message}
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
                        {getText(lang, 'ተፈጽሟል', 'Mark Resolved')}
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
