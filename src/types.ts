export interface AssetRecordData {
  asset_id?: string;
  name?: string;
  type?: string;
  status?: string;
  priority?: string;
  price?: string;
  currency?: string;
  address?: string;
  description?: string;
  objective?: string;
  comment?: string;
  leader?: string;
  team?: string;
  folder?: string;
  opener?: string;
  memo?: string;
  link?: string;
  created_at?: string;
  modified_ts?: string;
  reminder_time?: string;
  reminder_starts?: string;
  starred?: string;
  tags?: string;
  [key: string]: string | undefined;
}

export interface AssetUpdatePayload {
  description?: string;
  tags?: string;
  price?: string;
  currency?: string;
  status?: string;
  priority?: string;
  comment?: string;
  objective?: string;
  name?: string;
  [key: string]: any;
}

export interface ShortcutLink {
  url: string;
  label: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface AssetRecord {
  row: number;
  data: AssetRecordData;
  links: ShortcutLink[];
  search: string;
  _modTime: number;
}

export type SortMode = 'modified' | 'name' | 'status' | 'type';

export interface FilterState {
  search: string;
  type: string;
  status: string;
  tags: string[];
  tagMatchMode: 'any' | 'all';
  sort: SortMode;
  starredOnly: boolean;
}

export interface HermesDeliveryStatus {
  pending: boolean;
  message: string;
  error?: boolean;
  timestamp?: number;
}
