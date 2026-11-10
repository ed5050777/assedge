export const handler = async (event: any) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gitlab-Token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const { asset_id, instructions, token, hermes_url } = body;

    if (!asset_id || typeof asset_id !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: 'This asset has no valid internal ID.' }),
      };
    }
    if (!instructions || typeof instructions !== 'string' || !instructions.trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: 'Enter instructions for Sam AI first.' }),
      };
    }
    if (!token || typeof token !== 'string' || !token.trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: 'Save your webhook token in Sam AI connection first.' }),
      };
    }

    const DEFAULT_HERMES_URL = 'https://nvidia-vera-rubin.tailc9ae59.ts.net/webhooks/assedge';
    const targetUrl = (hermes_url && typeof hermes_url === 'string' && hermes_url.trim())
      ? hermes_url.trim()
      : DEFAULT_HERMES_URL;

    const payload = {
      event_type: 'trigger',
      source: 'Assedge AppSheet',
      table: 'Assets',
      asset_id: asset_id.trim(),
      objective: '',
      comment: instructions.trim(),
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
        signal: controller.signal,
      });
    } catch (netErr: any) {
      clearTimeout(timeout);
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: `Delivery could not be confirmed. Check Hermes before sending again. (${netErr.message || 'Network error'})`,
        }),
      };
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: `Sam AI authentication rejected (HTTP ${response.status}). Check the saved token and gateway authentication.`,
        }),
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: `Hermes returned HTTP ${response.status}${errText ? `: ${errText.slice(0, 150)}` : ''}. Check Hermes before sending again.`,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ ok: true, message: 'Received by Sam AI.' }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: error.message || 'Internal proxy failure' }),
    };
  }
};
