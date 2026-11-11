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
  Tag,
  Pencil,
  DollarSign,
  Save,
  Loader2,
  X
} from 'lucide-react';
import { AssetRecord, HermesDeliveryStatus, AssetUpdatePayload } from '../types';
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
  onSelectTag?: (tag: string) => void;
  onUpdateAsset?: (assetId: string, updates: AssetUpdatePayload) => Promise<void>;
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
  onSelectTag,
  onUpdateAsset,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [localSending, setLocalSending] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(record.data.price || '');
  const [editCurrency, setEditCurrency] = useState(record.data.currency || '');
  const [editTags, setEditTags] = useState(record.data.tags || '');
  const [editStatus, setEditStatus] = useState(record.data.status || '');
  const [editPriority, setEditPriority] = useState(record.data.priority || '');
  const [editDescription, setEditDescription] = useState(record.data.description || '');
  const [editComment, setEditComment] = useState(record.data.comment || '');
  const [editObjective, setEditObjective] = useState(record.data.objective || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

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

  const handleToggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      // Sync fresh values from record
      setEditPrice(record.data.price || '');
      setEditCurrency(record.data.currency || '');
      setEditTags(record.data.tags || '');
      setEditStatus(record.data.status || '');
      setEditPriority(record.data.priority || '');
      setEditDescription(record.data.description || '');
      setEditComment(record.data.comment || '');
      setEditObjective(record.data.objective || '');
      setSaveError(null);
      setSaveSuccess(null);
      if (!isOpen) {
        onToggle();
      }
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!onUpdateAsset) {
      setSaveError('Asset update function is not configured.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await onUpdateAsset(assetId, {
        price: editPrice.trim(),
        currency: editCurrency.trim(),
        tags: editTags.trim(),
        status: editStatus.trim(),
        priority: editPriority.trim(),
        description: editDescription.trim(),
        comment: editComment.trim(),
        objective: editObjective.trim(),
      });

      setSaveSuccess('Saved successfully to PostgreSQL database!');
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(null);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update asset in SQL:', err);
      setSaveError(err.message || 'Failed to update asset in PostgreSQL.');
    } finally {
      setIsSaving(false);
    }
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
    if (s.includes('ready') || s.includes('onboarding')) {
      return 'bg-teal-950/80 text-teal-300 border-teal-800';
    }
    if (s.includes('due diligence') || s.includes('review') || s.includes('closing') || s.includes('progress')) {
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

              {/* Prominent Price & Currency Badge */}
              {record.data.price && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1 shadow-xs">
                  <DollarSign className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <span>
                    {record.data.currency ? `${record.data.currency} ` : ''}
                    {record.data.price}
                  </span>
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
                <button
                  type="button"
                  key={`tag-badge-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTag?.(tag);
                  }}
                  title={`Filter by tag: ${tag}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FF6400]/15 text-[#FF8533] border border-[#FF6400]/30 hover:bg-[#FF6400]/30 hover:border-[#FF6400]/60 transition shadow-xs cursor-pointer"
                >
                  <Tag className="w-3 h-3 text-[#FF6400] flex-shrink-0" />
                  <span>{tag}</span>
                </button>
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

          {/* Quick Right Side ID, Edit Button and Toggle Icon */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopyId}
              className="hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition"
              title="Copy Asset ID"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{assetId}</span>
            </button>

            {/* Edit Button */}
            <button
              onClick={handleToggleEdit}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                isEditing
                  ? 'bg-[#FF6400] text-white border-[#FF6400] shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
              }`}
              title={isEditing ? 'Close editor' : 'Edit asset fields (Description, Tags, Price...)'}
            >
              <Pencil className="w-3 h-3 text-orange-400" />
              <span>{isEditing ? 'Editing' : 'Edit'}</span>
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
          {/* SQL Edit Asset Form */}
          {isEditing && (
            <form
              onSubmit={handleSaveEdit}
              className="rounded-2xl border border-orange-500/60 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 p-4 sm:p-5 shadow-xl space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-500/20 text-[#FF6400] border border-orange-500/40">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Edit Asset Details</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        PostgreSQL Live
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Changes persist directly to hermes database (<code className="text-orange-300 font-mono">public.assets</code>)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Price */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Price
                  </label>
                  <input
                    type="text"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="e.g. 190,000,000"
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs outline-none transition"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    placeholder="EUR, USD, GBP, ILS..."
                    list={`currency-suggestions-${assetId}`}
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs outline-none transition"
                  />
                  <datalist id={`currency-suggestions-${assetId}`}>
                    <option value="EUR" />
                    <option value="USD" />
                    <option value="GBP" />
                    <option value="ILS" />
                    <option value="CHF" />
                  </datalist>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs outline-none transition"
                  >
                    <option value="">(None)</option>
                    <option value="Ready">Ready</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Active">Active</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Qualification">Qualification</option>
                    <option value="Companion">Companion</option>
                    <option value="Dormant">Dormant</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs outline-none transition"
                  >
                    <option value="">(None)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="e.g. student, pbsa, hospitality, london, shared ownership"
                  className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs outline-none transition font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={5}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Full description text of this asset..."
                  className="w-full p-3 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs sm:text-sm outline-none transition leading-relaxed resize-y"
                />
              </div>

              {/* Comment & Objective */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Internal Comment / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    placeholder="Internal notes or updates..."
                    className="w-full p-3 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs outline-none transition resize-y"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Objective / Goal
                  </label>
                  <textarea
                    rows={3}
                    value={editObjective}
                    onChange={(e) => setEditObjective(e.target.value)}
                    placeholder="Acquisition goal, debt mandate, disposition timeline..."
                    className="w-full p-3 bg-slate-950/90 border border-slate-700 focus:border-[#FF6400] rounded-xl text-white text-xs outline-none transition resize-y"
                  />
                </div>
              </div>

              {/* Error / Success Feedback */}
              {saveError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#FF6400] hover:bg-[#FF751A] text-white rounded-xl text-xs font-bold transition shadow-md shadow-[#FF6400]/20 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving to Database…' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

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
                  <button
                    type="button"
                    key={`tag-chip-${idx}`}
                    onClick={() => onSelectTag?.(tag)}
                    title={`Filter by tag: ${tag}`}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#FF6400]/15 text-[#FF8533] border border-[#FF6400]/30 hover:bg-[#FF6400]/30 hover:border-[#FF6400]/60 transition font-semibold cursor-pointer"
                  >
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description, Objective, Comment & Team Summary */}
          {(record.data.description || record.data.objective || record.data.comment || record.data.leader || record.data.team) && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5">
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

              {record.data.objective && (
                <div className="pt-2.5 border-t border-slate-800/80">
                  <h5 className="text-[11px] uppercase tracking-wider text-orange-400 font-semibold mb-1">
                    Objective
                  </h5>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {record.data.objective}
                  </p>
                </div>
              )}

              {record.data.comment && (
                <div className="pt-2.5 border-t border-slate-800/80">
                  <h5 className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold mb-1">
                    Internal Notes & Comments
                  </h5>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {record.data.comment}
                  </p>
                </div>
              )}

              {(record.data.leader || record.data.team) && (
                <div className="flex flex-wrap items-center gap-4 pt-2.5 border-t border-slate-800/80 text-xs">
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
                Asset Metadata & Database Attributes
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
              <span>Asset ID: <code className="text-slate-300 font-mono">{assetId}</code></span>
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
