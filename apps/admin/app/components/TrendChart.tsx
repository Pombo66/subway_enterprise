'use client';

import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DailyPoint = { day: string; orders: number; revenue: number };
type ChartPoint = { d: string; v: number };

const BFF_BASE = process.env.NEXT_PUBLIC_BFF_URL || 'http://127.0.0.1:3001';

export default function TrendChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`${BFF_BASE}/kpis/daily`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`/kpis/daily ${res.status}`);
        const json = (await res.json()) as DailyPoint[];
        // map to short weekday label + orders value
        const mapped: ChartPoint[] = json.map((p) => ({
          d: new Date(`${p.day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
          v: Number(p.orders ?? 0),
        }));
        setData(mapped);
      } catch (e: any) {
        setErr(e.message || 'Failed to load daily metrics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-medium">Orders last 7 days</h2>
        {loading && <span className="text-xs opacity-70">Loading…</span>}
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm">
          <strong>Error:</strong> {err}
        </div>
      )}

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="d" stroke="currentColor" opacity={0.6} />
            <YAxis stroke="currentColor" opacity={0.6} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
            <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
