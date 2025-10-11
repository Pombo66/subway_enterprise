interface OrderRow {
  id: string;
  total: number | null;
  status: string;
  createdAt: string;
  Store?: { id: string; name: string } | null;
}

interface Health {
  ok: boolean;
}

interface QuickActionsPanelProps {
  recent: OrderRow[];
  health: Health;
  avgOrderValue: number;
}

export default function QuickActionsPanel({ recent, health, avgOrderValue }: QuickActionsPanelProps) {
  return (
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
          {recent.length === 0 && (
            <div className="muted" style={{ fontSize: 13 }}>
              No recent orders.
            </div>
          )}
        </div>
      </div>

      <div className="s-panelCard">
        <p className="s-panelT">Quick Actions</p>
        <div className="qa">
          <a href="/items/new" className="s-btn s-btn--sm">
            Add New Item
          </a>
          <a href="/orders" className="s-btn s-btn--sm btn-secondary">
            View All Orders
          </a>
          <a href="/categories" className="s-btn s-btn--sm btn-secondary">
            Manage Categories
          </a>
        </div>
      </div>

      <div className="s-panelCard">
        <p className="s-panelT">System Status</p>
        <div className="sys">
          <div className="sys-row">
            <span>API</span>
            <span className="state ok">{health.ok ? 'Online' : 'Offline'}</span>
          </div>
          <div className="sys-row">
            <span>Database</span>
            <span className="state ok">Connected</span>
          </div>
          <div className="sys-row">
            <span>Last Backup</span>
            <span className="muted">2 hours ago</span>
          </div>
        </div>
        <div className="sep" />
        <p className="s-panelT">Today&apos;s Summary</p>
        <div className="sys">
          <div className="sys-row">
            <span>Avg Order Value</span>
            <span className="strong">£{avgOrderValue.toFixed(2)}</span>
          </div>
          <div className="sys-row">
            <span>Peak Hour</span>
            <span className="strong">12:00 PM</span>
          </div>
          <div className="sys-row">
            <span>Customer Satisfaction</span>
            <span className="strong">4.8/5</span>
          </div>
        </div>
      </div>
    </section>
  );
}