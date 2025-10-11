export const bffBase = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';
export async function bff<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${bffBase}${path}`, { ...init, cache: 'no-store' });
  if (!res.ok) {
    const errorText = await res.text();
    const excerpt = errorText.length > 100 ? errorText.slice(0, 100) + '...' : errorText;
    throw new Error(`BFF ${path} ${res.status}: ${excerpt}`);
  }
  return res.json() as Promise<T>;
}

