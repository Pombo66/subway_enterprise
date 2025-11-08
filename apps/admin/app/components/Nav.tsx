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
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="s-link">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Nav);
