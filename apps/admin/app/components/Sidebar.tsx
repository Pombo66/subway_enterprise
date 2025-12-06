import type { ReactNode } from 'react';

export default function Sidebar() {
  const Item = ({ href, label, svg }: { href: string; label: string; svg: ReactNode }) => (
    <a href={href} className="sb-link">
      <span className="sb-ico" aria-hidden>{svg}</span>
      <span className="sb-txt">{label}</span>
    </a>
  );

  const I = {
    dash:  (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3Zm10 3h8v5h-8V6ZM3 13h8v8H3v-8Zm10 3h8v5h-8v-5Z"/></svg>),
    analytics: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v18h18v-2H5V3H3Zm4 14h2V9H7v8Zm4 0h2V7h-2v10Zm4 0h2V5h-2v12Z"/></svg>),
    menu:  (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>),
    cats:  (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 7v-7h7v7h-7Z"/></svg>),
    items: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10l3 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7l3-5Zm0 5h10l-1.5-3h-7L7 7Z"/></svg>),
    price: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 10h1a1 1 0 1 1 0 2h-1a7.002 7.002 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-1.07A7.002 7.002 0 0 1 5 12H4a1 1 0 1 1 0-2h1a7.002 7.002 0 0 1 6-6.93V2a1 1 0 0 1 1-1Z"/></svg>),
    stores:(<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l2-4h14l2 4v4a5 5 0 0 1-10 0A5 5 0 0 1 3 11V7Zm3 9h12v5H6v-5Z"/></svg>),
    orders:(<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v2H4V4Zm0 5h16v2H4V9Zm0 5h10v2H4v-2Z"/></svg>),
    users: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5v3h18v-3c0-2.5-4-5-9-5Z"/></svg>),
    audit: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14v18l-7-3-7 3V3Z"/></svg>),
    portfolio: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>),
    scenarios: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>),
  };

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-dot sb-dot--g" />
        <div className="sb-dot sb-dot--y" />
        <div className="sb-title">
          <div className="sb-h">Subway QSR</div>
          <div className="sb-sub">Admin Dashboard</div>
        </div>
      </div>
      <nav className="sb-nav">
        <Item href="/dashboard"  label="Dashboard"  svg={I.dash} />
        <Item href="/menu"       label="Menu"       svg={I.menu} />
        <Item href="/orders"     label="Orders"     svg={I.orders} />
        <Item href="/stores"     label="Stores"     svg={I.stores} />
        <Item href="/portfolio"  label="Portfolio"  svg={I.portfolio} />
        <Item href="/scenarios"  label="Scenarios"  svg={I.scenarios} />
        <Item href="/analytics"  label="Analytics"  svg={I.analytics} />
        <Item href="/settings"   label="Settings"   svg={I.users} />
      </nav>
    </aside>
  );
}
