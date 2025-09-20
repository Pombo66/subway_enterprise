import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="s-nav">
      {/* yellow accent bar */}
      <div style={{ height: 2, background: 'var(--s-accent-2)' }} />
      <div className="s-navwrap">
        {/* Brand wordmark (brand-aligned, not official trademark logo) */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="110" height="24" viewBox="0 0 110 24" aria-label="Subway Admin" role="img">
            <rect x="0" y="8" width="18" height="8" rx="2" fill="var(--s-accent)" />
            <rect x="20" y="8" width="18" height="8" rx="2" fill="var(--s-accent-2)" />
            <text x="44" y="17" fontSize="12" fontWeight="800" fill="#ffffff" style={{fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'}}>Subway Admin</text>
          </svg>
        </div>

        <Link href="/dashboard" className="s-link">Dashboard</Link>
        <Link href="/orders" className="s-link">Orders</Link>
        <Link href="/stores" className="s-link">Stores</Link>
      </div>
    </nav>
  );
}
