import { AssetRecord, AssetRecordData, ShortcutLink, AssetUpdatePayload } from '../types';
import { safeUrl, modifiedSortTime, sortRecords } from './sheets';

export const DEFAULT_SQL_BASE_URL = 'https://nvidia-vera-rubin.tailc9ae59.ts.net:8443';
export const DEFAULT_SQL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiaGVybWVzX2FwcCJ9.VvYWfXNoPmmnTFDVya3a8VQVLu9xq6frzzpmBgKVLCI';

export const SQL_BASE_URL_KEY = 'refumo_sql_base_url_v1';
export const SQL_TOKEN_KEY = 'refumo_sql_token_v1';

export function getSQLBaseUrl(): string {
  try {
    const custom = localStorage.getItem(SQL_BASE_URL_KEY);
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  } catch {}
  return DEFAULT_SQL_BASE_URL;
}

export function getSQLToken(): string {
  try {
    const custom = localStorage.getItem(SQL_TOKEN_KEY);
    if (custom && custom.trim()) return custom.trim();
  } catch {}
  return DEFAULT_SQL_TOKEN;
}

export function saveSQLConfig(baseUrl: string, token: string) {
  try {
    if (baseUrl.trim()) localStorage.setItem(SQL_BASE_URL_KEY, baseUrl.trim().replace(/\/+$/, ''));
    if (token.trim()) localStorage.setItem(SQL_TOKEN_KEY, token.trim());
  } catch {}
}

export function resetSQLConfig() {
  try {
    localStorage.removeItem(SQL_BASE_URL_KEY);
    localStorage.removeItem(SQL_TOKEN_KEY);
  } catch {}
}

/**
 * Quick ping / test to check if PostgreSQL PostgREST server is reachable and valid
 */
export async function testSQLConnection(customUrl?: string, customToken?: string): Promise<{ success: boolean; totalCount?: number; error?: string }> {
  const baseUrl = (customUrl && customUrl.trim()) ? customUrl.trim().replace(/\/+$/, '') : getSQLBaseUrl();
  const token = (customToken && customToken.trim()) ? customToken.trim() : getSQLToken();

  try {
    const res = await fetch(`${baseUrl}/assets?limit=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'count=exact',
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `HTTP ${res.status}: ${errText || res.statusText}`,
      };
    }

    const rangeHeader = res.headers.get('content-range');
    let totalCount: number | undefined;
    if (rangeHeader) {
      const match = rangeHeader.match(/\/(\d+)/);
      if (match) totalCount = parseInt(match[1], 10);
    }

    return {
      success: true,
      totalCount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unable to connect to SQL server',
    };
  }
}

/**
 * Transforms a raw PostgreSQL row from public.assets into an AssetRecord
 */
export function sqlRowToAssetRecord(row: any, idx: number): AssetRecord {
  const data: AssetRecordData = {};

  for (const [key, val] of Object.entries(row)) {
    if (val !== null && val !== undefined) {
      data[key] = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
    } else {
      data[key] = '';
    }
  }

  // Extract shortcut links (folder, opener, memo, link)
  const linksMap = new Map<string, ShortcutLink>();
  const linkKeys = ['folder', 'opener', 'memo', 'link'];
  linkKeys.forEach((key) => {
    const rawVal = data[key];
    if (rawVal) {
      const safe = safeUrl(rawVal);
      if (safe && !linksMap.has(safe)) {
        linksMap.set(safe, {
          url: safe,
          label: key.charAt(0).toUpperCase() + key.slice(1),
        });
      }
    }
  });

  // Calculate sortable modified time
  const modTime = modifiedSortTime(data.modified_ts || data.created_at);

  // Search blob for instant client filtering
  const search = Object.values(data).join(' ').normalize('NFKD').toLowerCase();

  return {
    row: idx + 1,
    data,
    links: Array.from(linksMap.values()),
    search,
    _modTime: modTime,
  };
}

/**
 * Fetch all assets from PostgreSQL via PostgREST
 */
export async function fetchSQLAssets(limit = 5000): Promise<AssetRecord[]> {
  const baseUrl = getSQLBaseUrl();
  const token = getSQLToken();

  const url = `${baseUrl}/assets?order=modified_ts.desc.nullslast&limit=${limit}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(
      `SQL Server error (HTTP ${res.status}): ${errorText || res.statusText || 'Failed to fetch assets'}`
    );
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) {
    throw new Error('Invalid response format from SQL server: expected array of assets');
  }

  const records: AssetRecord[] = rows
    .filter((row) => row && (row.asset_id || row.name))
    .map((row, idx) => sqlRowToAssetRecord(row, idx));

  return sortRecords(records, 'modified');
}

/**
 * Fetch a single asset by asset_id from PostgreSQL
 */
export async function getSQLAsset(assetId: string): Promise<AssetRecordData | null> {
  const baseUrl = getSQLBaseUrl();
  const token = getSQLToken();

  const url = `${baseUrl}/assets?asset_id=eq.${encodeURIComponent(assetId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch asset ${assetId}: HTTP ${res.status}`);
  }

  const list = await res.json();
  return list && list.length > 0 ? list[0] : null;
}

/**
 * Update an asset's fields in PostgreSQL via PATCH /assets?asset_id=eq.<id>
 */
export async function updateSQLAsset(
  assetId: string,
  updates: AssetUpdatePayload
): Promise<AssetRecordData> {
  if (!assetId || !assetId.trim()) {
    throw new Error('Cannot update asset without a valid asset_id');
  }

  const baseUrl = getSQLBaseUrl();
  const token = getSQLToken();

  // Automatically update modified_ts to current timestamp if not provided
  const payload: Record<string, any> = {
    ...updates,
    modified_ts: new Date().toISOString(),
  };

  const url = `${baseUrl}/assets?asset_id=eq.${encodeURIComponent(assetId.trim())}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Failed to update asset in SQL server (HTTP ${res.status}): ${errText || res.statusText}`
    );
  }

  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`Asset ${assetId} not found or no changes were returned.`);
  }

  return list[0];
}
