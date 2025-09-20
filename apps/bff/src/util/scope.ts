export type Scope = 'global' | 'region' | 'store';

export function parseScope(q: Record<string, any>) {
  const scope = String(q.scope || 'global') as Scope;
  const storeId = q.storeId ? String(q.storeId) : undefined;
  const country = q.country ? String(q.country) : undefined;
  const region = q.region ? String(q.region) : undefined;
  return { scope, storeId, country, region };
}

// Prisma where for Order/MenuItem with optional Store relation filters
// Returns a generic shape where `store` contains filters suitable for Store queries.
export function makeWhere({ scope, storeId, country, region }: ReturnType<typeof parseScope>) {
  if (scope === 'store' && storeId) return { storeId } as any;
  if (scope === 'region' && (country || region)) {
    const store: any = {};
    if (country) store.country = { equals: country, mode: 'insensitive' };
    if (region) store.region = { equals: region, mode: 'insensitive' };
    return { store } as any;
  }
  return {} as any; // global
}
