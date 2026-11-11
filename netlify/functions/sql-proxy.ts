const DEFAULT_SQL_BASE_URL = 'https://nvidia-vera-rubin.tailc9ae59.ts.net:8443';
const DEFAULT_SQL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiaGVybWVzX2FwcCJ9.VvYWfXNoPmmnTFDVya3a8VQVLu9xq6frzzpmBgKVLCI';

export const handler = async (event: any) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Prefer, Accept',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      },
      body: '',
    };
  }

  try {
    // Extract token from incoming Authorization header or use default
    const incomingAuth = event.headers.authorization || event.headers.Authorization;
    const token = incomingAuth && incomingAuth.startsWith('Bearer ')
      ? incomingAuth.slice(7).trim()
      : DEFAULT_SQL_TOKEN;

    // Determine subpath: e.g. /api/sql/assets -> /assets
    let subpath = '/assets';
    if (event.path) {
      const match = event.path.match(/\/api\/sql(\/.*)$/);
      if (match && match[1]) {
        subpath = match[1];
      }
    }

    // Determine query string
    let queryString = event.rawQuery || '';
    if (!queryString && event.queryStringParameters) {
      queryString = new URLSearchParams(event.queryStringParameters).toString();
    }

    const targetUrl = `${DEFAULT_SQL_BASE_URL}${subpath}${queryString ? '?' + queryString : ''}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    const prefer = event.headers.prefer || event.headers.Prefer;
    if (prefer) {
      headers['Prefer'] = prefer;
    }

    const fetchOptions: RequestInit = {
      method: event.httpMethod,
      headers,
    };

    if (event.httpMethod === 'PATCH' || event.httpMethod === 'POST') {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = event.body;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    fetchOptions.signal = controller.signal;

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(targetUrl, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }

    const bodyText = await upstreamRes.text();
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    };

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    return {
      statusCode: upstreamRes.status,
      headers: responseHeaders,
      body: bodyText,
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: `SQL Proxy failed: ${err.message || 'Unknown network error'}`,
      }),
    };
  }
};
