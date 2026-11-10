export const HERMES_DEFAULT_URL = 'https://nvidia-vera-rubin.tailc9ae59.ts.net/webhooks/assedge';
export const HERMES_TOKEN_KEY = 'assedge.hermes.token';
export const HERMES_URL_KEY = 'assedge.hermes.url';
export const HERMES_RELAY_KEY = 'assedge.hermes.relay';

export function getSavedHermesToken(): string {
  try {
    return localStorage.getItem(HERMES_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveHermesToken(token: string): void {
  try {
    localStorage.setItem(HERMES_TOKEN_KEY, token.trim());
  } catch (e) {
    console.error('Failed to save token to localStorage', e);
  }
}

export function clearHermesToken(): void {
  try {
    localStorage.removeItem(HERMES_TOKEN_KEY);
  } catch (e) {
    console.error('Failed to remove token', e);
  }
}

export function getSavedHermesUrl(): string {
  try {
    return localStorage.getItem(HERMES_URL_KEY) || HERMES_DEFAULT_URL;
  } catch {
    return HERMES_DEFAULT_URL;
  }
}

export function saveHermesUrl(url: string): void {
  try {
    localStorage.setItem(HERMES_URL_KEY, url.trim());
  } catch (e) {
    console.error('Failed to save hermes URL', e);
  }
}

export async function tokenFingerprint(token: string): Promise<{ length: number; fingerprint: string }> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { length: token.length, fingerprint: hex.slice(0, 12) };
}

export async function sendHermes(
  assetId: string,
  instructions: string,
  token: string,
  customUrl?: string,
  useRelay: boolean = true
): Promise<string> {
  if (!assetId) throw new Error('This asset has no valid internal ID.');
  if (!instructions.trim()) throw new Error('Enter instructions first.');
  if (!token.trim()) throw new Error('Add your token in Sam AI connection settings first.');

  const targetUrl = customUrl?.trim() || getSavedHermesUrl();

  // Mode 1: Server Relay via /api/hermes/send (Recommended to bypass CORS and network restrictions)
  if (useRelay) {
    try {
      const res = await fetch('/api/hermes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: assetId,
          instructions: instructions.trim(),
          token: token.trim(),
          hermes_url: targetUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Sam AI server proxy returned HTTP ${res.status}`);
      }
      return data.message || 'Received by Sam AI.';
    } catch (relayErr: any) {
      // If server relay has an error, inform user clearly
      throw new Error(relayErr.message || 'Sam AI request failed.');
    }
  }

  // Mode 2: Direct browser fetch (for local Tailscale network clients)
  const payload = {
    event_type: 'trigger',
    source: 'Assedge AppSheet',
    table: 'Assets',
    asset_id: assetId,
    objective: '',
    comment: instructions.trim(),
  };

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gitlab-Token': token.trim(),
      },
      body: JSON.stringify(payload),
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Sam AI authentication rejected (HTTP ' +
          response.status +
          '). Check the saved token and gateway authentication.'
      );
    }
    if (!response.ok) {
      throw new Error('Hermes returned HTTP ' + response.status + '. Check Hermes before sending again.');
    }

    return 'Received by Sam AI.';
  } catch (err: any) {
    throw new Error(
      err.message ||
        'Delivery could not be confirmed. Check Hermes before sending again; ensure device can reach Hermes.'
    );
  }
}
