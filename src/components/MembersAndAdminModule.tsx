import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Plus,
  Printer,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  BenefitRule,
  BillingConfig,
  EdirState,
  FamilyMember,
  Language,
  MemberRecord,
  ResidenceZone,
  Role,
} from '../types';
import { COPY, ROLE_LABELS, getText } from '../i18n';
import { ApprovalStepper } from './ApprovalStepper';
import { DigitalIdCard } from './DigitalIdAndScanner';
import { SystemAdminView } from './SystemAdminView';
import { DEFAULT_TEMP_PASSWORD } from '../utils/password';

type MembersSubTab =
  | 'registry'
  | 'register'
  | 'approvals'
  | 'print_ids'
  | 'it_admin';

interface MembersAndAdminModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  firebaseStatus: { connected: boolean; note?: string };
  onRegisterMember: (
    member: Omit<MemberRecord, 'id' | 'memberCode' | 'qrToken' | 'paidMonths'>
  ) => MemberRecord;
  onImportLegacyMembers: (
    rows: Omit<MemberRecord, 'id' | 'memberCode' | 'qrToken' | 'paidMonths'>[]
  ) => MemberRecord[];
  onApproveMember: (memberId: string, decision: 'approved' | 'rejected') => void;
  onUpdateFamily: (memberId: string, familyMembers: FamilyMember[]) => void;
  onUpdatePhoto: (memberId: string, photoUrl: string) => void;
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

export const MembersAndAdminModule: React.FC<MembersAndAdminModuleProps> = ({
  lang,
  currentUser,
  state,
  firebaseStatus,
  onRegisterMember,
  onImportLegacyMembers,
  onApproveMember,
  onUpdateFamily,
  onUpdatePhoto,
  onManageAccess,
  onResetPasswordAndUnlock,
  onUpdateBillingConfig,
  onUpdateBenefitRule,
  onSyncFirebase,
}) => {
  const isItAdmin = currentUser.role === 'auditor' || Boolean(currentUser.isItAdmin);
  const isChairman = currentUser.role === 'chairman';
  const canRegister =
    currentUser.role === 'secretary' ||
    currentUser.role === 'chairman' ||
    currentUser.role === 'vice_chairman' ||
    currentUser.role === 'committee';

  const defaultTab: MembersSubTab = isItAdmin
    ? 'it_admin'
    : isChairman
    ? 'approvals'
    : canRegister
    ? 'register'
    : 'registry';

  const [subTab, setSubTab] = useState<MembersSubTab>(defaultTab);
  const [memSearch, setMemSearch] = useState('');
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(
    null
  );
  const [famNameAm, setFamNameAm] = useState('');
  const [famNameEn, setFamNameEn] = useState('');
  const [famRel, setFamRel] = useState<FamilyMember['relationship']>('spouse');
  const [famAge, setFamAge] = useState(25);

  // Registration form
  const [newMemAm, setNewMemAm] = useState('');
  const [newMemEn, setNewMemEn] = useState('');
  const [newMemPhone, setNewMemPhone] = useState('');
  const [newMemEmail, setNewMemEmail] = useState('');
  const [newMemZone, setNewMemZone] = useState<ResidenceZone>('aleta_wondo');
  const [newMemCityAm, setNewMemCityAm] = useState('አለታ ወንዶ');
  const [newMemCityEn, setNewMemCityEn] = useState('Aleta Wondo');
  const [csvNotice, setCsvNotice] = useState('');
  const [createdCredentialBanner, setCreatedCredentialBanner] = useState<{
    name: string;
    code: string;
    phone: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copiedCred, setCopiedCred] = useState(false);

  // Digital ID selector
  const [selectedIdMemberId, setSelectedIdMemberId] = useState(
    state.members[0]?.id || currentUser.id
  );

  const pendingMembers = state.members.filter(
    (m) => m.approvalStatus === 'pending_chairman'
  );

  const filteredMembers = state.members.filter((m) => {
    const q = memSearch.toLowerCase();
    return (
      !q ||
      m.fullNameAm.toLowerCase().includes(q) ||
      m.fullNameEn.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q) ||
      m.residenceCityEn.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q)
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
    const imported: Omit<
      MemberRecord,
      'id' | 'memberCode' | 'qrToken' | 'paidMonths'
    >[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (!cols[0]) continue;
      const zone: ResidenceZone =
        (cols[4] || '').toLowerCase().includes('out') ||
        (cols[4] || '').toLowerCase().includes('addis') ||
        (cols[4] || '').toLowerCase().includes('hawassa')
          ? 'outside'
          : 'aleta_wondo';
      imported.push({
        fullNameAm: cols[0],
        fullNameEn: cols[1] || cols[0],
        phone: cols[2] || '+251900000000',
        email: cols[3] || `member${Date.now() + i}@aletawondoedir.org`,
        role: 'member',
        accessStatus: 'pending',
        approvalStatus: 'pending_chairman',
        residenceZone: zone,
        residenceCityAm:
          cols[4] || (zone === 'aleta_wondo' ? 'አለታ ወንዶ' : 'ከአለታ ወንዶ ውጪ'),
        residenceCityEn:
          cols[4] || (zone === 'aleta_wondo' ? 'Aleta Wondo' : 'Outside Aleta Wondo'),
        joinedDate: new Date().toISOString().slice(0, 10),
        familyMembers: [],
        registeredBy: `${currentUser.fullNameEn} (CSV Import)`,
      });
    }
    if (imported.length > 0) {
      const created = onImportLegacyMembers(imported);
      setCsvNotice(
        getText(
          lang,
          `${created.length} የቀድሞ አባላት በCSV ተጭነዋል። ነባሪ የይለፍ ቃላቸው (${DEFAULT_TEMP_PASSWORD}) በሲስተሙ ውስጥ ተዘጋጅቷል (ኢሜይል አልተላከም)።`,
          `Imported ${created.length} legacy member(s) with default temporary password (${DEFAULT_TEMP_PASSWORD}) — queued for Chairman approval.`
        )
      );
    }
  };

  const selectedIdMember =
    state.members.find((m) => m.id === selectedIdMemberId) || currentUser;

  const selectedFamilyMember =
    state.members.find((m) => m.id === selectedFamilyMemberId) || null;

  const actionTabs: {
    id: MembersSubTab;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
    badge?: number;
  }[] = [
    {
      id: 'registry',
      label: getText(lang, 'የአባላት እና ቤተሰብ መዝገብ', 'Member & Family Registry'),
      icon: <Users className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'register',
      label: getText(lang, 'አዲስ አባል መዝግብ', 'Register Member'),
      icon: <UserPlus className="w-4 h-4" />,
      visible: canRegister,
    },
    {
      id: 'approvals',
      label: getText(lang, 'የሚጸድቁ ማመልከቻዎች', 'Pending Approvals'),
      icon: <CheckCircle2 className="w-4 h-4" />,
      visible: isChairman || canRegister,
      badge: pendingMembers.length,
    },
    {
      id: 'print_ids',
      label: getText(lang, 'ዲጂታል መታወቂያ አትም', 'Print Digital IDs'),
      icon: <Printer className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'it_admin',
      label: getText(lang, 'የIT ፈቃድ እና የሲስተም አስተዳደር', 'IT Access & System Admin'),
      icon: <UserCog className="w-4 h-4" />,
      visible: isItAdmin, // STRICT RBAC: Exclusively Misgana Tesfaye
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 no-print">
        {actionTabs
          .filter((t) => t.visible)
          .map((tab) => {
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

      {/* 1. MEMBER & FAMILY REGISTRY */}
      {subTab === 'registry' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#064E3B]">
                  {getText(lang, 'የአባላት እና የቤተሰብ መዝገብ', 'Member & Family Registry')}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {getText(
                    lang,
                    'የአባሉን የቤተሰብ ዝርዝር ለማየት ወይም ለማስተካከል ከስር "ቤተሰብ" የሚለውን ይጫኑ።',
                    'Click "Family" on any row to view or manage covered family dependents.'
                  )}
                </p>
              </div>
              <input
                type="text"
                value={memSearch}
                onChange={(e) => setMemSearch(e.target.value)}
                placeholder={COPY[lang].searchPlaceholder}
                className="w-full sm:w-64 px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                    <th className="py-3 px-3">{getText(lang, 'መለያ', 'ID')}</th>
                    <th className="py-3 px-3">{getText(lang, 'ሙሉ ስም', 'Member Name')}</th>
                    <th className="py-3 px-3">{getText(lang, 'አድራሻ', 'Residence')}</th>
                    <th className="py-3 px-3">{getText(lang, 'የስራ ድርሻ', 'Role')}</th>
                    <th className="py-3 px-3">{getText(lang, 'ሁኔታ', 'Status')}</th>
                    <th className="py-3 px-3 text-right">{getText(lang, 'ቤተሰብ', 'Family')}</th>
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
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-slate-800">
                          {getText(lang, m.residenceCityAm, m.residenceCityEn)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {m.residenceZone === 'outside'
                            ? getText(lang, 'ከስብሰባ ነፃ', 'Meeting Exempt')
                            : getText(lang, 'አለታ ወንዶ', 'Local')}
                        </p>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {ROLE_LABELS[m.role][lang]}
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
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-600">
                          {m.approvalStatus === 'approved'
                            ? COPY[lang].approved
                            : COPY[lang].pending}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFamilyMemberId((cur) =>
                              cur === m.id ? null : m.id
                            )
                          }
                          className="px-3 py-1.5 bg-[#064E3B]/10 hover:bg-[#064E3B]/15 text-[#064E3B] font-semibold rounded-lg cursor-pointer"
                        >
                          {getText(
                            lang,
                            `ቤተሰብ (${m.familyMembers.length})`,
                            `Family (${m.familyMembers.length})`
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedFamilyMember && (
            <section className="bg-white border-2 border-[#064E3B]/25 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-[#064E3B]">
                  {getText(
                    lang,
                    `የ ${selectedFamilyMember.fullNameAm} (${selectedFamilyMember.memberCode}) የቤተሰብ መዝገብ`,
                    `Family Registry — ${selectedFamilyMember.fullNameEn} (${selectedFamilyMember.memberCode})`
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedFamilyMemberId(null)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {getText(lang, 'ዝጋ', 'Close')}
                </button>
              </div>

              {canRegister && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!famNameAm.trim() && !famNameEn.trim()) return;
                    const next: FamilyMember = {
                      id: `fam-${Date.now()}`,
                      fullNameAm: famNameAm.trim() || famNameEn.trim(),
                      fullNameEn: famNameEn.trim() || famNameAm.trim(),
                      relationship: famRel,
                      age: famAge,
                    };
                    onUpdateFamily(selectedFamilyMember.id, [
                      ...selectedFamilyMember.familyMembers,
                      next,
                    ]);
                    setFamNameAm('');
                    setFamNameEn('');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <input
                    type="text"
                    required
                    placeholder={getText(lang, 'ስም (አማርኛ)', 'Full Name (Amharic)')}
                    value={famNameAm}
                    onChange={(e) => setFamNameAm(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder={getText(lang, 'ስም (English)', 'Full Name (English)')}
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
              )}

              {selectedFamilyMember.familyMembers.length === 0 ? (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {selectedFamilyMember.familyMembers.map((f) => (
                    <div
                      key={f.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {getText(lang, f.fullNameAm, f.fullNameEn)}
                        </p>
                        <p className="text-slate-500 capitalize">
                          {f.relationship} · {getText(lang, 'ዕድሜ', 'Age')} {f.age}
                        </p>
                      </div>
                      {canRegister && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateFamily(
                              selectedFamilyMember.id,
                              selectedFamilyMember.familyMembers.filter(
                                (x) => x.id !== f.id
                              )
                            )
                          }
                          className="inline-flex items-center gap-1 text-red-700 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{getText(lang, 'አስወግድ', 'Remove')}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* 2. REGISTER NEW MEMBER + CSV IMPORT + SILENT CREDENTIAL HANDOVER */}
      {subTab === 'register' && canRegister && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-[#064E3B]" />
              <div>
                <h2 className="text-base font-bold text-[#064E3B]">
                  {getText(
                    lang,
                    'አዲስ አባል መመዝገቢያ (ፀሀፊ → ዋና ሰብሳቢ → IT አስተዳዳሪ)',
                    'Register New Member Application'
                  )}
                </h2>
                <p className="text-xs text-slate-600">
                  {getText(
                    lang,
                    'ሲመዘገብ ነባሪ የመግቢያ መለያ እና ጊዜያዊ የይለፍ ቃል ወዲያውኑ በስክሪን ላይ ይታያል (ምንም ኢሜይል አይላክም)።',
                    'Assigns a silent default ID and temporary password on screen for handover — zero automated emails sent.'
                  )}
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#064E3B] bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#D97706]/30 rounded-lg cursor-pointer shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-[#D97706]" />
              <span>{getText(lang, 'የቀድሞ አባላት CSV ጫን', 'Import Legacy CSV')}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                className="hidden"
              />
            </label>
          </div>

          {createdCredentialBanner && (
            <div className="bg-white border-2 border-[#D97706] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#D97706]">
                  {getText(
                    lang,
                    'አዲሱ አባል ተመዝግቧል — የመግቢያ መረጃ (ኢሜይል አልተላከም)',
                    'Member Registered — Silent Credentials Ready (No Email Sent)'
                  )}
                </p>
                <p className="text-sm font-bold text-[#064E3B]">
                  {createdCredentialBanner.name} ({createdCredentialBanner.code})
                </p>
                <p className="text-xs font-mono text-slate-800">
                  ID: {createdCredentialBanner.code} · {createdCredentialBanner.phone} ·{' '}
                  <span className="font-bold text-[#064E3B]">
                    {getText(lang, 'ጊዜያዊ የይለፍ ቃል:', 'Default Password:')}{' '}
                    {createdCredentialBanner.tempPassword}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const txt = `Aleta Wondo Edir Account\nName: ${createdCredentialBanner.name}\nMember ID: ${createdCredentialBanner.code}\nPhone: ${createdCredentialBanner.phone}\nEmail: ${createdCredentialBanner.email}\nDefault Password: ${createdCredentialBanner.tempPassword}`;
                  navigator.clipboard?.writeText(txt).catch(() => {});
                  setCopiedCred(true);
                  setTimeout(() => setCopiedCred(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
              >
                {copiedCred ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCred ? COPY[lang].copied : getText(lang, 'መረጃውን ቅዳ', 'Copy Credentials')}</span>
              </button>
            </div>
          )}

          {csvNotice && (
            <div className="p-3 bg-[#047857]/10 border border-[#047857]/30 rounded-lg text-xs text-[#064E3B] font-semibold">
              {csvNotice}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newMemAm.trim() && !newMemEn.trim()) return;
              const created = onRegisterMember({
                fullNameAm: newMemAm.trim() || newMemEn.trim(),
                fullNameEn: newMemEn.trim() || newMemAm.trim(),
                phone: newMemPhone.trim(),
                email:
                  newMemEmail.trim() || `member.${Date.now()}@aletawondoedir.org`,
                role: 'member',
                accessStatus: 'pending',
                approvalStatus: 'pending_chairman',
                residenceZone: newMemZone,
                residenceCityAm: newMemCityAm.trim(),
                residenceCityEn: newMemCityEn.trim(),
                joinedDate: new Date().toISOString().slice(0, 10),
                familyMembers: [],
                registeredBy: currentUser.fullNameEn,
                mustChangePassword: true,
                defaultTempPassword: DEFAULT_TEMP_PASSWORD,
              });
              setCreatedCredentialBanner({
                name: getText(lang, created.fullNameAm, created.fullNameEn),
                code: created.memberCode,
                phone: created.phone,
                email: created.email,
                tempPassword: created.defaultTempPassword || DEFAULT_TEMP_PASSWORD,
              });
              setNewMemAm('');
              setNewMemEn('');
              setNewMemPhone('');
              setNewMemEmail('');
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                {getText(lang, 'ሙሉ ስም (አማርኛ)', 'Full Name (Amharic)')}
              </label>
              <input
                type="text"
                required
                value={newMemAm}
                onChange={(e) => setNewMemAm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                {getText(lang, 'ሙሉ ስም (English)', 'Full Name (English)')}
              </label>
              <input
                type="text"
                required
                value={newMemEn}
                onChange={(e) => setNewMemEn(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                {getText(lang, 'ስልክ ቁጥር', 'Phone Number')}
              </label>
              <input
                type="text"
                required
                value={newMemPhone}
                onChange={(e) => setNewMemPhone(e.target.value)}
                placeholder="+2519..."
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                {getText(lang, 'ኢሜይል', 'Email')}
              </label>
              <input
                type="email"
                value={newMemEmail}
                onChange={(e) => setNewMemEmail(e.target.value)}
                placeholder="name@aletawondoedir.org"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                {getText(lang, 'የመኖሪያ ዞን', 'Residence Zone')}
              </label>
              <select
                value={newMemZone}
                onChange={(e) => {
                  const z = e.target.value as ResidenceZone;
                  setNewMemZone(z);
                  if (z === 'aleta_wondo') {
                    setNewMemCityAm('አለታ ወንዶ');
                    setNewMemCityEn('Aleta Wondo');
                  } else {
                    setNewMemCityAm('አዲስ አበባ');
                    setNewMemCityEn('Addis Ababa');
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="aleta_wondo">{COPY[lang].aletaWondo}</option>
                <option value="outside">{COPY[lang].outsideAletaWondo}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[#064E3B] mb-1">
                  {getText(lang, 'ከተማ / ሀገር', 'City / Country')}
                </label>
                <input
                  type="text"
                  value={lang === 'am' ? newMemCityAm : newMemCityEn}
                  onChange={(e) => {
                    setNewMemCityAm(e.target.value);
                    setNewMemCityEn(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer self-end h-[38px]"
              >
                {getText(lang, 'መዝግብ', 'Register')}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 3. CHAIRMAN PENDING APPROVALS */}
      {subTab === 'approvals' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
            {getText(
              lang,
              'አዲስ የአባልነት ማመልከቻዎች (የዋና ሰብሳቢ ማጽደቂያ)',
              'Pending Member Applications (Chairman Final Approval)'
            )}
          </h2>
          {pendingMembers.length === 0 ? (
            <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
          ) : (
            <div className="space-y-4">
              {pendingMembers.map((m) => (
                <div
                  key={m.id}
                  className="p-4 border border-slate-200 rounded-lg space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, m.fullNameAm, m.fullNameEn)}{' '}
                        <span className="font-mono text-xs text-[#064E3B]">
                          ({m.memberCode})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600">
                        {getText(lang, m.residenceCityAm, m.residenceCityEn)} · {m.phone} ·{' '}
                        {getText(lang, 'መዝጋቢ፡ ', 'Registered by: ')}
                        {m.registeredBy}
                      </p>
                    </div>
                    {isChairman && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApproveMember(m.id, 'approved')}
                          className="px-3.5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {COPY[lang].approve}
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveMember(m.id, 'rejected')}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {COPY[lang].reject}
                        </button>
                      </div>
                    )}
                  </div>
                  <ApprovalStepper
                    lang={lang}
                    steps={[
                      {
                        labelAm: 'በፀሀፊ ተመዝግቧል',
                        labelEn: 'Secretary Registered',
                        actorAm: m.registeredBy,
                        actorEn: m.registeredBy,
                        state: 'completed',
                      },
                      {
                        labelAm: 'የዋና ሰብሳቢ ውሳኔ',
                        labelEn: 'Chairman Approval',
                        actorAm: 'አሚን ነጋሽ',
                        actorEn: 'Amin Negash',
                        state: 'current',
                      },
                      {
                        labelAm: 'የIT ሲስተም አስተዳዳሪ ፈቃድ',
                        labelEn: 'IT Admin Access',
                        actorAm: 'ምስጋና ተስፋዬ',
                        actorEn: 'Misgana Tesfaye',
                        state: 'upcoming',
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. DIGITAL ID CARD PRINTING */}
      {subTab === 'print_ids' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <label className="text-xs font-bold text-[#064E3B]">
              {getText(lang, 'መታወቂያው የሚታተምለትን አባል ይምረጡ፡', 'Select Member to Print ID:')}
            </label>
            <select
              value={selectedIdMember.id}
              onChange={(e) => setSelectedIdMemberId(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberCode} — {getText(lang, m.fullNameAm, m.fullNameEn)}
                </option>
              ))}
            </select>
          </div>
          <DigitalIdCard
            lang={lang}
            member={selectedIdMember}
            allowPhotoUpload
            onUpdatePhoto={onUpdatePhoto}
          />
        </div>
      )}

      {/* 5. IT ACCESS & SYSTEM ADMIN (EXCLUSIVELY MISGANA TESFAYE) */}
      {subTab === 'it_admin' && isItAdmin && (
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
