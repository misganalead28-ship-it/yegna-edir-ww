import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  Megaphone,
  Search,
} from 'lucide-react';
import {
  Announcement,
  DocumentArchiveItem,
  EdirState,
  Language,
  MemberRecord,
} from '../types';
import { COPY, ROLE_LABELS, getText } from '../i18n';
import { formatWhatsAppSmsMessage } from '../utils/exportUtils';
import { uploadFileToStorage } from '../services/edirStore';

type PrTab = 'broadcast' | 'bylaws';

interface PrModuleProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onPublishAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt'>) => void;
  onUploadDocument: (
    docItem: Omit<DocumentArchiveItem, 'id' | 'uploadedAt'>
  ) => void;
}

export const PrModule: React.FC<PrModuleProps> = ({
  lang,
  currentUser,
  state,
  onPublishAnnouncement,
  onUploadDocument,
}) => {
  const [tab, setTab] = useState<PrTab>('broadcast');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  // Broadcast form (Meeting Call excluded — Chairman only!)
  const [annCategory, setAnnCategory] = useState<'general' | 'bereavement' | 'celebration'>(
    'general'
  );
  const [annPriority, setAnnPriority] =
    useState<Announcement['priority']>('normal');
  const [annTitleAm, setAnnTitleAm] = useState('');
  const [annTitleEn, setAnnTitleEn] = useState('');
  const [annBodyAm, setAnnBodyAm] = useState('');
  const [annBodyEn, setAnnBodyEn] = useState('');
  const [showAnnList, setShowAnnList] = useState(false);

  // Bylaws & rules form
  const [docType, setDocType] = useState<'bylaws' | 'policy'>('bylaws');
  const [docYear, setDocYear] = useState('2026');
  const [docTitleAm, setDocTitleAm] = useState('');
  const [docTitleEn, setDocTitleEn] = useState('');
  const [docPreviewText, setDocPreviewText] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSearch, setDocSearch] = useState('');
  const [showBylawsList, setShowBylawsList] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocumentArchiveItem | null>(null);

  const bylawsDocs = state.documents.filter(
    (d) => d.docType === 'bylaws' || d.docType === 'policy'
  );
  const filteredBylaws = bylawsDocs.filter((d) => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.titleAm.toLowerCase().includes(q) ||
      d.titleEn.toLowerCase().includes(q) ||
      d.fileName.toLowerCase().includes(q)
    );
  });

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
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

  const buttons: { id: PrTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'broadcast',
      label: getText(
        lang,
        'መልዕክት እና ማስታወቂያ',
        'Broadcast Announcements & Bereavement/Event Notices'
      ),
      icon: <Megaphone className="w-4 h-4" />,
    },
    {
      id: 'bylaws',
      label: getText(
        lang,
        'መተዳደሪያ ደንብ እና ህገ-ደንብ',
        'Manage Bylaws & Edir Rules'
      ),
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 2 Exclusive PR Action Buttons */}
      <nav
        aria-label="PR Actions"
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
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
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

      {/* 1. BROADCAST ANNOUNCEMENTS & BEREAVEMENT/EVENT NOTICES */}
      {tab === 'broadcast' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'የተላለፉ ማስታወቂያዎች', 'Published Announcements')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
                {state.announcements.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">
                {getText(lang, 'ንቁ የሀዘን/ድጋፍ ጥሪዎች', 'Active Emergency Notices')}
              </p>
              <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#D97706]">
                {state.emergencies.filter((e) => e.status !== 'resolved').length}
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#064E3B] pb-3 border-b border-slate-100">
              {getText(
                lang,
                'የማህበረሰብ ማስታወቂያ እና የሀዘን/የደስታ መልዕክት ማተሚያ',
                'Broadcast Community Announcement'
              )}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!annTitleAm.trim() && !annTitleEn.trim()) return;
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
                setFeedback(
                  getText(
                    lang,
                    'ማስታወቂያው ለአባላት በሙሉ ተላልፏል።',
                    'Announcement published to members.'
                  )
                );
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={annCategory}
                  onChange={(e) =>
                    setAnnCategory(
                      e.target.value as 'general' | 'bereavement' | 'celebration'
                    )
                  }
                  className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="general">{getText(lang, 'መደበኛ ማስታወቂያ', 'General Notice')}</option>
                  <option value="bereavement">{getText(lang, 'የሀዘን መልዕክት', 'Bereavement Alert')}</option>
                  <option value="celebration">{getText(lang, 'የደስታ / ሰርግ', 'Celebration / Event')}</option>
                </select>
                <select
                  value={annPriority}
                  onChange={(e) =>
                    setAnnPriority(e.target.value as Announcement['priority'])
                  }
                  className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="normal">{getText(lang, 'መደበኛ', 'Normal')}</option>
                  <option value="urgent">{getText(lang, 'አስቸኳይ (Urgent)', 'Urgent')}</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={getText(lang, 'ርዕስ (አማርኛ)', 'Headline (Amharic)')}
                  value={annTitleAm}
                  onChange={(e) => setAnnTitleAm(e.target.value)}
                  className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={getText(lang, 'ርዕስ (English)', 'Headline (English)')}
                  value={annTitleEn}
                  onChange={(e) => setAnnTitleEn(e.target.value)}
                  className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <textarea
                rows={3}
                required
                placeholder={getText(lang, 'መልዕክት (አማርኛ)...', 'Message body (Amharic)...')}
                value={annBodyAm}
                onChange={(e) => setAnnBodyAm(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
              />
              <textarea
                rows={2}
                placeholder={getText(lang, 'መልዕክት (English)...', 'Message body (English)...')}
                value={annBodyEn}
                onChange={(e) => setAnnBodyEn(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold rounded-lg cursor-pointer"
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
                            annBodyAm || annBodyEn || 'Edir Community Notice',
                        })
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>
                      {copiedId === 'pr-wa'
                        ? COPY[lang].copied
                        : getText(lang, 'WhatsApp / SMS ቅዳ', 'Format for WhatsApp/SMS')}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAnnList((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {showAnnList ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showAnnList
                      ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                      : getText(lang, 'የተላኩ ማስታወቂያዎችን አሳይ', 'View Announcements')}
                  </span>
                </button>
              </div>
            </form>
          </section>

          {showAnnList && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 divide-y divide-slate-100">
              {state.announcements.map((ann) => (
                <article key={ann.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs text-slate-500 font-mono">
                    {ann.createdAt} · {ann.authorName}
                  </p>
                  <h4 className="text-sm font-bold text-[#064E3B] mt-0.5">
                    {getText(lang, ann.titleAm, ann.titleEn)}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {getText(lang, ann.bodyAm, ann.bodyEn)}
                  </p>
                </article>
              ))}
            </section>
          )}
        </div>
      )}

      {/* 2. MANAGE BYLAWS & EDIR RULES */}
      {tab === 'bylaws' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">
              {getText(lang, 'የዕድሩ መተዳደሪያ ደንቦችና ህጎች', 'Published Bylaws & Policy Files')}
            </p>
            <p className="mt-1.5 text-3xl font-bold font-mono tabular-nums text-[#064E3B]">
              {bylawsDocs.length}
            </p>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FilePlus2 className="w-5 h-5 text-[#064E3B]" />
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(
                  lang,
                  'መተዳደሪያ ደንብ እና ህገ-ደንብ መጫኛ',
                  'Upload / Update Bylaws & Edir Rules'
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
                    : '14 KB',
                  fileDataUrl,
                  textPreview: docPreviewText.trim() || undefined,
                  uploadedBy: `${currentUser.fullNameEn} (${ROLE_LABELS[currentUser.role].en})`,
                });
                setDocTitleAm('');
                setDocTitleEn('');
                setDocFile(null);
                setDocPreviewText('');
                setFeedback(
                  getText(
                    lang,
                    'መተዳደሪያ ደንቡ ተቀምጧል።',
                    'Bylaw / rule published.'
                  )
                );
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as 'bylaws' | 'policy')}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="bylaws">{getText(lang, 'መተዳደሪያ ደንብ', 'Edir Bylaws')}</option>
                <option value="policy">{getText(lang, 'የአፈጻጸም መመሪያ', 'Rule / Policy')}</option>
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
                placeholder={getText(lang, 'የደንቡ ይዘት...', 'Bylaw articles or summary...')}
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
                {getText(lang, 'ደንብ አስቀምጥ', 'Save Bylaw')}
              </button>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder={getText(lang, 'ደንብ ይፈልጉ...', 'Search bylaws...')}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowBylawsList((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-semibold rounded-lg cursor-pointer"
              >
                {showBylawsList ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>
                  {showBylawsList
                    ? getText(lang, 'ዝርዝር ደብቅ', 'Hide List')
                    : getText(lang, 'የደንቦች ዝርዝር አሳይ', 'View Bylaws List')}
                </span>
              </button>
            </div>

            {(showBylawsList || docSearch.trim().length > 0) && (
              <div className="divide-y divide-slate-100 pt-2">
                {filteredBylaws.map((d) => (
                  <div
                    key={d.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {getText(lang, d.titleAm, d.titleEn)}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {d.year} · {d.fileSizeLabel}
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
                    getText(lang, 'ፋይሉ ለማውረድ ዝግጁ ነው።', 'Document ready for download.')}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
