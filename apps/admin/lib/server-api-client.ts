// apps/admin/lib/server-api-client.ts
import 'server-only';

const BFF_BASE_URL =
  process.env.NEXT_PUBLIC_BFF_URL ??
  process.env.BFF_BASE_URL ??
  'http://localhost:3001';

const INTERNAL_ADMIN_SECRET = process.env.INTERNAL_ADMIN_SECRET;

if (!BFF_BASE_URL) {
  console.warn('[server-api-client] BFF_BASE_URL / NEXT_PUBLIC_BFF_URL is not set');
}

if (!INTERNAL_ADMIN_SECRET) {
  console.warn('[server-api-client] INTERNAL_ADMIN_SECRET is not set – BFF auth will fail');
}

async function fetchFromBff(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${BFF_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  // Default JSON content-type unless caller overrides
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach internal auth secret for all requests to BFF
  if (INTERNAL_ADMIN_SECRET) {
    headers.set('Authorization', `Bearer ${INTERNAL_ADMIN_SECRET}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    console.error('[server-api-client] Failed to parse BFF JSON:', { url, text });
    throw new Error(`Failed to parse BFF response from ${url}`);
  }

  if (!response.ok) {
    console.error('[server-api-client] BFF error response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      data,
    });
    throw new Error(
      `BFF request failed: ${response.status} ${response.statusText} – ${JSON.stringify(data)}`,
    );
  }

  return data;
}

// Convenience helpers if you use them elsewhere
export async function getFromBff(path: string) {
  return fetchFromBff(path, { method: 'GET' });
}

export async function postToBff(path: string, body?: any) {
  return fetchFromBff(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function putToBff(path: string, body?: any) {
  return fetchFromBff(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function patchToBff(path: string, body?: any) {
  return fetchFromBff(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function deleteFromBff(path: string) {
  return fetchFromBff(path, { method: 'DELETE' });
}

export { fetchFromBff };
