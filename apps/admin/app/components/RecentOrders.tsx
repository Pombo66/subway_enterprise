
'use client';
import { useEffect, useState } from 'react';
import type { Filters } from './FilterBar';

type Row = { id: string; total: number; status: string; createdAt: string };
const BFF = process.env.NEXT_PUBLIC_BFF_URL || 'http://127.0.0.1:3001';
const qs = (f: Filters) => {
  const p = new URLSearchParams();
  if (f.scope)   p.set('scope', f.scope);
  if (f.storeId) p.set('storeId', f.storeId);
  if (f.country) p.set('country', f.country);
  if (f.region)  p.set('region', f.region);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export default function RecentOrders({ filters }: { filters: Filters }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const res = await fetch(`${BFF}/orders/recent${qs(filters)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`/orders/recent ${res.status}`);
        setRows(await res.json());
      } catch (e:any) { setErr(e.message); }
    })();
  }, [filters]);

  return (
    <div className="card p-4 mt-6">
      <h2 className="text-lg font-medium mb-3">Recent orders</h2>
      {err && <div className="text-sm text-red-400">Error: {err}</div>}
      <ul className="divide-y divide-white/10">
        {rows.map(r => (
          <li key={r.id} className="py-2 flex items-center justify-between">
            <div className="text-sm opacity-80">
              <span className="font-mono">{r.id.slice(0,6)}</span>
              <span className="opacity-50"> • {new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">£{r.total.toFixed(2)}</span>
              <span className="text-xs rounded px-2 py-1 border border-white/10 opacity-80">{r.status}</span>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-sm opacity-60">No recent orders.</li>}
      </ul>
    </div>
  );
}
