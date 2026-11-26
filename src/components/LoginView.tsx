import React, { useState } from 'react';
import { Globe, Lock, Mail, ArrowRight } from 'lucide-react';
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { Language, MemberRecord } from '../types';
import { COPY, ORG_NAME, getText } from '../i18n';
import { DEFAULT_TEMP_PASSWORD, verifyPassword } from '../utils/password';

export interface GoogleAuthPayload {
  email: string;
  displayName: string;
  photoURL?: string;
}

interface LoginViewProps {
  lang: Language;
  onToggleLang: () => void;
  members: MemberRecord[];
  onLoginSuccess: (member: MemberRecord, usedDefaultTemp?: boolean) => void;
  onGoogleSignIn: (payload: GoogleAuthPayload) => {
    ok: boolean;
    messageAm?: string;
    messageEn?: string;
  };
}

export const LoginView: React.FC<LoginViewProps> = ({
  lang,
  onToggleLang,
  members,
  onLoginSuccess,
  onGoogleSignIn,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleClick = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      const profile = additionalInfo?.profile as Record<string, unknown> | undefined;
      const resolvedEmail =
        user.email ||
        user.providerData?.find((p) => Boolean(p?.email))?.email ||
        (typeof profile?.email === 'string' ? profile.email : '') ||
        '';

      if (!resolvedEmail) {
        setErrorMsg(
          getText(
            lang,
            'ከGoogle መለያዎ ኢሜይል ማግኘት አልተቻለም። በFirebase Console (Authentication → Settings → User account linking) ውስጥ "Link accounts that use the same email" መመረጡን ያረጋግጡ።',
            'Unable to read email from Google token. Check Firebase Console → Authentication → Settings → User account linking and enable email linking.'
          )
        );
        return;
      }

      const resolvedName =
        user.displayName ||
        user.providerData?.find((p) => Boolean(p?.displayName))?.displayName ||
        (typeof profile?.name === 'string' ? profile.name : '') ||
        resolvedEmail.split('@')[0];

      const resolvedPhoto =
        user.photoURL ||
        user.providerData?.find((p) => Boolean(p?.photoURL))?.photoURL ||
        (typeof profile?.picture === 'string' ? profile.picture : undefined);

      const res = onGoogleSignIn({
        email: resolvedEmail,
        displayName: resolvedName,
        photoURL: resolvedPhoto,
      });
      if (!res.ok) {
        setInfoMsg(getText(lang, res.messageAm || '', res.messageEn || ''));
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg(
          getText(
            lang,
            'የGoogle መግቢያ መስኮቱ ተዘግቷል። እባክዎ እንደገና ይሞክሩ።',
            'Google Sign-In popup was closed before completing.'
          )
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          getText(
            lang,
            'በFirebase Console (Authentication → Sign-in method) ውስጥ Google Sign-In መንቃቱን ያረጋግጡ።',
            'Please enable Google Sign-In in Firebase Console (Authentication → Sign-in method) for project aleta-pt.'
          )
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(
          getText(
            lang,
            'ይህ ዶሜይን በFirebase Console (Authentication → Settings → Authorized domains) ውስጥ መጨመር አለበት።',
            'Add this app domain to Firebase Console → Authentication → Settings → Authorized domains.'
          )
        );
      } else {
        setErrorMsg(
          getText(
            lang,
            'በGoogle መግባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
            'Google Sign-In failed. Please try again or sign in with your credentials.'
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    const query = identifier.trim().toLowerCase();
    if (!query) {
      setErrorMsg(
        getText(
          lang,
          'እባክዎ ኢሜይል፣ ስልክ ቁጥር ወይም የአባል መለያ (EAW-...) ያስገቡ።',
          'Please enter your email, phone number, or Member ID (e.g., EAW-008).'
        )
      );
      return;
    }
    if (!password.trim()) {
      setErrorMsg(
        getText(
          lang,
          'እባክዎ የይለፍ ቃልዎን ያስገቡ (አዲስ ከሆነ ነባሪው Edir@1234 ነው)።',
          'Please enter your password (default temporary password is Edir@1234).'
        )
      );
      return;
    }

    setLoading(true);
    try {
      const matched = members.find(
        (m) =>
          m.email.toLowerCase() === query ||
          (m.googleEmail && m.googleEmail.toLowerCase() === query) ||
          m.phone.replace(/\s+/g, '') === query.replace(/\s+/g, '') ||
          m.memberCode.toLowerCase() === query
      );

      if (!matched) {
        setErrorMsg(
          getText(
            lang,
            'መለያው አልተገኘም። እባክዎ ትክክለኛ ኢሜይል/ስልክ/መለያ ያስገቡ።',
            'Account not found. Please check your email, phone, or member ID.'
          )
        );
        return;
      }

      if (matched.accessStatus === 'suspended' || matched.locked) {
        setErrorMsg(
          getText(
            lang,
            'ይህ መለያ በሲስተም አስተዳዳሪ (ምስጋና ተስፋዬ) ታግዷል ወይም ተቆልፏል። እባክዎ የሲስተም አስተዳዳሪውን ያነጋግሩ።',
            'This account is suspended or locked. Please contact Misgana Tesfaye (Auditor & IT System Admin).'
          )
        );
        return;
      }

      if (matched.accessStatus === 'pending' || matched.approvalStatus !== 'approved') {
        setErrorMsg(
          getText(
            lang,
            'መለያዎ የዋና ሰብሳቢ ማጽደቂያ እና የሲስተም አስተዳዳሪ (ምስጋና ተስፋዬ) የመግቢያ ፈቃድ በመጠባበቅ ላይ ነው።',
            'Your account is awaiting Chairman approval and IT System Admin (Misgana Tesfaye) access activation.'
          )
        );
        return;
      }

      const validLocalPassword = await verifyPassword(
        password.trim(),
        matched.passwordHash
      );

      let validFirebasePassword = false;
      if (!validLocalPassword && matched.email) {
        try {
          await signInWithEmailAndPassword(auth, matched.email, password.trim());
          validFirebasePassword = true;
        } catch {
          validFirebasePassword = false;
        }
      }

      if (!validLocalPassword && !validFirebasePassword) {
        setErrorMsg(
          getText(
            lang,
            'የገባው የይለፍ ቃል ትክክል አይደለም። የመጀመሪያ ጊዜ ተጠቃሚ ከሆኑ ነባሪውን Edir@1234 ወይም ከአስተዳዳሪ የተሰጠዎትን ጊዜያዊ ቃል ይጠቀሙ።',
            'Incorrect password. If logging in for the first time, enter Edir@1234 or the temporary password given by IT Admin.'
          )
        );
        return;
      }

      const tempPwd = matched.defaultTempPassword || DEFAULT_TEMP_PASSWORD;
      const usedDefaultTemp =
        Boolean(matched.mustChangePassword) || password.trim() === tempPwd;

      onLoginSuccess(matched, usedDefaultTemp);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Language Bar — Strict Deep Forest Green & Gold Brand */}
      <header className="w-full bg-[#064E3B] text-white border-b border-[#D97706]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/aistudio/logo_27d4fad1.png"
              alt="Aleta Wondo Youth Mutual Aid Edir Emblem"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#F59E0B] bg-white shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-sm sm:text-base text-white truncate">
              {getText(lang, ORG_NAME.shortAm, ORG_NAME.shortEn)}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleLang}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#064E3B] bg-[#F59E0B] hover:bg-[#D97706] hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>{COPY[lang].languageToggle}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center">
        {/* Sign-in Card */}
        <section className="w-full bg-white border border-[#064E3B]/20 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <img
              src="/assets/aistudio/logo_27d4fad1.png"
              alt="Edir Official Seal"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#D97706] shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[#064E3B] leading-snug text-balance">
                {getText(lang, ORG_NAME.am, ORG_NAME.en)}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                {getText(lang, ORG_NAME.addressAm, ORG_NAME.addressEn)}
              </p>
            </div>
          </div>

          <h2 className="text-base font-bold text-[#064E3B]">
            {COPY[lang].loginTitle}
          </h2>
          <p className="text-xs text-slate-600 mt-1 mb-5">
            {COPY[lang].loginSubtitle}
          </p>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
                {COPY[lang].emailOrPhone}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#047857] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="EAW-008 / +2519... / name@aletawondoedir.org"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#064E3B]">
                  {COPY[lang].password}
                </label>
                <span className="text-[11px] font-mono text-[#D97706] font-semibold">
                  {getText(lang, 'ነባሪ፡ Edir@1234', 'Default: Edir@1234')}
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#047857] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="p-3 text-xs text-slate-900 bg-[#F59E0B]/15 border border-[#D97706]/40 rounded-lg">
                {infoMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <span>{COPY[lang].signIn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2.5 bg-white text-slate-400">
                {getText(lang, 'ወይም', 'or')}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleClick}
            className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#064E3B]/30 text-[#064E3B] text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>
              {getText(
                lang,
                'በGoogle ይግቡ (የአስተዳዳሪ / የተፈቀደለት መለያ)',
                'Sign in with Google (Admin & Authorized)'
              )}
            </span>
          </button>

          <p className="mt-5 text-[11px] text-slate-600 leading-relaxed">
            {getText(
              lang,
              'አዲስ አባላት በጊዜያዊ የይለፍ ቃል (Edir@1234) ከገቡ በኋላ ወዲያውኑ የራሳቸውን የግል የይለፍ ቃል በስርዓቱ ውስጥ ማስቀመጥ ይችላሉ (ምንም ኢሜይል አይላክም)።',
              'First-time users sign in with their assigned ID/phone and temporary password (Edir@1234) and set their own personal password directly in the app—no emails required.'
            )}
          </p>
        </section>
      </main>
    </div>
  );
};
