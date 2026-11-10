import React from 'react';
import { RefreshCw, Settings, Database, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  user: User | null;
  hasToken: boolean;
  hasHermesToken: boolean;
  isLiveMode: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onToggleDemoMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasToken,
  hasHermesToken,
  isLiveMode,
  isLoading,
  onRefresh,
  onOpenSettings,
  onGoogleSignIn,
  onGoogleSignOut,
  onToggleDemoMode,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src="/assets/aistudio/refumo_orange_no_backround_0ec90715.png"
                alt="REFUMO Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveMode && hasToken ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isLiveMode && hasToken ? 'bg-emerald-500' : 'bg-orange-500'}`} />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-widest text-slate-200 uppercase">
                  ASSEDGE
                </h1>
                <span className={`hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  isLiveMode
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
                    : 'bg-orange-950/40 text-orange-400 border-orange-800/60'
                }`}>
                  <Database className="w-3 h-3 text-[#FF6400]" />
                  {isLiveMode ? 'Live CRM' : 'Demo Mode'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Tools & Status */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center justify-center p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition disabled:opacity-50 hover:border-[#FF6400]/50"
              title="Refresh CRM assets"
              aria-label="Refresh records"
            >
              <RefreshCw className={`w-4 h-4 text-slate-200 ${isLoading ? 'animate-spin text-[#FF6400]' : ''}`} />
            </button>

            {/* Sam AI Status Badge */}
            <button
              onClick={onOpenSettings}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition ${
                hasHermesToken
                  ? 'bg-slate-800/80 text-emerald-400 border-emerald-900/60 hover:bg-slate-800'
                  : 'bg-orange-950/50 text-orange-300 border-[#FF6400]/50 hover:bg-orange-900/50'
              }`}
              title={hasHermesToken ? 'Sam AI connection is ready' : 'Configure Sam AI token'}
            >
              {hasHermesToken ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sam AI Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-[#FF6400]" />
                  <span>Connect Sam AI</span>
                </>
              )}
            </button>

            {/* Install PWA Button */}
            <PWAInstallButton compact />

            {/* Google Account / Sign-in */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg p-1 sm:px-2.5 sm:py-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-6 h-6 rounded-full border border-orange-500/50"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-orange-600/30 text-orange-400 flex items-center justify-center text-xs font-bold">
                    {(user.email || user.displayName || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-slate-200 max-w-[100px] truncate hidden md:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={onGoogleSignOut}
                  className="text-slate-400 hover:text-red-400 p-1"
                  title="Sign out of Google"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
                title="Sign in with Google"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700 border border-slate-700/80 rounded-lg transition"
              title="Open Settings & Sam AI Configuration"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-orange-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
