import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X } from 'lucide-react';
import { Language } from '../types';
import { getText } from '../i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  lang: Language;
  variant?: 'header' | 'darkHeader';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
  };

  const buttonStyles =
    variant === 'darkHeader'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-[#F59E0B]/50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#064E3B] bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#D97706]/40 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={buttonStyles}
        title={getText(lang, 'አፑን ወደ ስልክዎ ወይም ኮምፒውተርዎ ይጫኑ', 'Install app to device')}
      >
        <Download
          className={`w-3.5 h-3.5 ${
            variant === 'darkHeader' ? 'text-[#F59E0B]' : 'text-[#D97706]'
          }`}
        />
        <span>{getText(lang, 'አፑን ጫን', 'Install App')}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 no-print">
          <div className="w-full max-w-md bg-white border border-[#064E3B]/20 rounded-xl shadow-xl overflow-hidden">
            <div className="bg-[#064E3B] text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-sm sm:text-base font-bold">
                  {getText(
                    lang,
                    'የአለታ ወንዶ ዕድር መተግበሪያን ይጫኑ',
                    'Install Aleta Wondo Edir App'
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
              {isIOS ? (
                <div className="space-y-3">
                  <p className="font-semibold text-[#064E3B]">
                    {getText(
                      lang,
                      'በiPhone / iPad (Safari) ላይ ለመጫን የሚከተሉትን ደረጃዎች ይከተሉ፡',
                      'To install on iPhone / iPad using Safari:'
                    )}
                  </p>
                  <ol className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#064E3B] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {getText(
                          lang,
                          'በSafari የታችኛው (ወይም የላይኛው) አሞሌ ላይ ያለውን',
                          'Tap the'
                        )}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[#064E3B] font-semibold">
                          <Share className="w-3.5 h-3.5" />
                          {getText(lang, 'Share (አጋራ)', 'Share')}
                        </span>
                        {getText(lang, 'ቁልፍ ይንኩ።', 'button in Safari.')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#064E3B] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {getText(lang, 'ወደ ታች ይውረዱና', 'Scroll down and tap')}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[#064E3B] font-semibold">
                          <PlusSquare className="w-3.5 h-3.5" />
                          {getText(lang, 'Add to Home Screen', 'Add to Home Screen')}
                        </span>
                        {getText(lang, 'የሚለውን ይምረጡ።', '.')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#064E3B] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        {getText(
                          lang,
                          'በቀኝ በኩል ያለውን "Add" የሚለውን ይንኩ — አፑ በቀጥታ ከስልክዎ መነሻ ገጽ ላይ ይቀመጣል።',
                          'Tap "Add" in the top-right corner to place the app on your Home Screen.'
                        )}
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-semibold text-[#064E3B]">
                    {getText(
                      lang,
                      'ይህን መተግበሪያ በAndroid ስልክ ወይም በኮምፒውተርዎ ላይ በቀላሉ መጫን ይችላሉ፡',
                      'Install this app on Android or Desktop for fast standalone access:'
                    )}
                  </p>
                  <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs leading-relaxed">
                    <p>
                      <strong className="text-[#064E3B]">Android (Chrome):</strong>{' '}
                      {getText(
                        lang,
                        'የብራውዘሩን ሜኑ (⋮) ይንኩና "Install app" ወይም "Add to Home screen" ይምረጡ።',
                        'Open browser menu (⋮) and tap "Install app" or "Add to Home screen".'
                      )}
                    </p>
                    <p>
                      <strong className="text-[#064E3B]">Desktop (Chrome / Edge):</strong>{' '}
                      {getText(
                        lang,
                        'በአድራሻ አሞሌው (URL bar) በስተቀኝ ያለውን የመጫኛ ምልክት (Install) ይጫኑ።',
                        'Click the Install icon on the right side of your address bar.'
                      )}
                    </p>
                    <p>
                      <strong className="text-[#064E3B]">iPhone / iPad (Safari):</strong>{' '}
                      {getText(
                        lang,
                        'የSafari "Share" ቁልፍን ይንኩና "Add to Home Screen" የሚለውን ይምረጡ።',
                        'Tap Share in Safari and select "Add to Home Screen".'
                      )}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {getText(lang, 'ዝጋ', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
