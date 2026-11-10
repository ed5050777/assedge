import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-lg">
        <Check className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">PWA Installed</span>
      </span>
    );
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        disabled={installing}
        className={`flex items-center gap-1.5 font-bold text-white bg-[#FF6400] hover:bg-[#FF751A] rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 shadow-[#FF6400]/20 ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
        }`}
        title="Install REFUMO ASSEDGE on this device"
      >
        <Download className="w-4 h-4" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-[#FF6400]/50 rounded-xl transition active:scale-95 ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
          }`}
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-4 h-4 text-[#FF6400]" />
          <span>{compact ? 'iOS App' : 'Add to iPhone'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/refumo_orange_no_backround_0ec90715.png"
                    alt="Refumo Logo"
                    className="w-8 h-8 object-contain"
                  />
                  <h3 className="font-semibold text-white">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                To run REFUMO ASSEDGE full-screen without Safari browser bars:
              </p>
              <ol className="text-sm text-slate-300 space-y-2.5 mb-5 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#FF6400]">1.</span>
                  <span>
                    Tap the <strong>Share</strong> button (box with upward arrow) at the bottom of Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#FF6400]">2.</span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#FF6400]">3.</span>
                  <span>
                    Tap <strong>Add</strong> in the top-right corner.
                  </span>
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#FF6400] hover:bg-[#FF751A] font-bold text-white transition text-sm shadow-md shadow-[#FF6400]/20"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
