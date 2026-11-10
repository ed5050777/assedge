import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC<{ onReconnect?: () => void }> = ({ onReconnect }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
    <aside
      aria-label="Network status banner"
      className="bg-amber-600 text-amber-50 px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between sticky top-0 z-40 shadow-sm border-b border-amber-700/50"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 animate-pulse" />
        <span>Offline Mode — Showing locally cached CRM data & drafts</span>
      </div>
      {onReconnect && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1 bg-amber-700 hover:bg-amber-800 px-2 py-0.5 rounded text-xs transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </aside>
  );
};
