import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Copy,
  Download,
  FileBarChart2,
  FilePlus2,
  Megaphone,
} from 'lucide-react';
import {
  Announcement,
  DocumentArchiveItem,
  EdirState,
  Language,
  MemberRecord,
} from '../types';
import { COPY, ROLE_LABELS, formatETB, getText } from '../i18n';
import { computeMemberFinancials, computeTreasurySummary } from '../utils/billing';
import { formatWhatsAppSmsMessage } from '../utils/exportUtils';
import { uploadFileToStorage } from '../services/edirStore';
import { ReportGeneratorView } from './ReportGeneratorView';

type InfoSubTab = 'comms' | 'archive' | 'reports' | 'audit';

interface InfoAndReportsModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onPublishAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt'>) => void;
  onUploadDocument: (
    docItem: Omit<DocumentArchiveItem, 'id' | 'uploadedAt'>
  ) => void;
  onResolveEmergency: (
    emgId: string,
    status: 'acknowledged' | 'resolved'
  ) => void;
}

export const InfoAndReportsModule: React.FC<InfoAndReportsModuleProps> = ({
  lang,
  currentUser,
  state,
  onPublishAnnouncement,
  onUploadDocument,
  onResolveEmergency,
}) => {
  const canSeeAudit =
    currentUser.role === 'auditor' || currentUser.role === 'chairman';
  const defaultTab: InfoSubTab =
    currentUser.role === 'auditor'
      ? 'audit'
      : currentUser.role === 'pr'
      ? 'comms'
      : 'reports';
  const [subTab, setSubTab] = useState<InfoSubTab>(defaultTab);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Announcement form state
  const [annCategory, setAnnCategory] =
    useState<Announcement['category']>('general');
  const [annPriority, setAnnPriority] =
    useState<Announcement['priority']>('normal');
  const [annTitleAm, setAnnTitleAm] = useState('');
  const [annTitleEn, setAnnTitleEn] = useState('');
  const [annBodyAm, setAnnBodyAm] = useState('');
  const [annBodyEn, setAnnBodyEn] = useState('');

  // Archive upload & browse state
  const [docTitleAm, setDocTitleAm] = useState('');
  const [docTitleEn, setDocTitleEn] = useState('');
  const [docType, setDocType] =
    useState<DocumentArchiveItem['docType']>('bylaws');
  const [docYear, setDocYear] = useState('2026');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewText, setDocPreviewText] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [previewDocId, setPreviewDocId] = useState<string | null>(
    state.documents[0]?.id || null
  );

  const isChairman = currentUser.role === 'chairman';
  const canPublishComms =
    currentUser.role === 'pr' ||
    currentUser.role === 'chairman' ||
    currentUser.role === 'secretary' ||
    currentUser.role === 'vice_chairman';
  const canUploadDocs =
    currentUser.role === 'secretary' ||
    currentUser.role === 'chairman' ||
    currentUser.role === 'pr';

  const activeEmergencies = state.emergencies.filter(
    (e) => e.status !== 'resolved'
  );

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

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const treasury = computeTreasurySummary(state);
  const reconVariances = state.reconciliations.filter((r) => r.variance !== 0);
  const overdueMembers = state.members
    .map((m) => ({ m, fin: computeMemberFinancials(m, state) }))
    .filter((x) => x.fin.overdueMonths.length > 0);

  const actionTabs: {
    id: InfoSubTab;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
    badge?: number;
  }[] = [
    {
      id: 'comms',
      label: getText(lang, 'ማስታወቂያ እና የሀዘን ጥሪ', 'Announcements & Alerts'),
      icon: <Megaphone className="w-4 h-4" />,
      visible: true,
      badge: activeEmergencies.length,
    },
    {
      id: 'archive',
      label: getText(lang, 'መተዳደሪያ ደንብ እና መዛግብት', 'Bylaws & File Archive'),
      icon: <BookOpen className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'reports',
      label: getText(lang, 'ሪፖርት ማመንጫ (PDF/CSV)', 'Report Generator'),
      icon: <FileBarChart2 className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'audit',
      label: getText(lang, 'የኦዲት ቁጥጥር መዝገብ', 'Immutable Audit Trail'),
      icon: <ClipboardCheck className="w-4 h-4" />,
      visible: canSeeAudit,
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
                        : 'bg-red-100 text-red-700 font-bold'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* SUB-VIEW 1: ANNOUNCEMENTS & BEREAVEMENT ALERTS */}
      {subTab === 'comms' && (
        <div className="space-y-6">
          {activeEmergencies.length > 0 && (
            <section className="bg-white border border-red-200 rounded-xl p-6 space-y-3">
              <h2 className="text-base font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-700" />
                <span>
                  {getText(
                    lang,
                    'አስቸኳይ የሀዘን እና የድጋፍ ማሳወቂያዎች',
                    'Active Bereavement & Emergency Alerts'
                  )}
                </span>
              </h2>
              <div className="divide-y divide-red-100">
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
                      <p className="text-xs text-slate-600 mt-0.5">
                        {em.location} · {em.phone} — {em.message}
                      </p>
                    </div>
                    {canPublishComms && (
                      <div className="flex items-center gap-2 shrink-0">
                        {em.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => onResolveEmergency(em.id, 'acknowledged')}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#D97706] hover:bg-[#F59E0B] text-white rounded-lg cursor-pointer"
                          >
                            {getText(lang, 'ተቀብያለሁ', 'Acknowledge')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onResolveEmergency(em.id, 'resolved')}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#064E3B] hover:bg-[#047857] text-white rounded-lg cursor-pointer"
                        >
                          {getText(lang, 'ተፈጽሟል', 'Mark Resolved')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {canPublishComms && (
              <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Megaphone className="w-5 h-5 text-[#D97706]" />
                  <h2 className="text-base font-bold text-[#064E3B]">
                    {getText(lang, 'ማስታወቂያ ማተሚያ', 'Publish Announcement')}
                  </h2>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!annTitleAm.trim() && !annTitleEn.trim()) return;
                    if (annCategory === 'meeting' && !isChairman) return;
                    onPublishAnnouncement({
                      category: annCategory,
                      priority: annPriority,
                      titleAm: annTitleAm.trim() || annTitleEn.trim(),
                      titleEn: annTitleEn.trim() || annTitleAm.trim(),
                      bodyAm: annBodyAm.trim(),
                      bodyEn: annBodyEn.trim() || annBodyAm.trim(),
                      authorName: currentUser.fullNameEn,
                      authorRole: currentUser.role,
                    });
                    setAnnTitleAm('');
                    setAnnTitleEn('');
                    setAnnBodyAm('');
                    setAnnBodyEn('');
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={annCategory}
                      onChange={(e) =>
                        setAnnCategory(e.target.value as Announcement['category'])
                      }
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    >
                      <option value="general">{getText(lang, 'መደበኛ ማስታወቂያ', 'General Notice')}</option>
                      <option value="bereavement">{getText(lang, 'የሀዘን መልዕክት', 'Bereavement Alert')}</option>
                      <option value="celebration">{getText(lang, 'የደስታ / ሰርግ', 'Celebration')}</option>
                      {isChairman && (
                        <option value="meeting">{getText(lang, 'የስብሰባ ጥሪ', 'Meeting Call')}</option>
                      )}
                    </select>
                    <select
                      value={annPriority}
                      onChange={(e) =>
                        setAnnPriority(e.target.value as Announcement['priority'])
                      }
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    >
                      <option value="normal">{getText(lang, 'መደበኛ', 'Normal')}</option>
                      <option value="urgent">{getText(lang, 'አስቸኳይ (Urgent)', 'Urgent')}</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder={getText(lang, 'ርዕስ (አማርኛ)', 'Headline (Amharic)')}
                    value={annTitleAm}
                    onChange={(e) => setAnnTitleAm(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder={getText(lang, 'ርዕስ (English)', 'Headline (English)')}
                    value={annTitleEn}
                    onChange={(e) => setAnnTitleEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder={getText(lang, 'መልዕክት (አማርኛ)...', 'Message body (Amharic)...')}
                    value={annBodyAm}
                    onChange={(e) => setAnnBodyAm(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <textarea
                    rows={2}
                    placeholder={getText(lang, 'መልዕክት (English)...', 'Message body (English)...')}
                    value={annBodyEn}
                    onChange={(e) => setAnnBodyEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      {getText(lang, 'ማስታወቂያ አሰራጭ', 'Publish Announcement')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          'pr-wa',
                          formatWhatsAppSmsMessage('bereavement', lang, {
                            bereavementDetail:
                              annBodyAm || annBodyEn || 'Urgent Edir Community Notice',
                          })
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>
                        {copiedId === 'pr-wa'
                          ? COPY[lang].copied
                          : getText(lang, 'WhatsApp / SMS ቅዳ', 'Format for WhatsApp/SMS')}
                      </span>
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section
              className={`${
                canPublishComms ? 'lg:col-span-7' : 'lg:col-span-12'
              } bg-white border border-slate-200 rounded-xl p-6 space-y-4`}
            >
              <h3 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
                {getText(lang, 'የተላለፉ የኮሚቴ ማስታወቂያዎች', 'Published Committee Announcements')}
              </h3>
              <div className="divide-y divide-slate-100">
                {state.announcements.map((ann) => (
                  <article key={ann.id} className="py-3.5 first:pt-0 last:pb-0">
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
                      <span aria-hidden="true">·</span>
                      <span>{ann.authorName}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {getText(lang, ann.titleAm, ann.titleEn)}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {getText(lang, ann.bodyAm, ann.bodyEn)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: BYLAWS & FILE ARCHIVE */}
      {subTab === 'archive' && (
        <div className="space-y-6">
          {canUploadDocs && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FilePlus2 className="w-5 h-5 text-[#064E3B]" />
                <h2 className="text-base font-bold text-[#064E3B]">
                  {getText(
                    lang,
                    'አዲስ ሰነድ / ቃለ ጉባኤ / መተዳደሪያ ደንብ መጫኛ',
                    'Upload & Attach Edir Document / Minutes'
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
                }}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <select
                  value={docType}
                  onChange={(e) =>
                    setDocType(e.target.value as DocumentArchiveItem['docType'])
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                >
                  <option value="bylaws">{getText(lang, 'መተዳደሪያ ደንብ', 'Bylaws')}</option>
                  <option value="minutes">{getText(lang, 'ቃለ ጉባኤ', 'Meeting Minutes')}</option>
                  <option value="financial">{getText(lang, 'የፋይናንስ መዝገብ', 'Financial Archive')}</option>
                  <option value="policy">{getText(lang, 'መመሪያ / ደንብ', 'Policy')}</option>
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
                  placeholder={getText(lang, 'የሰነድ ርዕስ (አማርኛ)', 'Title (Amharic)')}
                  value={docTitleAm}
                  onChange={(e) => setDocTitleAm(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={getText(lang, 'የሰነድ ርዕስ (English)', 'Title (English)')}
                  value={docTitleEn}
                  onChange={(e) => setDocTitleEn(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <textarea
                  rows={2}
                  placeholder={getText(lang, 'የሰነድ ማጠቃለያ / ጽሑፍ...', 'Text summary or minutes content...')}
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
                  className="px-4 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {getText(lang, 'ሰነድ ጫን', 'Upload Document')}
                </button>
              </form>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="text-base font-bold text-[#064E3B]">
                {getText(lang, 'የዕድሩ መዛግብት', 'Document Archive')}
              </h3>
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder={getText(lang, 'ሰነድ ይፈልጉ...', 'Search documents...')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <div className="flex flex-wrap gap-1.5">
                {['all', 'bylaws', 'minutes', 'financial'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDocFilter(t)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                      docFilter === t
                        ? 'bg-[#064E3B] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t === 'all'
                      ? getText(lang, 'ሁሉም', 'All')
                      : t === 'bylaws'
                      ? getText(lang, 'መተዳደሪያ ደንብ', 'Bylaws')
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
                    className={`w-full text-left py-3 px-2.5 rounded-lg transition-colors cursor-pointer ${
                      activeDoc?.id === d.id
                        ? 'bg-[#064E3B]/10'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {getText(lang, d.titleAm, d.titleEn)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {d.year} · {d.fileSizeLabel} · {d.uploadedBy}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
              {activeDoc ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-[#064E3B]">
                        {getText(lang, activeDoc.titleAm, activeDoc.titleEn)}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {activeDoc.fileName} · {activeDoc.uploadedAt} · {activeDoc.uploadedBy}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadDoc(activeDoc)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{getText(lang, 'አውርድ', 'Download')}</span>
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {activeDoc.textPreview ||
                      getText(
                        lang,
                        'የሰነዱ ፋይል ለማውረድ ዝግጁ ነው።',
                        'Attached document file is ready for download.'
                      )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">{COPY[lang].noRecords}</p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: DYNAMIC REPORT GENERATOR */}
      {subTab === 'reports' && <ReportGeneratorView lang={lang} state={state} />}

      {/* SUB-VIEW 4: IMMUTABLE AUDIT TRAIL */}
      {subTab === 'audit' && canSeeAudit && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የስርዓቱ የተጣራ ካዝና ሂሳብ', 'System Net Treasury Balance')}
              </p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-[#064E3B]">
                {formatETB(treasury.systemCalculatedCashBalance, lang)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የባንክ ልዩነቶች', 'Bank Discrepancies Flagged')}
              </p>
              <p
                className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
                  reconVariances.length > 0 ? 'text-red-700' : 'text-[#047857]'
                }`}
              >
                {reconVariances.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ውዝፍ ያለባቸው አባላት', 'Overdue Member Accounts')}
              </p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-[#D97706]">
                {overdueMembers.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የኦዲት መዛግብት ብዛት', 'Immutable Audit Events')}
              </p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {state.auditLogs.length}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#064E3B]" />
                <h2 className="text-base font-bold text-[#064E3B]">
                  {getText(
                    lang,
                    'የማይለወጥ የኦዲት ቁጥጥር መዝገብ (Immutable Audit Trail)',
                    'Immutable Chronological Audit Trail (Read-Only Oversight)'
                  )}
                </h2>
              </div>
              <span className="text-xs text-[#047857] font-semibold">
                {getText(lang, 'የንባብ ብቻ ቁጥጥር', 'Read-Only Oversight')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[#064E3B] font-bold">
                    <th className="py-2.5 px-3">{getText(lang, 'ሰዓት / ቀን', 'Timestamp')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ፈጻሚ / መለያ', 'Actor & ID')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ድርሻ', 'Role')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ክፍል', 'Module')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ድርጊት', 'Action')}</th>
                    <th className="py-2.5 px-3">{getText(lang, 'ዝርዝር', 'Details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {log.actorName}
                        {log.actorId && (
                          <span className="ml-1 font-mono text-[11px] font-normal text-slate-500">
                            ({log.actorId})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {ROLE_LABELS[log.actorRole][lang]}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{log.module}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#064E3B]">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
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
