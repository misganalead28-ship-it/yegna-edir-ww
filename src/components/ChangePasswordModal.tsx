import React, { useState } from 'react';
import { CheckCircle2, KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { Language, MemberRecord } from '../types';
import { COPY, getText } from '../i18n';
import { DEFAULT_TEMP_PASSWORD, hashPassword, verifyPassword } from '../utils/password';

interface ChangePasswordModalProps {
  lang: Language;
  currentUser: MemberRecord;
  forced?: boolean;
  onClose?: () => void;
  onPasswordUpdated: (newPasswordHash: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  lang,
  currentUser,
  forced = false,
  onClose,
  onPasswordUpdated,
}) => {
  const [currentPassword, setCurrentPassword] = useState(
    forced ? currentUser.defaultTempPassword || DEFAULT_TEMP_PASSWORD : ''
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!forced) {
      const ok = await verifyPassword(currentPassword, currentUser.passwordHash);
      if (!ok) {
        setErrorMsg(
          getText(
            lang,
            'አሁን ያለው የይለፍ ቃል ትክክል አይደለም። (ነባሪ ከሆነ Edir@1234 ይሞክሩ)',
            'Current password is incorrect. (If using default, try Edir@1234)'
          )
        );
        return;
      }
    }

    if (newPassword.trim().length < 6) {
      setErrorMsg(
        getText(
          lang,
          'አዲሱ የይለፍ ቃል ቢያንስ 6 ቁምፊዎች (characters) መሆን አለበት።',
          'New password must be at least 6 characters.'
        )
      );
      return;
    }

    const tempCheck = currentUser.defaultTempPassword || DEFAULT_TEMP_PASSWORD;
    if (newPassword.trim() === tempCheck) {
      setErrorMsg(
        getText(
          lang,
          'እባክዎ ከጊዜያዊ ነባሪ የይለፍ ቃል የተለየ የግል የይለፍ ቃል ይምረጡ።',
          'Please choose a personal password different from the temporary default password.'
        )
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(
        getText(
          lang,
          'አዲሱ የይለፍ ቃል እና ማረጋገጫው አይመሳሰሉም።',
          'New password and confirmation do not match.'
        )
      );
      return;
    }

    setSaving(true);
    try {
      const digest = await hashPassword(newPassword.trim());
      onPasswordUpdated(digest);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#064E3B]/55 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-[#064E3B]/20 rounded-xl overflow-hidden shadow-xl">
        <div className="bg-[#064E3B] text-white px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-[#F59E0B]" />
            <div>
              <h2 className="text-base font-bold">
                {forced
                  ? getText(
                      lang,
                      'የግል የይለፍ ቃልዎን ያዘጋጁ',
                      'Set Your Personal Password'
                    )
                  : COPY[lang].changePassword}
              </h2>
              <p className="text-xs text-white/80">
                {getText(lang, currentUser.fullNameAm, currentUser.fullNameEn)} ·{' '}
                <span className="font-mono">{currentUser.memberCode}</span>
              </p>
            </div>
          </div>
          {!forced && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#047857] text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {forced && (
            <div className="p-3.5 bg-[#F59E0B]/10 border border-[#D97706]/30 rounded-lg flex items-start gap-2.5 text-xs text-slate-800">
              <ShieldCheck className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <span>
                {getText(
                  lang,
                  'በጊዜያዊ ነባሪ የይለፍ ቃል ለመጀመሪያ ጊዜ ገብተዋል። ለደህንነትዎ ወዲያውኑ የግል የይለፍ ቃልዎን እዚህ ያስቀምጡ (ምንም የኢሜይል ማረጋገጫ አያስፈልግም)።',
                  'You signed in with a temporary default password. Please set your personal password now to continue (no email confirmation required).'
                )}
              </span>
            </div>
          )}

          {!forced && (
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
                {getText(lang, 'አሁን ያለው የይለፍ ቃል', 'Current Password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#064E3B]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
              {getText(lang, 'አዲስ የግል የይለፍ ቃል (ቢያንስ 6 ቁምፊ)', 'New Personal Password (min 6 chars)')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#064E3B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
              {getText(lang, 'አዲሱን የይለፍ ቃል ያረጋግጡ', 'Confirm New Password')}
            </label>
            <div className="relative">
              <CheckCircle2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#064E3B]"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            {!forced && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                {COPY[lang].cancel}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60"
            >
              {saving
                ? getText(lang, 'በማስቀመጥ ላይ...', 'Saving...')
                : getText(lang, 'የይለፍ ቃል አስቀምጥ', 'Save New Password')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
