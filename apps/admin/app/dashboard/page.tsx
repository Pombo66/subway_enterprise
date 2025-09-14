"use client";

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import TrendChart from '../components/TrendChart';

type KPIs = {
  ordersToday: number;
  revenueToday: number;
  menuItems: number;
  pendingOrders: number;
};

const BFF_BASE = process.env.NEXT_PUBLIC_BFF_URL || 'http://127.0.0.1:3001';

export default function Dashboard() {
  const [data, setData] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch(`${BFF_BASE}/kpis`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`BFF /kpis ${res.status}`);
      const json = (await res.json()) as KPIs;
      setData(json);
    } catch (e: any) {
      setErr(e.message || 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const cards = useMemo(() => ([
    { label: "Today's Orders", value: data?.ordersToday ?? 0, trend: data ? (data.ordersToday >= 10 ? 'up' : 'down') : null },
    { label: 'Revenue Today',  value: data ? `£${data.revenueToday.toFixed(2)}` : '£0.00', trend: data ? (data.revenueToday >= 50 ? 'up' : 'down') : null },
    { label: 'Menu Items',     value: data?.menuItems ?? 0, trend: null },
    { label: 'Pending Orders', value: data?.pendingOrders ?? 0, trend: data ? (data.pendingOrders > 0 ? 'down' : 'up') : null },
  ]), [data]);

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm opacity-70">
            {format(new Date(), 'EEE, d MMM yyyy')} • Source: {BFF_BASE}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm hover:opacity-80 border border-white/10"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {err && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <strong>Error:</strong> {err}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-sm opacity-70">{c.label}</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-3xl font-semibold">{c.value as any}</p>
              {c.trend === 'up' && (
                <span className="inline-flex items-center text-green-400 text-xs">
                  <ArrowUpRight className="h-4 w-4" /> good
                </span>
              )}
              {c.trend === 'down' && (
                <span className="inline-flex items-center text-amber-400 text-xs">
                  <ArrowDownRight className="h-4 w-4" /> watch
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      <section>
        <TrendChart />
      </section>
    </main>
  );
}
