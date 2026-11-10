import React from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown, Star, Filter } from 'lucide-react';
import { SortMode } from '../types';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
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
  const hasActiveFilters = Boolean(searchQuery || selectedType || selectedStatus || starredOnly);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg space-y-3.5">
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

      {/* Filter Row: Type, Status, Sort & Starred */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
        {/* Type Select */}
        <div className="flex-1 min-w-[130px] sm:min-w-[160px]">
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
        <div className="flex-1 min-w-[130px] sm:min-w-[160px]">
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

        {/* Sort Select */}
        <div className="flex-1 min-w-[130px] sm:min-w-[160px]">
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => onSortChange(e.target.value as SortMode)}
              className="w-full py-2 pl-3 pr-8 bg-slate-800/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-slate-200 outline-none cursor-pointer"
            >
              <option value="modified">Sort: Newest Modified</option>
              <option value="name">Sort: Name (A–Z)</option>
              <option value="status">Sort: Status</option>
              <option value="type">Sort: Type</option>
            </select>
          </div>
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
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Result Count and Active Filters pill strip */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            {filteredCount} {filteredCount === 1 ? 'asset' : 'assets'}
          </span>
          {filteredCount !== totalCount && (
            <span className="text-slate-500">(of {totalCount} total)</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {searchQuery && (
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md truncate max-w-[120px]">
              "{searchQuery}"
            </span>
          )}
          {selectedType && (
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
              {selectedType}
            </span>
          )}
          {selectedStatus && (
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
              {selectedStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
