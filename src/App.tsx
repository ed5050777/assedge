import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { AssetCard } from './components/AssetCard';
import { SettingsModal } from './components/SettingsModal';
import { OfflineBanner } from './components/OfflineBanner';
import { AssetRecord, SortMode, HermesDeliveryStatus, AssetUpdatePayload, AssetRecordData } from './types';
import { sortRecords } from './lib/sheets';
import {
  fetchSQLAssets,
  updateSQLAsset,
  sqlRowToAssetRecord
} from './lib/api';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessToken
} from './lib/auth';
import {
  getSavedHermesToken,
  sendHermes
} from './lib/hermes';
import {
  getStoredCRMRecords,
  setStoredCRMRecords,
  clearStoredCRMRecords
} from './lib/cache';
import { SAMPLE_RECORDS } from './lib/sampleData';
import {
  ChevronDown,
  RefreshCw,
  Server
} from 'lucide-react';

const DRAFTS_KEY = 'refumo_instruction_drafts_v1';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleTokenState] = useState<string | null>(() => getAccessToken());
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Loading assets from PostgreSQL…');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Filters & display
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<'any' | 'all'>('any');
  const [sortMode, setSortMode] = useState<SortMode>('modified');
  const [starredOnly, setStarredOnly] = useState<boolean>(false);
  const [limit, setLimit] = useState<number>(40);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sam AI Hermes state
  const [hasHermesToken, setHasHermesToken] = useState<boolean>(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [deliveries, setDeliveries] = useState<Record<string, HermesDeliveryStatus>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Check saved token and drafts on mount
  useEffect(() => {
    const savedToken = getSavedHermesToken();
    setHasHermesToken(Boolean(savedToken));

    try {
      const savedDrafts = localStorage.getItem(DRAFTS_KEY);
      if (savedDrafts) {
        setDrafts(JSON.parse(savedDrafts));
      }
    } catch {
      // ignore
    }

    // Load local IndexedDB cache first for instant startup
    getStoredCRMRecords().then((cached) => {
      if (cached && Array.isArray(cached.records) && cached.records.length > 0) {
        const sortedCached = sortRecords(cached.records, 'modified');
        setRecords(sortedCached);
        setLastUpdated(cached.timestamp || Date.now());
        setStatusMessage(`${sortedCached.length} assets loaded (cached).`);
        setIsLiveMode(true);
      }
    });
  }, []);

  // Save drafts to localStorage
  const updateDraft = useCallback((assetId: string, text: string) => {
    setDrafts((prev) => {
      const next = { ...prev, [assetId]: text };
      try {
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Initialize Firebase Auth listener (optional)
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setGoogleTokenState(token);
        }
      },
      () => {
        setUser(null);
        setGoogleTokenState(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load CRM Data (fetches all live assets from PostgreSQL REST API)
  const loadCRMData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setStatusMessage('Connecting to PostgreSQL database…');
      const liveRecords = await fetchSQLAssets(5000);
      const sortedRecords = sortRecords(liveRecords, 'modified');
      setRecords(sortedRecords);
      setIsLiveMode(true);
      setErrorMessage(null);
      const now = Date.now();
      setLastUpdated(now);
      setStatusMessage(`${sortedRecords.length} assets loaded from SQL.`);

      // Persist in IndexedDB for instant offline and reload access
      await setStoredCRMRecords(sortedRecords, now);
    } catch (err: any) {
      console.error('Error fetching live SQL assets:', err);

      // Check if we have cached records in IndexedDB
      const cached = await getStoredCRMRecords();
      if (cached && Array.isArray(cached.records) && cached.records.length > 0) {
        const sortedCached = sortRecords(cached.records, 'modified');
        setRecords(sortedCached);
        setLastUpdated(cached.timestamp);
        setStatusMessage(`${sortedCached.length} assets loaded from cache.`);
        setIsLiveMode(true);
        setErrorMessage(
          `Unable to refresh from SQL server (${err.message || 'Network error'}). Showing cached assets.`
        );
        return;
      }

      // Fallback only if completely unavailable
      const sortedSample = sortRecords(SAMPLE_RECORDS, 'modified');
      setRecords(sortedSample);
      setIsLiveMode(false);
      setStatusMessage(`${sortedSample.length} assets loaded (Demo Mode).`);
      setErrorMessage(`Unable to connect to PostgreSQL server: ${err.message || 'Connection failed'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load from SQL on mount
  useEffect(() => {
    loadCRMData();
  }, [loadCRMData]);

  // Update asset fields directly in PostgreSQL via PATCH /assets?asset_id=eq.<id>
  const handleUpdateAsset = useCallback(async (assetId: string, updates: AssetUpdatePayload) => {
    const updatedRow = await updateSQLAsset(assetId, updates);

    setRecords((prev) => {
      const next = prev.map((r) => {
        if (r.data.asset_id === assetId) {
          const mergedData: AssetRecordData = { ...r.data, ...updatedRow };
          return sqlRowToAssetRecord(mergedData, r.row - 1);
        }
        return r;
      });

      // Update IndexedDB cache asynchronously
      setStoredCRMRecords(next, Date.now()).catch(() => {});
      return next;
    });
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    loadCRMData(true);
  };

  // Google Sign In handler (optional)
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setGoogleTokenState(res.accessToken);
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setErrorMessage(err.message || 'Google Sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign Out handler
  const handleGoogleSignOut = async () => {
    await logout();
    setUser(null);
    setGoogleTokenState(null);
  };

  // Toggle card expansion
  const toggleCard = (assetId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  // Send instruction to Sam AI
  const handleSendToSamAI = async (assetId: string, instructions: string) => {
    const token = getSavedHermesToken();
    if (!token) {
      setIsSettingsOpen(true);
      return;
    }

    setDeliveries((prev) => ({
      ...prev,
      [assetId]: { pending: true, message: 'Sending to Sam AI…' },
    }));

    try {
      const result = await sendHermes(assetId, instructions, token);
      setDeliveries((prev) => ({
        ...prev,
        [assetId]: { pending: false, message: result || 'Received by Sam AI.', timestamp: Date.now() },
      }));
      // Clear draft on success
      updateDraft(assetId, '');
    } catch (error: any) {
      setDeliveries((prev) => ({
        ...prev,
        [assetId]: { pending: false, message: error.message || 'Sam AI request failed.', error: true },
      }));
    }
  };

  // Compute unique Types, Statuses and Tags for filter dropdowns
  const { availableTypes, availableStatuses, availableTags } = useMemo(() => {
    const typeSet = new Set<string>();
    const statusSet = new Set<string>();
    const tagCountMap = new Map<string, number>();

    records.forEach((r) => {
      if (r.data.type) typeSet.add(r.data.type);
      if (r.data.status) statusSet.add(r.data.status);
      const rawTags = r.data.tags || '';
      if (rawTags) {
        const split = rawTags.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
        split.forEach((t) => {
          tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1);
        });
      }
    });

    const sortedTags = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

    return {
      availableTypes: Array.from(typeSet).sort(),
      availableStatuses: Array.from(statusSet).sort(),
      availableTags: sortedTags,
    };
  }, [records]);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    const terms = searchQuery.normalize('NFKD').toLowerCase().trim().split(/\s+/).filter(Boolean);

    const matches = records.filter((r) => {
      if (selectedType && r.data.type !== selectedType) return false;
      if (selectedStatus && r.data.status !== selectedStatus) return false;
      if (starredOnly) {
        const isStarred = r.data.starred === 'Yes' || r.data.starred === 'true' || r.data.starred === '1';
        if (!isStarred) return false;
      }

      // Filter by selected tags
      if (selectedTags.length > 0) {
        const recordTags = (r.data.tags || '')
          .split(/[,;\n]/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);

        if (tagMatchMode === 'all') {
          const hasAll = selectedTags.every((st) => recordTags.includes(st.toLowerCase()));
          if (!hasAll) return false;
        } else {
          const hasAny = selectedTags.some((st) => recordTags.includes(st.toLowerCase()));
          if (!hasAny) return false;
        }
      }

      for (const term of terms) {
        if (!r.search.includes(term)) return false;
      }
      return true;
    });

    return sortRecords(matches, sortMode);
  }, [records, searchQuery, selectedType, selectedStatus, selectedTags, tagMatchMode, sortMode, starredOnly]);

  const visibleRecords = useMemo(() => {
    return filteredRecords.slice(0, limit);
  }, [filteredRecords, limit]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setLimit(40);
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    setLimit(40);
  };

  const handleSelectTagFromCard = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setLimit(40);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedTags([]);
    setTagMatchMode('any');
    setStarredOnly(false);
    setLimit(40);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 selection:bg-orange-500 selection:text-white">
      {/* Offline banner */}
      <OfflineBanner onReconnect={handleRefresh} />

      {/* Main Header */}
      <Header
        user={user}
        hasToken={Boolean(googleToken)}
        hasHermesToken={hasHermesToken}
        isLiveMode={isLiveMode}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onToggleDemoMode={() => loadCRMData(true)}
      />

      {/* Top Banner Alert (if error connecting to SQL) */}
      {errorMessage && (
        <aside
          aria-label="Configuration status"
          className="bg-amber-950/80 border-b border-amber-800/80 text-amber-200 text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2 max-w-4xl">
            <span className="font-bold">Notice:</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded-md text-xs font-semibold ml-2 flex-shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Retry SQL</span>
          </button>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        {/* Search & Filter Toolbar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setLimit(40);
          }}
          selectedType={selectedType}
          onTypeChange={(val) => {
            setSelectedType(val);
            setLimit(40);
          }}
          selectedStatus={selectedStatus}
          onStatusChange={(val) => {
            setSelectedStatus(val);
            setLimit(40);
          }}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
          onClearTags={handleClearTags}
          availableTags={availableTags}
          tagMatchMode={tagMatchMode}
          onTagMatchModeChange={setTagMatchMode}
          sortMode={sortMode}
          onSortChange={(mode) => setSortMode(mode)}
          starredOnly={starredOnly}
          onToggleStarred={() => setStarredOnly(!starredOnly)}
          types={availableTypes}
          statuses={availableStatuses}
          totalCount={records.length}
          filteredCount={filteredRecords.length}
          onResetFilters={handleResetFilters}
        />

        {/* Status line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>{statusMessage}</span>
          </div>
          {lastUpdated && (
            <span className="text-slate-500">
              Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Asset Cards Grid */}
        {visibleRecords.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            {visibleRecords.map((record) => {
              const key = record.data.asset_id || String(record.row);
              return (
                <AssetCard
                  key={key}
                  record={record}
                  isOpen={expandedIds.has(key)}
                  onToggle={() => toggleCard(key)}
                  draftInstruction={drafts[key] || ''}
                  onDraftChange={(text) => updateDraft(key, text)}
                  onSendToSamAI={handleSendToSamAI}
                  deliveryStatus={deliveries[key]}
                  hasHermesToken={hasHermesToken}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onSelectTag={handleSelectTagFromCard}
                  onUpdateAsset={handleUpdateAsset}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-[#FF6400]/30 p-2.5 flex items-center justify-center mx-auto shadow-lg shadow-[#FF6400]/5">
              <img
                src="/assets/aistudio/refumo_orange_no_backround_0ec90715.png"
                alt="REFUMO Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-white">No matching assets found</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                No database assets matched your current search and filter criteria. Try clearing filters or searching for another keyword.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-[#FF6400] hover:bg-[#FF751A] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-[#FF6400]/20"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Show More Pagination */}
        {filteredRecords.length > limit && (
          <div className="text-center pt-4">
            <button
              onClick={() => setLimit((prev) => prev + 40)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-[#FF6400] rounded-2xl text-sm font-semibold text-white shadow-lg transition active:scale-95"
            >
              <span>Show more assets ({filteredRecords.length - limit} remaining)</span>
              <ChevronDown className="w-4 h-4 text-[#FF6400]" />
            </button>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        hasGoogleToken={Boolean(googleToken)}
        isLiveMode={isLiveMode}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onToggleLiveMode={() => loadCRMData(true)}
        onRefreshData={handleRefresh}
        onTokenUpdated={() => {
          const token = getSavedHermesToken();
          setHasHermesToken(Boolean(token));
        }}
      />
    </div>
  );
}
