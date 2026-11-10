import { AssetRecord, AssetRecordData, ShortcutLink, SortMode } from '../types';

export const ID = '1mJc2Z3ziqRIHqJaES1p9u12MbZgWlEBxNT_bND6Nuuc';
export const GID = 1964624729;
export const SHEET = `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=${GID}`;

export function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

export function linksFor(cells: any[], headers: string[]): ShortcutLink[] {
  const links = new Map<string, ShortcutLink>();
  function add(url: string, label: string) {
    const safe = safeUrl(url);
    if (safe && !links.has(safe)) links.set(safe, { url: safe, label });
  }

  cells.forEach((c, i) => {
    const field = (headers[i] || 'Link').replaceAll('_', ' ');
    if (c?.hyperlink) add(c.hyperlink, field);
    for (const run of c?.textFormatRuns || []) {
      if (run.format?.link?.uri) add(run.format.link.uri, field);
    }
    const formula = c?.userEnteredValue?.formulaValue || '';
    const fm = formula.match(/^=HYPERLINK\(\s*"((?:[^""]|"")+)"/i);
    if (fm) add(fm[1].replaceAll('""', '"'), field);
    const value = c?.formattedValue || '';
    for (const m of value.matchAll(/(?:https?:\/\/|www\.)[^\s<>"\[\]]+/gi)) {
      const url = m[0].replace(/[.,;!?)]+$/, '');
      add(url.startsWith('www.') ? 'https://' + url : url, field);
    }
    for (const m of value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
      add('mailto:' + m[0], 'Email');
    }
  });
  return [...links.values()];
}

export function shortcutLinks(cells: any[], headers: string[]): ShortcutLink[] {
  const allowed = new Set(['folder', 'opener', 'memo', 'link']);
  return headers.flatMap((h, i) =>
    allowed.has(h)
      ? linksFor([cells[i] || {}], [h]).map((l) => ({
          ...l,
          label: h.charAt(0).toUpperCase() + h.slice(1),
        }))
      : []
  );
}

export function recordsFrom(rows: any[]): AssetRecord[] {
  const headers: string[] = (rows[0]?.values || []).map((c: any) => c.formattedValue || '');
  if (!headers.includes('asset_id') || !headers.includes('name')) {
    throw new Error('CRM headers were not found in row 1.');
  }
  return rows.slice(1).flatMap((row: any, i: number) => {
    const cells = row.values || [];
    const data: AssetRecordData = Object.fromEntries(
      headers.map((h, j) => [h, cells[j]?.formattedValue || ''])
    );
    if (!data.asset_id && !data.name) return [];
    return [
      {
        data,
        row: i + 2,
        links: shortcutLinks(cells, headers),
        search: Object.values(data).join(' ').normalize('NFKD').toLowerCase(),
        _modTime: modifiedSortTime(data.modified_ts),
      },
    ];
  });
}

const dtfUtc = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

const dtfMadrid = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Madrid',
});

export function formatAssetDate(value: any): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let date: Date,
    zone = 'UTC';
  if (/^\d{4,6}(?:\.\d+)?$/.test(raw) && Number(raw) >= 20000 && Number(raw) <= 100000) {
    date = new Date(Date.UTC(1899, 11, 30) + Math.round((Number(raw) * 86400000) / 1000) * 1000);
  } else {
    const local = raw.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/
    );
    const us = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
    );
    if (local) {
      const [, y, m, d, h = '0', min = '0', sec = '0'] = local;
      date = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +sec));
      if (
        date.getUTCFullYear() !== +y ||
        date.getUTCMonth() !== +m - 1 ||
        date.getUTCDate() !== +d ||
        +h > 23 ||
        +min > 59 ||
        +sec > 59
      )
        return raw;
    } else if (us) {
      let [, m, d, y, h = '0', min = '0', sec = '0', ampm] = us;
      if (ampm) h = String((+h % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0));
      date = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +sec));
      if (
        date.getUTCMonth() !== +m - 1 ||
        date.getUTCDate() !== +d ||
        +h > 23 ||
        +min > 59 ||
        +sec > 59
      )
        return raw;
    } else if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
      date = new Date(raw);
      zone = 'Europe/Madrid';
    } else {
      return raw;
    }
  }
  if (Number.isNaN(date.getTime())) return raw;
  return (zone === 'Europe/Madrid' ? dtfMadrid : dtfUtc).format(date);
}

export const HIDDEN_DETAIL_FIELDS = new Set([
  'asset_id',
  'name',
  'type',
  'description',
  'short_description',
  'short description',
  'key_words',
  'key words',
  'keywords',
  'google_earth',
  'google earth',
  'tags',
  'leader',
  'team',
  'folder',
  'opener',
  'memo',
  'link',
  'search_blob',
  'record_source',
  'vector_hash',
  'vector_synced_ts',
  'vector_error',
  'sort_parameter',
  'small_photo',
  'name_of_user',
  'photo',
  'actions',
  'opener_text',
]);

export function detailDisplay(key: string, value: any): { label: string; value: string } {
  const labels: Record<string, string> = {
    created_at: 'Created at',
    reminder_time: 'Reminder time',
    modified_ts: 'Modified at',
    reminder_starts: 'Reminder starts',
  };
  return {
    label: labels[key] || key.replaceAll('_', ' '),
    value: labels[key] ? formatAssetDate(value) : String(value ?? ''),
  };
}

export const DATE_DETAIL_FIELDS = ['created_at', 'modified_ts', 'reminder_time', 'reminder_starts'];

export function orderedDetailEntries(data: AssetRecordData): [string, string][] {
  const grouped = [...DATE_DETAIL_FIELDS, 'starred'];
  const entries = Object.entries(data).filter(
    ([key, value]) => value !== '' && value != null && !HIDDEN_DETAIL_FIELDS.has(key)
  ) as [string, string][];
  return [
    ...entries.filter(([key]) => !grouped.includes(key)),
    ...grouped.flatMap((key) => entries.filter(([k]) => k === key)),
  ];
}

export function modifiedSortTime(value: any): number {
  const raw = String(value ?? '').trim();
  if (!raw) return -Infinity;
  if (/^\d{4,6}(?:\.\d+)?$/.test(raw) && Number(raw) >= 20000 && Number(raw) <= 100000) {
    return Date.UTC(1899, 11, 30) + Math.round((Number(raw) * 86400000) / 1000) * 1000;
  }
  const local = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/
  );
  const us = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );
  if (local) {
    const [, y, m, d, h = '0', min = '0', sec = '0'] = local;
    return Date.UTC(+y, +m - 1, +d, +h, +min, +sec);
  }
  if (us) {
    let [, m, d, y, h = '0', min = '0', sec = '0', ampm] = us;
    if (ampm) h = String((+h % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0));
    return Date.UTC(+y, +m - 1, +d, +h, +min, +sec);
  }
  const formatted = formatAssetDate(raw);
  const stamp = Date.parse(formatted + ' UTC');
  return Number.isFinite(stamp) ? stamp : -Infinity;
}

const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function sortRecords(records: AssetRecord[], mode: SortMode = 'modified'): AssetRecord[] {
  const byName = (a: AssetRecord, b: AssetRecord) =>
    nameCollator.compare(a.data.name || '', b.data.name || '');

  return [...records].sort((a, b) => {
    if (mode === 'name') return byName(a, b) || b.row - a.row;
    if (mode === 'status') {
      const cmp = (a.data.status || '').localeCompare(b.data.status || '');
      if (cmp !== 0) return cmp;
      return byName(a, b) || b.row - a.row;
    }
    if (mode === 'type') {
      const cmp = (a.data.type || '').localeCompare(b.data.type || '');
      if (cmp !== 0) return cmp;
      return byName(a, b) || b.row - a.row;
    }
    // mode === 'modified' (Newest first)
    const ta = (typeof a._modTime === 'number' && a._modTime > 0) ? a._modTime : modifiedSortTime(a.data.modified_ts);
    const tb = (typeof b._modTime === 'number' && b._modTime > 0) ? b._modTime : modifiedSortTime(b.data.modified_ts);
    if (ta !== tb) return tb - ta; // highest timestamp (newest) first
    return b.row - a.row; // newer row in spreadsheet first
  });
}

export async function fetchLiveCRMRecords(token?: string | null, forceRefresh = false): Promise<AssetRecord[]> {
  // 1. Try server endpoint /api/crm/records (returns all 4,600+ real assets from Google Sheet)
  try {
    const res = await fetch(`/api/crm/records${forceRefresh ? '?refresh=true' : ''}`);
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.records) && json.records.length > 0) {
        return json.records;
      }
    }
  } catch (err) {
    console.warn('/api/crm/records fetch failed, trying direct gviz...', err);
  }

  // 2. Direct client gviz fetch
  try {
    const gvizRes = await fetch(
      `https://docs.google.com/spreadsheets/d/${ID}/gviz/tq?tqx=out:json&gid=${GID}`,
      { cache: 'no-store' }
    );
    if (gvizRes.ok) {
      const text = await gvizRes.text();
      const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const gvizJson = JSON.parse(jsonStr);
      const cols: string[] = gvizJson.table.cols.map((c: any) => c.label || '');
      const rows = gvizJson.table.rows || [];
      const allowedShortcuts = new Set(['folder', 'opener', 'memo', 'link']);

      const parsed: AssetRecord[] = rows.flatMap((row: any, idx: number) => {
        const data: AssetRecordData = {};
        const linksMap = new Map<string, ShortcutLink>();

        cols.forEach((colName, colIdx) => {
          const cell = row.c ? row.c[colIdx] : null;
          const rawVal = cell ? (cell.f != null ? String(cell.f) : (cell.v != null ? String(cell.v) : '')) : '';
          data[colName] = rawVal;

          if (rawVal && allowedShortcuts.has(colName)) {
            const safe = safeUrl(rawVal);
            if (safe) {
              linksMap.set(safe, { url: safe, label: colName.charAt(0).toUpperCase() + colName.slice(1) });
            }
          }
        });

        if (!data.asset_id && !data.name) return [];

        return [{
          data,
          row: idx + 2,
          links: Array.from(linksMap.values()),
          search: Object.values(data).join(' ').normalize('NFKD').toLowerCase(),
          _modTime: modifiedSortTime(data.modified_ts),
        }];
      });

      if (parsed.length > 0) return sortRecords(parsed, 'modified');
    }
  } catch (directGvizErr) {
    console.warn('Direct gviz fetch failed, trying Google Sheets API...', directGvizErr);
  }

  // 3. Fallback to Google Sheets API if token provided
  if (token) {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${ID}?fields=sheets(properties)`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheet = meta.sheets?.find((s: any) => s.properties.sheetId === GID)?.properties;
        if (sheet) {
          const rowCount = sheet.gridProperties?.rowCount || 5000;
          const range = `'${sheet.title.replaceAll("'", "''")}'!A1:BG${rowCount}`;
          const fields =
            'sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns(format(link)),userEnteredValue(formulaValue)))))';
          const gridRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${ID}?includeGridData=true&ranges=${encodeURIComponent(
              range
            )}&fields=${encodeURIComponent(fields)}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
          );
          if (gridRes.ok) {
            const grid = await gridRes.json();
            const rowData = grid.sheets?.[0]?.data?.[0]?.rowData || [];
            return recordsFrom(rowData);
          }
        }
      }
    } catch (e) {
      console.warn('Sheets API fallback error:', e);
    }
  }

  throw new Error('Unable to load CRM records.');
}
