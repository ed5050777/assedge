import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Star, Tag, ChevronDown, Check, SlidersHorizontal } from 'lucide-react';
import { SortMode, TagCount } from '../types';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  availableTags: TagCount[];
  tagMatchMode: 'any' | 'all';
  onTagMatchModeChange: (mode: 'any' | 'all') => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  starredOnly: boolean;
  onToggleStarred: () => void;
  types: string[];
  statuses: string[];
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  selectedTags,
  onToggleTag,
  onClearTags,
  availableTags,
  tagMatchMode,
  onTagMatchModeChange,
  sortMode,
  onSortChange,
  starredOnly,
  onToggleStarred,
  types,
  statuses,
  totalCount,
  filteredCount,
  onResetFilters,
}) => {
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available tags based on search input inside the popover
  const visibleTags = useMemo(() => {
    if (!tagSearchInput.trim()) return availableTags;
    const query = tagSearchInput.toLowerCase().trim();
    return availableTags.filter((t) => t.tag.toLowerCase().includes(query));
  }, [availableTags, tagSearchInput]);

  const hasActiveFilters = Boolean(
    searchQuery || selectedType || selectedStatus || starredOnly || selectedTags.length > 0
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg space-y-3.5 relative">
      {/* Top Search Input */}
      <div className="relative flex items-center">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search assets by name, address, leader, memo, keyword…"
          className="w-full pl-11 pr-10 py-2.5 sm:py-3 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700 focus:border-[#FF6400] rounded-xl text-slate-100 placeholder-slate-400 text-sm sm:text-base outline-none transition focus:ring-2 focus:ring-[#FF6400]/20"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row: Type, Status, Tags, Sort & Starred */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
        {/* Type Select */}
        <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full py-2 px-3 bg-slate-800/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-slate-200 outline-none cursor-pointer"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Status Select */}
        <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full py-2 px-3 bg-slate-800/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-slate-200 outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Tags Multi-Select Dropdown */}
        <div className="relative flex-1 min-w-[120px] sm:min-w-[150px]" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition cursor-pointer select-none ${
              selectedTags.length > 0
                ? 'bg-orange-950/60 text-[#FF8533] border-[#FF6400]'
                : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Tag className={`w-3.5 h-3.5 ${selectedTags.length > 0 ? 'text-[#FF6400]' : 'text-slate-400'}`} />
              <span className="truncate">
                {selectedTags.length === 0
                  ? 'All Tags'
                  : `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
              {selectedTags.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FF6400] text-slate-950 font-bold text-[10px]">
                  {selectedTags.length}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Dropdown Menu Popover */}
          {isTagDropdownOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#FF6400]" />
                  <span className="text-xs font-bold text-white">Filter by Tags</span>
                  <span className="text-[11px] text-slate-400 font-mono">({availableTags.length})</span>
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={onClearTags}
                    className="text-[11px] text-[#FF8533] hover:text-white transition font-medium"
                  >
                    Clear selected
                  </button>
                )}
              </div>

              {/* Tag Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={tagSearchInput}
                  onChange={(e) => setTagSearchInput(e.target.value)}
                  placeholder="Search tags…"
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-950/80 border border-slate-800 focus:border-[#FF6400] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                />
                {tagSearchInput && (
                  <button
                    onClick={() => setTagSearchInput('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Match Mode Selector (Match Any vs Match All) */}
              {selectedTags.length > 1 && (
                <div className="flex items-center justify-between bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 text-[11px]">
                  <span className="text-slate-400 pl-1">Match mode:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onTagMatchModeChange('any')}
                      className={`px-2 py-0.5 rounded-lg font-medium transition ${
                        tagMatchMode === 'any'
                          ? 'bg-[#FF6400] text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Assets matching at least one selected tag"
                    >
                      ANY (OR)
                    </button>
                    <button
                      type="button"
                      onClick={() => onTagMatchModeChange('all')}
                      className={`px-2 py-0.5 rounded-lg font-medium transition ${
                        tagMatchMode === 'all'
                          ? 'bg-[#FF6400] text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Assets matching all selected tags"
                    >
                      ALL (AND)
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Tag List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {visibleTags.length > 0 ? (
                  visibleTags.map(({ tag, count }) => {
                    const isChecked = selectedTags.includes(tag);
                    return (
                      <label
                        key={tag}
                        onClick={() => onToggleTag(tag)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition select-none ${
                          isChecked
                            ? 'bg-orange-950/50 text-[#FF8533] border border-[#FF6400]/40'
                            : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-[#FF6400] border-[#FF6400] text-slate-950'
                                : 'border-slate-600 bg-slate-800/80'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate font-medium">{tag}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono px-1.5 py-0.5 bg-slate-950/60 rounded-md flex-shrink-0">
                          {count}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">
                    No tags matching "{tagSearchInput}"
                  </div>
                )}
              </div>

              {/* Popover Footer */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {selectedTags.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(false)}
                  className="px-3 py-1 bg-[#FF6400] hover:bg-[#FF751A] text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
          <select
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className="w-full py-2 px-3 bg-slate-800/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-slate-200 outline-none cursor-pointer"
          >
            <option value="modified">Sort: Newest Modified</option>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="status">Sort: Status</option>
            <option value="type">Sort: Type</option>
          </select>
        </div>

        {/* Starred Toggle */}
        <button
          onClick={onToggleStarred}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium transition active:scale-95 ${
            starredOnly
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Toggle Starred / Priority Assets"
        >
          <Star className={`w-3.5 h-3.5 ${starredOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span className="hidden sm:inline">Starred</span>
        </button>

        {/* Reset button if active */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-2 text-xs text-[#FF8533] hover:text-white bg-orange-950/40 hover:bg-orange-950/70 border border-[#FF6400]/50 rounded-xl transition"
            title="Reset all active filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Result Count and Active Filters pill strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            {filteredCount} {filteredCount === 1 ? 'asset' : 'assets'}
          </span>
          {filteredCount !== totalCount && (
            <span className="text-slate-500">(of {totalCount} total)</span>
          )}
        </div>

        {/* Active Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md truncate max-w-[120px]">
              <span>"{searchQuery}"</span>
              <button onClick={() => onSearchChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
              <span>{selectedType}</span>
              <button onClick={() => onTypeChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedStatus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
              <span>{selectedStatus}</span>
              <button onClick={() => onStatusChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {/* Selected Tag Pills */}
          {selectedTags.map((tag) => (
            <span
              key={`active-tag-${tag}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF6400]/20 text-[#FF8533] border border-[#FF6400]/40 rounded-md"
            >
              <Tag className="w-3 h-3 text-[#FF6400]" />
              <span>{tag}</span>
              <button
                onClick={() => onToggleTag(tag)}
                className="text-slate-400 hover:text-white transition ml-0.5"
                title={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
