'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/stores', label: 'Stores' },
  { href: '/orders', label: 'Orders' }, // placeholder for future
];

export default function TopNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  return (
    <nav className="flex items-center gap-4 bg-[#1e293b] px-6 py-3 border-b border-white/10">
      {links.map(l => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm px-2 py-1 rounded ${
              active
                ? 'bg-white/20 font-semibold'
                : 'hover:bg-white/10 opacity-80'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm opacity-80">{user.email}</span>
            <button
              onClick={signOut}
              className="text-sm px-2 py-1 rounded hover:bg-white/10 opacity-80"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm px-2 py-1 rounded hover:bg-white/10 opacity-80"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
