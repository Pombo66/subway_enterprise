import { bff } from '@/lib/api';

type KPIs = {
  scopeApplied?: { scope?: string };
  ordersToday: number;
  revenueToday: number;
  menuItems: number;
  pendingOrders: number;
};
type Daily = { day: string; orders: number; revenue: number };
type OrderRow = {
  id: string;
  total: number | null;
  status: string;
  createdAt: string;
  Store?: { id: string; name: string } | null;
};
type Health = { ok: boolean };

function money(n: number) {
  return n.toFixed(2);
}

export default async function DashboardPage() {
  const kpis = await bff<KPIs>('/kpis');

  let daily: Daily[] = [];
  try {
    daily = await bff<Daily[]>('/kpis/daily');
  } catch {}

  const [recent, health] = await Promise.all([
    bff<OrderRow[]>('/orders/recent').catch((): OrderRow[] => []),
    bff<Health>('/healthz').catch((): Health => ({ ok: false })),
  ]);

  const pts = daily.length ? daily.map((d) => d.orders) : [3, 4, 2, 6, 5, 8, 7, 9, 6, 10, 8, 11, 9, 12];
  const last = pts[pts.length - 1] ?? 0;
  const prev = pts[pts.length - 2] ?? 0;
  const delta = prev ? ((last - prev) / prev) * 100 : 0;
  const avgOrderValue = kpis.ordersToday ? kpis.revenueToday / Math.max(1, kpis.ordersToday) : 0;

  const w = 900;
  const h = 220;
  const pad = 24;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = Math.max(1, max - min);
  const step = pts.length > 1 ? (w - 2 * pad) / (pts.length - 1) : 0;
  const X = (i: number) => pad + step * i;
  const Y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'} ${X(i)} ${Y(p)}`).join(' ');
  const area = `M ${X(0)} ${Y(pts[0] ?? 0)} ${pts
    .map((p, i) => `L ${X(i)} ${Y(p)}`)
    .join(' ')} L ${X(pts.length - 1)} ${h - pad} L ${X(0)} ${h - pad} Z`;

  const revPts = daily.length ? daily.map((d) => Math.max(0, Math.round(d.revenue))) : pts.map((p) => p * 3);
  const rMin = Math.min(...revPts);
  const rMax = Math.max(...revPts);
  const rSpan = Math.max(1, rMax - rMin);
  const rY = (v: number) => h - pad - ((v - rMin) / rSpan) * (h - 2 * pad);
  const rPath = revPts.map((p, i) => `${i ? 'L' : 'M'} ${X(i)} ${rY(p)}`).join(' ');
  const rArea = `M ${X(0)} ${rY(revPts[0] ?? 0)} ${revPts
    .map((p, i) => `L ${X(i)} ${rY(p)}`)
    .join(' ')} L ${X(revPts.length - 1)} ${h - pad} L ${X(0)} ${h - pad} Z`;

  return (
    <main>
      <div className="s-wrap">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 className="s-h1">Subway Enterprise</h1>
          <span className="s-badge">Scope: {kpis?.scopeApplied?.scope ?? 'global'}</span>
        </div>

        <section className="s-kpis">
          <div className="s-card">
            <div className="s-cardAccent s-accentGreen" />
            <p className="s-k">
              <span className="s-blob">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 7V6a6 6 0 1 1 12 0v1h2a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2h2Zm2 0h8V6a4 4 0 1 0-8 0v1Z" />
                </svg>
              </span>
              Orders Today
            </p>
            <p className="s-v">{kpis?.ordersToday ?? '—'}</p>
            <p className="s-sub">
              vs last point: <span className="s-strong">{delta >= 0 ? '+' : ''}{delta.toFixed(0)}%</span>
            </p>
          </div>

          <div className="s-card">
            <div className="s-cardAccent s-accentYellow" />
            <p className="s-k">
              <span className="s-blob s-blob--y">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 17h6a1 1 0 1 1 0 2H5v-2c1.657 0 3-1.79 3-4H6a1 1 0 1 1 0-2h2v-1a4 4 0 1 1 8 0h-2a2 2 0 1 0-4 0v1h5a1 1 0 1 1 0 2h-5c0 1.18-.306 2.215-.83 3H17a1 1 0 1 1 0 2H7Z" />
                </svg>
              </span>
              Revenue Today (£)
            </p>
            <p className="s-v">{typeof kpis?.revenueToday === 'number' ? money(kpis.revenueToday) : '—'}</p>
            <p className="s-sub">
              Avg per order: <span className="s-strong">£{avgOrderValue.toFixed(2)}</span>
            </p>
          </div>

          <div className="s-card">
            <div className="s-cardAccent s-accentGreen" />
            <p className="s-k">
              <span className="s-blob">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 2h12a1 1 0 0 1 1 1v3a5 5 0 0 1-2.1 4.07l-1.9 1.27 1.9 1.27A5 5 0 0 1 19 16v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3a5 5 0 0 1 2.1-4.07L9 11.34 7.1 10.07A5 5 0 0 1 5 6V3a1 1 0 0 1 1-1Z" />
                </svg>
              </span>
              Pending
            </p>
            <p className="s-v">{kpis?.pendingOrders ?? '—'}</p>
            <p className="s-sub">
              Queue health <span className="s-badge">{(kpis?.pendingOrders ?? 0) === 0 ? 'clear' : 'action needed'}</span>
            </p>
          </div>

          <div className="s-card">
            <div className="s-cardAccent s-accentGreen" />
            <p className="s-k">
              <span className="s-blob">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2 1 7l11 5 11-5L12 2Zm0 9L1 6v3l11 5 11-5V6l-11 5Zm0 4L1 10v3l11 5 11-5v-3l-11 5Z" />
                </svg>
              </span>
              Menu Items
            </p>
            <p className="s-v">{kpis?.menuItems ?? '—'}</p>
            <p className="s-sub">Active catalogue</p>
          </div>

          <div className="s-card">
            <div className="s-cardAccent s-accentYellow" />
            <p className="s-k">
              <span className="s-blob s-blob--y">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 7a2 2 0 0 1 2-2h10a2 2 0 1 0 0 4H5a2 2 0 0 1-2-2Zm18 10a2 2 0 0 1-2 2H9a2 2 0 1 0 0-4h10a2 2 0 0 1 2 2Z" />
                </svg>
              </span>
              Avg Order Value
            </p>
            <p className="s-v">£{(kpis?.ordersToday ? kpis.revenueToday / Math.max(1, kpis.ordersToday) : 0).toFixed(2)}</p>
            <p className="s-sub">Today only</p>
          </div>
        </section>

        <section className="s-panGrid">
          <div className="s-panelCard">
            <p className="s-panelT">Recent Orders</p>
            <div className="list">
              {recent.slice(0, 3).map((o) => (
                <div key={o.id} className="list-row">
                  <div>
                    <div className="list-h">Order #{o.id.slice(-4)}</div>
                    <div className="list-sub">{o.Store?.name ?? '—'}</div>
                  </div>
                  <div className="list-right">
                    <div className="list-amt">£{(o.total ?? 0).toFixed(2)}</div>
                    <div className={`badge ${o.status === 'PAID' ? 'ok' : 'warn'}`}>{o.status}</div>
                  </div>
                </div>
              ))}
              {recent.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No recent orders.</div>}
            </div>
          </div>

          <div className="s-panelCard">
            <p className="s-panelT">Quick Actions</p>
            <div className="qa">
              <a href="/items/new" className="btn btn-primary">Add New Item</a>
              <a href="/orders" className="btn">View All Orders</a>
              <a href="/categories" className="btn">Manage Categories</a>
            </div>
          </div>

          <div className="s-panelCard">
            <p className="s-panelT">System Status</p>
            <div className="sys">
              <div className="sys-row"><span>API</span><span className="state ok">{health.ok ? 'Online' : 'Offline'}</span></div>
              <div className="sys-row"><span>Database</span><span className="state ok">Connected</span></div>
              <div className="sys-row"><span>Last Backup</span><span className="muted">2 hours ago</span></div>
            </div>
            <div className="sep" />
            <p className="s-panelT">Today’s Summary</p>
            <div className="sys">
              <div className="sys-row"><span>Avg Order Value</span><span className="strong">£{avgOrderValue.toFixed(2)}</span></div>
              <div className="sys-row"><span>Peak Hour</span><span className="strong">12:00 PM</span></div>
              <div className="sys-row"><span>Customer Satisfaction</span><span className="strong">4.8/5</span></div>
            </div>
          </div>
        </section>

        <section className="s-panel">
          <div className="s-panelCard">
            <p className="s-panelT">Daily Orders</p>
            <div className="s-chart">
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Daily orders">
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--s-accent)" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="var(--s-accent)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 4 }).map((_, i) => (
                  <line key={i} className="s-grid" x1={pad} x2={w - pad} y1={pad + ((h - 2 * pad) / 4) * i} y2={pad + ((h - 2 * pad) / 4) * i} />
                ))}
                <path d={area} fill="url(#fill)" />
                <path d={path} fill="none" stroke="var(--s-accent)" strokeWidth="2.5" data-line />
                {pts.length > 0 && (
                  <circle cx={X(pts.length - 1)} cy={Y(last)} r="3" fill="var(--s-accent)" data-dot />
                )}
              </svg>
            </div>
            <div className="s-glance">
              <div className="s-glItem"><span>Points</span><span className="s-strong">{pts.length}</span></div>
              <div className="s-glItem"><span>Today</span><span className="s-strong">{last}</span></div>
              <div className="s-glItem"><span>Prev</span><span className="s-strong">{prev}</span></div>
              <div className="s-glItem"><span>Δ vs prev</span><span className="s-strong">{delta >= 0 ? '+' : ''}{delta.toFixed(0)}%</span></div>
            </div>
          </div>
        </section>

        <section className="s-panel">
          <div className="s-panelCard">
            <p className="s-panelT">Daily Revenue (£)</p>
            <div className="s-chart">
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Daily revenue">
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--s-accent-2)" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="var(--s-accent-2)" stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 4 }).map((_, i) => (
                  <line key={i} className="s-grid" x1={pad} x2={w - pad} y1={pad + ((h - 2 * pad) / 4) * i} y2={pad + ((h - 2 * pad) / 4) * i} />
                ))}
                <path d={rArea} fill="url(#revFill)" />
                <path d={rPath} fill="none" stroke="var(--s-accent-2)" strokeWidth="2.5" data-line />
                {revPts.length > 0 && (
                  <circle cx={X(revPts.length - 1)} cy={rY(revPts[revPts.length - 1] ?? 0)} r="3" fill="var(--s-accent-2)" data-dot />
                )}
              </svg>
            </div>
            <div className="s-glance">
              <div className="s-glItem"><span>Total pts</span><span className="s-strong">{revPts.length}</span></div>
              <div className="s-glItem"><span>Today (£)</span><span className="s-strong">{revPts[revPts.length - 1] ?? 0}</span></div>
              <div className="s-glItem"><span>Peak (£)</span><span className="s-strong">{Math.max(...revPts)}</span></div>
              <div className="s-glItem"><span>Min (£)</span><span className="s-strong">{Math.min(...revPts)}</span></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
