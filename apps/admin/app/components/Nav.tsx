'use client';
import { memo } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

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
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: '13px',
    opacity: 0.8
  } as const,
  emailText: {
    color: 'var(--s-muted)',
  } as const,
  signOutButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    opacity: 0.8,
    transition: 'opacity 0.2s, background 0.2s',
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
  const { user, signOut } = useAuth();

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
        
        {user && (
          <div style={navStyles.rightSection}>
            <span style={navStyles.emailText}>{user.email}</span>
            <button 
              onClick={signOut}
              style={navStyles.signOutButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.background = 'none';
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Nav);
