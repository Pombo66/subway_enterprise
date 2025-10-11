import KPICard from './KPICard';

interface KPIs {
  ordersToday: number;
  revenueToday: number;
  menuItems: number;
  pendingOrders: number;
  totalStores?: number;
}

interface KPISectionProps {
  kpis: KPIs;
  delta: number;
}

function money(n: number) {
  return n.toFixed(2);
}

export default function KPISection({ kpis, delta }: KPISectionProps) {
  const avgOrderValue = kpis.ordersToday ? kpis.revenueToday / Math.max(1, kpis.ordersToday) : 0;

  const icons = {
    orders: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 7V6a6 6 0 1 1 12 0v1h2a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2h2Zm2 0h8V6a4 4 0 1 0-8 0v1Z" />
      </svg>
    ),
    revenue: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 17h6a1 1 0 1 1 0 2H5v-2c1.657 0 3-1.79 3-4H6a1 1 0 1 1 0-2h2v-1a4 4 0 1 1 8 0h-2a2 2 0 1 0-4 0v1h5a1 1 0 1 1 0 2h-5c0 1.18-.306 2.215-.83 3H17a1 1 0 1 1 0 2H7Z" />
      </svg>
    ),
    pending: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 2h12a1 1 0 0 1 1 1v3a5 5 0 0 1-2.1 4.07l-1.9 1.27 1.9 1.27A5 5 0 0 1 19 16v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3a5 5 0 0 1 2.1-4.07L9 11.34 7.1 10.07A5 5 0 0 1 5 6V3a1 1 0 0 1 1-1Z" />
      </svg>
    ),
    menu: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 1 7l11 5 11-5L12 2Zm0 9L1 6v3l11 5 11-5V6l-11 5Zm0 4L1 10v3l11 5 11-5v-3l-11 5Z" />
      </svg>
    ),
    avgOrder: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 7a2 2 0 0 1 2-2h10a2 2 0 1 0 0 4H5a2 2 0 0 1-2-2Zm18 10a2 2 0 0 1-2 2H9a2 2 0 1 0 0-4h10a2 2 0 0 1 2 2Z" />
      </svg>
    ),
    stores: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.66.34 3.34.34 5 0 5.16-1 9-5.45 9-11V7l-10-5z" />
      </svg>
    ),
  };

  return (
    <section className="s-kpis">
      <KPICard
        title="Orders Today"
        value={kpis.ordersToday ?? '—'}
        subtitle={`vs last point: ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`}
        icon={icons.orders}
        accentColor="green"
      />

      <KPICard
        title="Revenue Today (£)"
        value={typeof kpis.revenueToday === 'number' ? money(kpis.revenueToday) : '—'}
        subtitle={`Avg per order: £${avgOrderValue.toFixed(2)}`}
        icon={icons.revenue}
        accentColor="yellow"
      />

      <KPICard
        title="Pending"
        value={kpis.pendingOrders ?? '—'}
        subtitle={`Queue health ${(kpis.pendingOrders ?? 0) === 0 ? 'clear' : 'action needed'}`}
        icon={icons.pending}
        accentColor="green"
      />

      <KPICard
        title="Menu Items"
        value={kpis.menuItems ?? '—'}
        subtitle="Active catalogue"
        icon={icons.menu}
        accentColor="green"
      />

      <KPICard
        title="Avg Order Value"
        value={`£${avgOrderValue.toFixed(2)}`}
        subtitle="Today only"
        icon={icons.avgOrder}
        accentColor="yellow"
      />

      <KPICard
        title="Total Stores"
        value={kpis.totalStores ?? '—'}
        subtitle="Active locations"
        icon={icons.stores}
        accentColor="blue"
      />
    </section>
  );
}