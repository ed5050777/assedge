import { AssetRecord, AssetRecordData, ShortcutLink, AssetUpdatePayload } from '../types';
import { safeUrl, modifiedSortTime, sortRecords } from './sheets';

export const DEFAULT_SQL_BASE_URL = 'https://nvidia-vera-rubin.tailc9ae59.ts.net:8443';
export const DEFAULT_SQL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiaGVybWVzX2FwcCJ9.VvYWfXNoPmmnTFDVya3a8VQVLu9xq6frzzpmBgKVLCI';

export const SQL_BASE_URL_KEY = 'refumo_sql_base_url_v1';
export const SQL_TOKEN_KEY = 'refumo_sql_token_v1';

export const ASSET_SELECT_FIELDS =
  'asset_id,name,type,status,priority,price,currency,address,description,short_description,objective,comment,leader,team,tags,modified_ts,created_at,starred,folder,opener,memo,link';

/**
 * Returns a validated base URL for PostgreSQL PostgREST API.
 * Never returns relative or app-domain URLs which would trigger Netlify SPA html rewrites.
 */
export function getSQLBaseUrl(): string {
  try {
    const custom = localStorage.getItem(SQL_BASE_URL_KEY);
    if (custom) {
      const trimmed = custom.trim().replace(/\/+$/, '');
      if (
        trimmed &&
        (trimmed.startsWith('https://') || trimmed.startsWith('http://')) &&
        !trimmed.includes('assedge.refumo.com') &&
        (typeof window === 'undefined' || !trimmed.includes(window.location.host))
      ) {
        return trimmed;
      }
      // If an invalid or relative path was previously stored, clean it up
      localStorage.removeItem(SQL_BASE_URL_KEY);
    }
  } catch {}
  return DEFAULT_SQL_BASE_URL;
}

export function getSQLToken(): string {
  try {
    const custom = localStorage.getItem(SQL_TOKEN_KEY);
    if (custom && custom.trim().length > 20) {
      return custom.trim();
    }
    if (custom !== null) {
      localStorage.removeItem(SQL_TOKEN_KEY);
    }
  } catch {}
  return DEFAULT_SQL_TOKEN;
}

export function saveSQLConfig(baseUrl: string, token: string) {
  try {
    let cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    if (cleanUrl) {
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      if (!cleanUrl.includes('assedge.refumo.com')) {
        localStorage.setItem(SQL_BASE_URL_KEY, cleanUrl);
      }
    }
    if (token.trim() && token.trim().length > 20) {
      localStorage.setItem(SQL_TOKEN_KEY, token.trim());
    }
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
export async function testSQLConnection(
  customUrl?: string,
  customToken?: string
): Promise<{ success: boolean; totalCount?: number; error?: string }> {
  let baseUrl = (customUrl && customUrl.trim()) ? customUrl.trim().replace(/\/+$/, '') : getSQLBaseUrl();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  const token = (customToken && customToken.trim()) ? customToken.trim() : getSQLToken();

  try {
    const res = await fetch(`${baseUrl}/assets?limit=1&select=asset_id`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'count=exact',
      },
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (errText.includes('<!doctype') || errText.includes('<html')) {
        return {
          success: false,
          error: `Endpoint returned an HTML error page (HTTP ${res.status}). Verify connection to ${baseUrl}`,
        };
      }
      return {
        success: false,
        error: `HTTP ${res.status}: ${errText || res.statusText}`,
      };
    }

    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: `Expected JSON response but server returned "${contentType}". Check server URL.`,
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
 * Supports progressive callback so the UI displays the first batch instantly.
 */
export async function fetchSQLAssets(
  limit = 5000,
  onProgress?: (loadedCount: number, records: AssetRecord[], total?: number) => void
): Promise<AssetRecord[]> {
  const baseUrl = getSQLBaseUrl();
  const token = getSQLToken();

  const fetchChunk = async (chunkLimit: number, chunkOffset: number): Promise<{ rows: any[]; totalCount?: number }> => {
    const url = `${baseUrl}/assets?order=modified_ts.desc.nullslast&limit=${chunkLimit}&offset=${chunkOffset}&select=${ASSET_SELECT_FIELDS}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'count=exact',
      },
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (errText.includes('<!doctype') || errText.includes('<html')) {
        throw new Error(
          `SQL endpoint returned an HTML error page (HTTP ${res.status}). Verify connection to ${baseUrl}`
        );
      }
      throw new Error(
        `SQL Server error (HTTP ${res.status}): ${errText || res.statusText || 'Failed to fetch assets'}`
      );
    }

    if (!contentType.includes('application/json')) {
      const textPreview = (await res.text().catch(() => '')).slice(0, 150);
      throw new Error(
        `SQL Server returned HTML instead of JSON (${textPreview.slice(0, 50)}...). Ensure endpoint is ${DEFAULT_SQL_BASE_URL}`
      );
    }

    const rangeHeader = res.headers.get('content-range');
    let totalCount: number | undefined;
    if (rangeHeader) {
      const match = rangeHeader.match(/\/(\d+)/);
      if (match) totalCount = parseInt(match[1], 10);
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) {
      throw new Error('Invalid response format from SQL server: expected array of assets');
    }

    return { rows, totalCount };
  };

  // 1. Fetch initial chunk (1,000 items) for ultra-fast startup
  const firstBatchSize = Math.min(limit, 1000);
  const firstBatch = await fetchChunk(firstBatchSize, 0);

  let allRows = [...firstBatch.rows];
  const totalInDb = firstBatch.totalCount ?? allRows.length;

  let currentRecords = allRows
    .filter((row) => row && (row.asset_id || row.name))
    .map((row, idx) => sqlRowToAssetRecord(row, idx));

  if (onProgress) {
    onProgress(currentRecords.length, currentRecords, totalInDb);
  }

  // 2. Fetch remainder if total is greater than first batch
  if (limit > firstBatchSize && allRows.length < totalInDb && firstBatch.rows.length === firstBatchSize) {
    try {
      const remainingLimit = limit - firstBatchSize;
      const secondBatch = await fetchChunk(remainingLimit, firstBatchSize);
      allRows = allRows.concat(secondBatch.rows);

      currentRecords = allRows
        .filter((row) => row && (row.asset_id || row.name))
        .map((row, idx) => sqlRowToAssetRecord(row, idx));

      if (onProgress) {
        onProgress(currentRecords.length, currentRecords, totalInDb);
      }
    } catch (chunkErr) {
      console.warn('Could not fetch secondary asset chunk, proceeding with initial batch:', chunkErr);
    }
  }

  return sortRecords(currentRecords, 'modified');
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

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
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

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Failed to update asset in SQL server (HTTP ${res.status}): ${errText || res.statusText}`
    );
  }

  if (!contentType.includes('application/json')) {
    throw new Error('Server returned non-JSON response when updating asset.');
  }

  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`Asset ${assetId} not found or no changes were returned.`);
  }

  return list[0];
}
