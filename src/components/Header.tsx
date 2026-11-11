import React from 'react';
import { RefreshCw, Settings, Database, LogOut, CheckCircle2, AlertCircle, Server } from 'lucide-react';
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
  hasHermesToken,
  isLiveMode,
  isLoading,
  onRefresh,
  onOpenSettings,
  onGoogleSignIn,
  onGoogleSignOut,
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
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveMode ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isLiveMode ? 'bg-emerald-500' : 'bg-orange-500'}`} />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-widest text-slate-200 uppercase">
                  ASSEDGE
                </h1>
                <span className={`hidden md:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isLiveMode
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80 shadow-xs'
                    : 'bg-orange-950/40 text-orange-400 border-orange-800/60'
                }`}>
                  <Server className="w-3 h-3 text-emerald-400" />
                  {isLiveMode ? 'PostgreSQL Live' : 'Demo Mode'}
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
              title="Refresh PostgreSQL assets"
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

            {/* Optional Google Account */}
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
            ) : null}

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700 border border-slate-700/80 rounded-lg transition"
              title="Open Settings & Database Configuration"
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
