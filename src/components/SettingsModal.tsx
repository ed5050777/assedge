import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Database,
  Check,
  Trash2,
  ExternalLink,
  Smartphone,
  Eye,
  EyeOff,
  Server,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  getSavedHermesToken,
  saveHermesToken,
  clearHermesToken,
  getSavedHermesUrl,
  saveHermesUrl,
  HERMES_DEFAULT_URL,
  tokenFingerprint
} from '../lib/hermes';
import {
  getSQLBaseUrl,
  getSQLToken,
  saveSQLConfig,
  resetSQLConfig,
  testSQLConnection,
  DEFAULT_SQL_BASE_URL
} from '../lib/api';
import { ID, GID, SHEET } from '../lib/sheets';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  hasGoogleToken: boolean;
  isLiveMode: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onToggleLiveMode: (live: boolean) => void;
  onTokenUpdated: () => void;
  onRefreshData?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  isLiveMode,
  onGoogleSignIn,
  onGoogleSignOut,
  onToggleLiveMode,
  onTokenUpdated,
  onRefreshData,
}) => {
  // Sam AI Hermes state
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [hermesUrlInput, setHermesUrlInput] = useState('');
  const [tokenStatus, setTokenStatus] = useState<string>('');
  const [fingerprintInfo, setFingerprintInfo] = useState<{ length: number; fingerprint: string } | null>(null);
  const [savedTokenExists, setSavedTokenExists] = useState(false);

  // PostgreSQL REST API state
  const [sqlBaseUrl, setSqlBaseUrl] = useState('');
  const [sqlToken, setSqlToken] = useState('');
  const [showSqlToken, setShowSqlToken] = useState(false);
  const [isTestingSql, setIsTestingSql] = useState(false);
  const [sqlTestResult, setSqlTestResult] = useState<{ success: boolean; totalCount?: number; error?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load Hermes settings
      const savedHermes = getSavedHermesToken();
      setSavedTokenExists(Boolean(savedHermes));
      setHermesUrlInput(getSavedHermesUrl());
      setTokenStatus(
        savedHermes
          ? 'Token is securely saved in this browser for Sam AI tasks.'
          : 'No token saved. Enter the assedge webhook token to dispatch tasks to Sam AI.'
      );
      if (savedHermes) {
        tokenFingerprint(savedHermes).then(setFingerprintInfo).catch(() => {});
      } else {
        setFingerprintInfo(null);
      }

      // Load SQL settings
      setSqlBaseUrl(getSQLBaseUrl());
      setSqlToken(getSQLToken());
      setSqlTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sam AI handlers
  const handleSaveToken = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTokenStatus('Please enter or paste a valid token first.');
      return;
    }
    saveHermesToken(trimmed);
    setTokenInput('');
    setSavedTokenExists(true);
    setTokenStatus('Sam AI token saved successfully on this device.');
    const info = await tokenFingerprint(trimmed).catch(() => null);
    setFingerprintInfo(info);
    onTokenUpdated();
  };

  const handleClearToken = () => {
    clearHermesToken();
    setSavedTokenExists(false);
    setFingerprintInfo(null);
    setTokenInput('');
    setTokenStatus('Sam AI token has been cleared from this device.');
    onTokenUpdated();
  };

  const handleSaveUrl = () => {
    saveHermesUrl(hermesUrlInput);
    setTokenStatus('Hermes webhook endpoint updated.');
  };

  const handleResetUrl = () => {
    setHermesUrlInput(HERMES_DEFAULT_URL);
    saveHermesUrl(HERMES_DEFAULT_URL);
    setTokenStatus('Hermes webhook endpoint reset to default.');
  };

  // SQL handlers
  const handleSaveSqlConfig = () => {
    saveSQLConfig(sqlBaseUrl, sqlToken);
    setSqlTestResult({ success: true, error: 'SQL configuration saved.' });
    if (onRefreshData) onRefreshData();
  };

  const handleResetSqlConfig = () => {
    resetSQLConfig();
    setSqlBaseUrl(DEFAULT_SQL_BASE_URL);
    setSqlToken(getSQLToken());
    setSqlTestResult({ success: true, error: 'SQL endpoint & token reset to default.' });
    if (onRefreshData) onRefreshData();
  };

  const handleTestSqlConnection = async () => {
    setIsTestingSql(true);
    setSqlTestResult(null);
    try {
      const result = await testSQLConnection(sqlBaseUrl, sqlToken);
      setSqlTestResult(result);
    } finally {
      setIsTestingSql(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/refumo_orange_no_backround_0ec90715.png"
              alt="Refumo Logo"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h3 className="text-lg font-bold text-white">REFUMO ASSEDGE Settings</h3>
              <p className="text-xs text-slate-400">PostgreSQL Server, Sam AI & Database Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Section 1: PostgreSQL REST API Connection */}
          <div className="space-y-4 rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-white">PostgreSQL Server (REST API)</h4>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border bg-emerald-950/80 text-emerald-400 border-emerald-800">
                Primary Database: hermes
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Connects directly to the PostgreSQL database table <code className="text-orange-300 font-mono">public.assets</code> via PostgREST HTTPS API over Tailscale. All edits (price, tags, description) are written immediately to the database.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PostgREST Base URL
                </label>
                <input
                  type="text"
                  value={sqlBaseUrl}
                  onChange={(e) => setSqlBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs font-mono outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Bearer Token (Authorization)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSqlToken(!showSqlToken)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showSqlToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSqlToken ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showSqlToken ? 'text' : 'password'}
                  value={sqlToken}
                  onChange={(e) => setSqlToken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs font-mono outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestSqlConnection}
                  disabled={isTestingSql}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  {isTestingSql ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{isTestingSql ? 'Testing…' : 'Test SQL Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSqlConfig}
                  className="px-4 py-2 bg-[#FF6400] hover:bg-[#FF751A] text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  Save Config
                </button>

                <button
                  type="button"
                  onClick={handleResetSqlConfig}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
                >
                  Reset Default
                </button>
              </div>

              {sqlTestResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  sqlTestResult.success
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}>
                  {sqlTestResult.success ? (
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  )}
                  <span>
                    {sqlTestResult.success
                      ? `Connected successfully! Found ${sqlTestResult.totalCount !== undefined ? sqlTestResult.totalCount.toLocaleString() : 'all'} assets in PostgreSQL.`
                      : `Connection failed: ${sqlTestResult.error}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Sam AI Connection */}
          <div className="space-y-4 rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-orange-400" />
                <h4 className="font-semibold text-white">Sam AI Webhook Connection</h4>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                savedTokenExists
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : 'bg-rose-950/80 text-rose-400 border-rose-800'
              }`}>
                {savedTokenExists ? 'Token Active' : 'Token Missing'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              To send instructions to Sam AI from this device, save your administrator-provided{' '}
              <code className="text-orange-300 font-mono">X-Gitlab-Token</code>. It is saved in your local browser storage and never shared.
            </p>

            {/* Token Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                {savedTokenExists ? 'Update Webhook Token' : 'Enter Webhook Token'}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={savedTokenExists ? 'Enter new token to replace existing' : 'Paste your X-Gitlab-Token'}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleSaveToken}
                  disabled={!tokenInput.trim()}
                  className="px-4 py-2 bg-[#FF6400] hover:bg-[#FF751A] text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 shadow-[#FF6400]/20"
                >
                  Save Token
                </button>

                {savedTokenExists && (
                  <button
                    onClick={handleClearToken}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-800 text-xs font-medium rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Saved Token</span>
                  </button>
                )}
              </div>
            </div>

            {/* Fingerprint verification */}
            {fingerprintInfo && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-400">Verified Token Fingerprint:</div>
                <div className="text-[#FF6400] font-semibold">
                  Length: {fingerprintInfo.length} chars · SHA-256: {fingerprintInfo.fingerprint}…
                </div>
              </div>
            )}

            {tokenStatus && (
              <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                {tokenStatus}
              </p>
            )}

            {/* Endpoint configuration */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Sam AI Endpoint URL</label>
                <button
                  onClick={handleResetUrl}
                  className="text-[11px] text-[#FF8533] hover:underline"
                >
                  Reset Default
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={hermesUrlInput}
                  onChange={(e) => setHermesUrlInput(e.target.value)}
                  className="flex-1 py-2 px-3 bg-slate-900 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs font-mono outline-none"
                />
                <button
                  onClick={handleSaveUrl}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl text-slate-200 border border-slate-700 hover:border-[#FF6400]/40"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Google CRM Spreadsheet Reference (Secondary) */}
          <div className="space-y-4 rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <h4 className="font-semibold text-slate-200">Google Sheet Archive Reference</h4>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border bg-slate-800 text-slate-400 border-slate-700">
                Optional
              </span>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>Spreadsheet ID: <span className="font-mono text-slate-300">{ID}</span></p>
              <p>Sheet Tab GID: <span className="font-mono text-slate-300">{GID}</span></p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={SHEET}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                <span>Open Google Sheet in Browser</span>
              </a>

              {user ? (
                <button
                  onClick={onGoogleSignOut}
                  className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-medium rounded-xl border border-rose-800 transition"
                >
                  Sign Out of Google
                </button>
              ) : (
                <button
                  onClick={onGoogleSignIn}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
                >
                  Sign in with Google (Optional)
                </button>
              )}
            </div>
          </div>

          {/* Section 4: Web & Mobile Information */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Smartphone className="w-4 h-4 text-orange-400" />
              <span>Mobile & Progressive Web App (PWA)</span>
            </div>
            <p className="leading-relaxed">
              REFUMO ASSEDGE is fully optimized for smartphones, tablets, and desktops. You can install this app directly onto your home screen by clicking the <strong>Install App</strong> button in the header (or via Safari's "Add to Home Screen" on iOS).
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#FF6400] hover:bg-[#FF751A] font-bold text-white text-xs sm:text-sm rounded-xl transition shadow-md shadow-[#FF6400]/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
