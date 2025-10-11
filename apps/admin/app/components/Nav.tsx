import { memo } from 'react';
import Link from 'next/link';
import CommitBadge from './CommitBadge';

// Extract styles to prevent recreation on each render
const navStyles = {
  accent: { height: 2, background: 'var(--s-accent-2)' } as const,
  wrapper: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  } as const,
  leftSection: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10 
  } as const,
  brandContainer: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10 
  } as const,
  textStyle: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
  } as const,
};

// Navigation links configuration
const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/orders', label: 'Orders' },
  { href: '/stores', label: 'Stores' },
] as const;

function Nav() {
  return (
    <nav className="s-nav">
      {/* Yellow accent bar */}
      <div style={navStyles.accent} />
      <div className="s-navwrap" style={navStyles.wrapper}>
        <div style={navStyles.leftSection}>
          {/* Brand wordmark (brand-aligned, not official trademark logo) */}
          <div style={navStyles.brandContainer}>
            <svg width="110" height="24" viewBox="0 0 110 24" aria-label="Subway Admin" role="img">
              <rect x="0" y="8" width="18" height="8" rx="2" fill="var(--s-accent)" />
              <rect x="20" y="8" width="18" height="8" rx="2" fill="var(--s-accent-2)" />
              <text 
                x="44" 
                y="17" 
                fontSize="12" 
                fontWeight="800" 
                fill="#ffffff" 
                style={navStyles.textStyle}
              >
                Subway Admin
              </text>
            </svg>
          </div>

          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="s-link">
              {label}
            </Link>
          ))}
        </div>
        
        <CommitBadge />
      </div>
    </nav>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Nav);
