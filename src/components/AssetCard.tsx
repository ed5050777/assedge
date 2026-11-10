import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  Sparkles,
  Copy,
  Check,
  Calendar,
  User,
  Users,
  MapPin,
  FolderOpen,
  FileText,
  Link2,
  Mail,
  Phone,
  AlertCircle,
  Clock,
  Star,
  Tag
} from 'lucide-react';
import { AssetRecord, HermesDeliveryStatus } from '../types';
import { orderedDetailEntries, detailDisplay, formatAssetDate } from '../lib/sheets';

interface AssetCardProps {
  record: AssetRecord;
  isOpen: boolean;
  onToggle: () => void;
  draftInstruction: string;
  onDraftChange: (text: string) => void;
  onSendToSamAI: (assetId: string, instructions: string) => Promise<void>;
  deliveryStatus?: HermesDeliveryStatus;
  hasHermesToken: boolean;
  onOpenSettings: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  record,
  isOpen,
  onToggle,
  draftInstruction,
  onDraftChange,
  onSendToSamAI,
  deliveryStatus,
  hasHermesToken,
  onOpenSettings,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [localSending, setLocalSending] = useState(false);

  const assetId = record.data.asset_id || `ROW-${record.row}`;
  const assetName = record.data.name || 'Unnamed Asset';
  const assetType = record.data.type || 'Asset';
  const assetStatus = record.data.status;
  const assetPriority = record.data.priority;
  const isStarred = record.data.starred === 'Yes' || record.data.starred === 'true' || record.data.starred === '1';

  // Parse comma-separated tags when a value exists
  const tagsList = (record.data.tags || '')
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(assetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftInstruction.trim() || localSending || deliveryStatus?.pending) return;

    if (!hasHermesToken) {
      onOpenSettings();
      return;
    }

    setLocalSending(true);
    try {
      await onSendToSamAI(assetId, draftInstruction);
    } finally {
      setLocalSending(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    const next = draftInstruction ? `${draftInstruction}\n${prompt}` : prompt;
    onDraftChange(next);
  };

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('stabilized')) {
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
    }
    if (s.includes('due diligence') || s.includes('review') || s.includes('closing')) {
      return 'bg-amber-950/80 text-amber-300 border-amber-800';
    }
    if (s.includes('urgent') || s.includes('critical')) {
      return 'bg-rose-950/80 text-rose-400 border-rose-800';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const detailEntries = orderedDetailEntries(record.data);

  return (
    <article
      aria-label={`Asset ${assetName}`}
      className={`rounded-2xl border transition duration-200 overflow-hidden bg-slate-900 ${
        isOpen
          ? 'border-[#FF6400] shadow-xl shadow-[#FF6400]/10 ring-1 ring-[#FF6400]/40'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 shadow-md'
      }`}
    >
      {/* Clickable Card Header */}
      <div
        onClick={onToggle}
        className="p-4 sm:p-5 cursor-pointer select-none space-y-2.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-950/70 text-[#FF8533] border border-[#FF6400]/40">
                {assetType}
              </span>

              {assetStatus && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getStatusBadge(assetStatus)}`}>
                  {assetStatus}
                </span>
              )}

              {assetPriority && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {assetPriority}
                </span>
              )}

              {isStarred && (
                <span className="text-amber-400 flex items-center gap-1 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </span>
              )}

              {record.data.modified_ts && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                  <Clock className="w-3 h-3 text-[#FF6400]" />
                  <span>{formatAssetDate(record.data.modified_ts)}</span>
                </span>
              )}

              {/* Tags badges whenever there is a value */}
              {tagsList.map((tag, idx) => (
                <span
                  key={`tag-badge-${idx}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FF6400]/15 text-[#FF8533] border border-[#FF6400]/30 shadow-xs"
                >
                  <Tag className="w-3 h-3 text-[#FF6400] flex-shrink-0" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug break-words">
              {assetName}
            </h3>

            {record.data.address && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 break-words">
                <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>{record.data.address}</span>
              </div>
            )}
          </div>

          {/* Quick Right Side ID and Toggle Icon */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopyId}
              className="hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition"
              title="Copy Asset ID"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{assetId}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="p-1.5 rounded-xl bg-slate-800/70 text-slate-300 hover:text-white border border-slate-700/70"
              aria-label={isOpen ? 'Collapse card' : 'Expand card'}
            >
              {isOpen ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Shortcuts Link Strip */}
        {record.links && record.links.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
            {record.links.map((link, idx) => {
              const label = link.label.toLowerCase();
              let Icon = ExternalLink;
              if (label.includes('folder')) Icon = FolderOpen;
              else if (label.includes('opener') || label.includes('memo')) Icon = FileText;
              else if (label.includes('link')) Icon = Link2;
              else if (label.includes('email')) Icon = Mail;
              else if (label.includes('phone') || label.includes('tel')) Icon = Phone;

              return (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-orange-300 hover:text-white bg-slate-800/90 hover:bg-orange-600/30 border border-orange-900/60 hover:border-orange-500 rounded-lg transition"
                >
                  <Icon className="w-3 h-3 text-orange-400" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded Content Section */}
      {isOpen && (
        <div className="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-6 space-y-6 animate-in slide-in-from-top-2 duration-150">
          {/* Sam AI Instruction Form (Primary Feature) */}
          <div className="rounded-2xl border border-[#FF6400]/40 bg-gradient-to-br from-slate-900 via-slate-900 to-[#FF6400]/10 p-4 sm:p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#FF6400]/20 text-[#FF6400] border border-[#FF6400]/40">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Instructions for Sam AI</span>
                  </h4>
                </div>
              </div>
            </div>

            {/* Token Missing Warning */}
            {!hasHermesToken && (
              <div className="mb-3.5 p-3 rounded-xl bg-orange-950/60 border border-orange-800/80 text-orange-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span>Sam AI webhook token is not configured on this device.</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="underline font-semibold hover:text-white"
                >
                  Configure Token
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <textarea
                  rows={3}
                  value={draftInstruction}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder={`What should Sam AI do with ${assetName}? (e.g. review tenant lease terms, draft acquisition summary, prepare financial model...)`}
                  disabled={deliveryStatus?.pending || localSending}
                  className="w-full p-3 bg-slate-950/80 border border-slate-700 focus:border-orange-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm outline-none transition focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 resize-y min-h-[85px]"
                />
              </div>

              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Quick prompts:</span>
                {[
                  'Draft acquisition memo',
                  'Verify lease terms & cap rate',
                  'Review planning & permits',
                  'Summarize asset risk profile'
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition"
                  >
                    + {prompt}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs">
                  {deliveryStatus?.message ? (
                    <div
                      className={`flex items-center gap-1.5 ${
                        deliveryStatus.error
                          ? 'text-rose-400'
                          : deliveryStatus.pending
                          ? 'text-amber-400'
                          : 'text-emerald-400 font-medium'
                      }`}
                    >
                      {deliveryStatus.pending ? (
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                      ) : deliveryStatus.error ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{deliveryStatus.message}</span>
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={!draftInstruction.trim() || deliveryStatus?.pending || localSending}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6400] hover:bg-[#FF751A] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95 shadow-[#FF6400]/20"
                >
                  <Send className={`w-3.5 h-3.5 ${localSending || deliveryStatus?.pending ? 'animate-pulse' : ''}`} />
                  <span>
                    {localSending || deliveryStatus?.pending ? 'Sending to Sam AI…' : 'Send to Sam AI'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Dedicated Tags Section (Expanded View) */}
          {tagsList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <Tag className="w-3.5 h-3.5 text-[#FF6400]" />
                <span>Tags:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {tagsList.map((tag, idx) => (
                  <span
                    key={`tag-chip-${idx}`}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#FF6400]/15 text-[#FF8533] border border-[#FF6400]/30 font-semibold"
                  >
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description & Team Summary */}
          {(record.data.description || record.data.leader || record.data.team) && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              {record.data.description && (
                <div>
                  <h5 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Description & Overview
                  </h5>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {record.data.description}
                  </p>
                </div>
              )}

              {(record.data.leader || record.data.team) && (
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800/80 text-xs">
                  {record.data.leader && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <User className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-slate-400">Leader:</span>
                      <span className="font-medium text-white">{record.data.leader}</span>
                    </div>
                  )}
                  {record.data.team && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Users className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-slate-400">Team:</span>
                      <span className="font-medium text-white">{record.data.team}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full Field Data Grid */}
          {detailEntries.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Asset Metadata & CRM Attributes
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {detailEntries.map(([key, value]) => {
                  const display = detailDisplay(key, value);
                  return (
                    <div
                      key={key}
                      className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden"
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                        {display.label}
                      </dt>
                      <dd className="text-xs text-slate-200 font-medium break-words whitespace-pre-wrap">
                        {display.value}
                      </dd>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timestamps footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Row {record.row} in Sheet</span>
            </div>
            {record.data.modified_ts && (
              <span>Last Modified: {formatAssetDate(record.data.modified_ts)}</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
