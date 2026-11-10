import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DEFAULT_HERMES_URL = 'https://nvidia-vera-rubin.tailc9ae59.ts.net/webhooks/assedge';
const CRM_SPREADSHEET_ID = '1mJc2Z3ziqRIHqJaES1p9u12MbZgWlEBxNT_bND6Nuuc';
const CRM_GID = 1964624729;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'REFUMO ASSEDGE', timestamp: new Date().toISOString() });
});

// Hermes dispatch endpoint to bypass browser CORS when sending tasks to Sam AI
app.post('/api/hermes/send', async (req, res) => {
  try {
    const { asset_id, instructions, token, hermes_url } = req.body || {};
    if (!asset_id || typeof asset_id !== 'string') {
      return res.status(400).json({ ok: false, error: 'This asset has no valid internal ID.' });
    }
    if (!instructions || typeof instructions !== 'string' || !instructions.trim()) {
      return res.status(400).json({ ok: false, error: 'Enter instructions for Sam AI first.' });
    }
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ ok: false, error: 'Save your webhook token in Sam AI connection first.' });
    }

    const targetUrl = (hermes_url && typeof hermes_url === 'string' && hermes_url.trim()) ? hermes_url.trim() : DEFAULT_HERMES_URL;

    const payload = {
      event_type: 'trigger',
      source: 'Assedge AppSheet',
      table: 'Assets',
      asset_id: asset_id.trim(),
      objective: '',
      comment: instructions.trim()
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gitlab-Token': token.trim(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (netErr: any) {
      clearTimeout(timeout);
      return res.status(502).json({
        ok: false,
        error: `Delivery could not be confirmed. Check Hermes before sending again; the task may have arrived. Ensure this server/device can reach ${targetUrl}. (${netErr.message || 'Network error'})`
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      return res.status(response.status).json({
        ok: false,
        error: `Sam AI authentication rejected (HTTP ${response.status}). Check the saved token and gateway authentication: this client sends X-Gitlab-Token.`
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(response.status).json({
        ok: false,
        error: `Hermes returned HTTP ${response.status}${errText ? `: ${errText.slice(0, 150)}` : ''}. Check Hermes before sending again.`
      });
    }

    return res.json({ ok: true, message: 'Received by Sam AI.' });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Internal proxy failure' });
  }
});

interface CachedCRM {
  records: any[];
  timestamp: number;
}
let cachedCRMData: CachedCRM | null = null;
const CACHE_TTL_MS = 120 * 1000; // 2 minutes in-memory cache

function modifiedSortTime(value: any): number {
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
  const stamp = Date.parse(raw);
  return Number.isFinite(stamp) ? stamp : -Infinity;
}

function parseGvizToRecords(gvizJson: any) {
  const cols: string[] = gvizJson.table.cols.map((c: any) => c.label || '');
  const rows = gvizJson.table.rows || [];
  const allowedShortcuts = new Set(['folder', 'opener', 'memo', 'link']);

  const parsed = rows.flatMap((row: any, idx: number) => {
    const data: Record<string, string> = {};
    const linksMap = new Map<string, { url: string; label: string }>();

    cols.forEach((colName, colIdx) => {
      const cell = row.c ? row.c[colIdx] : null;
      const rawVal = cell ? (cell.f != null ? String(cell.f) : (cell.v != null ? String(cell.v) : '')) : '';
      data[colName] = rawVal;

      if (rawVal && allowedShortcuts.has(colName)) {
        try {
          const u = new URL(rawVal);
          if (['https:', 'http:', 'mailto:', 'tel:'].includes(u.protocol)) {
            linksMap.set(u.href, { url: u.href, label: colName.charAt(0).toUpperCase() + colName.slice(1) });
          }
        } catch {}
      }
    });

    if (!data.asset_id && !data.name) return [];

    const modTime = modifiedSortTime(data.modified_ts);

    return [{
      data,
      row: idx + 2,
      links: Array.from(linksMap.values()),
      search: Object.values(data).join(' ').normalize('NFKD').toLowerCase(),
      _modTime: modTime,
    }];
  });

  // Always pre-sort all assets from newest to oldest
  parsed.sort((a: any, b: any) => {
    const ta = typeof a._modTime === 'number' && Number.isFinite(a._modTime) ? a._modTime : -Infinity;
    const tb = typeof b._modTime === 'number' && Number.isFinite(b._modTime) ? b._modTime : -Infinity;
    if (ta !== tb) return tb - ta; // Newest first
    return b.row - a.row; // Newer row in sheet first
  });

  return parsed;
}

// Live CRM records endpoint (fetches all 4,600+ real assets from Google Sheet)
app.get('/api/crm/records', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();

  if (!forceRefresh && cachedCRMData && (now - cachedCRMData.timestamp < CACHE_TTL_MS)) {
    return res.json({ ok: true, count: cachedCRMData.records.length, records: cachedCRMData.records, cached: true });
  }

  try {
    const gvizRes = await fetch(
      `https://docs.google.com/spreadsheets/d/${CRM_SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=${CRM_GID}`,
      { cache: 'no-store' }
    );
    if (!gvizRes.ok) {
      throw new Error(`Google Sheets responded with HTTP ${gvizRes.status}`);
    }
    const text = await gvizRes.text();
    const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const gvizJson = JSON.parse(jsonStr);
    const parsedRecords = parseGvizToRecords(gvizJson);

    cachedCRMData = {
      records: parsedRecords,
      timestamp: now
    };

    res.json({ ok: true, count: parsedRecords.length, records: parsedRecords, cached: false });
  } catch (err: any) {
    if (cachedCRMData) {
      return res.json({ ok: true, count: cachedCRMData.records.length, records: cachedCRMData.records, cached: true, stale: true });
    }
    res.status(500).json({ ok: false, error: err.message || 'Failed to fetch CRM assets' });
  }
});

// Proxy for Google Sheets data (can be used if direct browser fetch has token or network limitations)
app.get('/api/sheets/data', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header with Google access token' });
    }

    // Fetch spreadsheet metadata first to identify sheet title by GID
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CRM_SPREADSHEET_ID}?fields=sheets(properties)`, {
      headers: { Authorization: authHeader }
    });

    if (!metaRes.ok) {
      const body = await metaRes.json().catch(() => ({}));
      return res.status(metaRes.status).json({
        error: body.error?.message || `Google Sheets API responded with ${metaRes.status}`
      });
    }

    const meta = await metaRes.json();
    const sheet = meta.sheets?.find((s: any) => s.properties.sheetId === CRM_GID)?.properties;
    if (!sheet) {
      return res.status(404).json({ error: `Configured CRM tab (GID ${CRM_GID}) was not found in the spreadsheet.` });
    }

    const rowCount = sheet.gridProperties?.rowCount || 1000;
    const range = `'${sheet.title.replaceAll("'", "''")}'!A1:BG${rowCount}`;
    const fields = 'sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns(format(link)),userEnteredValue(formulaValue)))))';

    const gridRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CRM_SPREADSHEET_ID}?includeGridData=true&ranges=${encodeURIComponent(range)}&fields=${encodeURIComponent(fields)}`,
      { headers: { Authorization: authHeader } }
    );

    if (!gridRes.ok) {
      const body = await gridRes.json().catch(() => ({}));
      return res.status(gridRes.status).json({
        error: body.error?.message || `Google Sheets API responded with ${gridRes.status}`
      });
    }

    const grid = await gridRes.json();
    res.json(grid);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed fetching sheets data' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const fs = await import('fs');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html', 'Cache-Control': 'no-store, must-revalidate' }).end(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`REFUMO ASSEDGE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
