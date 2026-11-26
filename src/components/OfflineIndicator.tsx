import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Language } from '../types';
import { getText } from '../i18n';

export const OfflineIndicator: React.FC<{ lang: Language }> = ({ lang }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#D97706] px-3.5 py-2 text-xs font-semibold text-white shadow-lg no-print">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {getText(
          lang,
          'ከመስመር ውጭ — የተቀመጡ መረጃዎች በመጠቀም ላይ።',
          'Offline Mode — Cached data is being used.'
        )}
      </span>
    </div>
  );
};
