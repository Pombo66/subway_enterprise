'use client';

import TabNavigation, { TabItem } from '../components/TabNavigation';

const menuTabs: TabItem[] = [
  {
    key: 'items',
    label: 'Items',
    href: '/menu/items',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 2h10l3 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2 2V7l3-5Zm0 5h10l-1.5-3h-7L7 7Z"/>
      </svg>
    )
  },
  {
    key: 'categories',
    label: 'Categories',
    href: '/menu/categories',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 7v-7h7v7h-7Z"/>
      </svg>
    )
  },
  {
    key: 'modifiers',
    label: 'Modifiers',
    href: '/menu/modifiers',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
      </svg>
    )
  },
  {
    key: 'pricing',
    label: 'Pricing',
    href: '/menu/pricing',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 10h1a1 1 0 1 1 0 2h-1a7.002 7.002 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-1.07A7.002 7.002 0 0 1 5 12H4a1 1 0 1 1 0-2h1a7.002 7.002 0 0 1 6-6.93V2a1 1 0 0 1 1-1Z"/>
      </svg>
    )
  }
];

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div className="s-wrap">
        <div style={{ marginBottom: '16px' }}>
          <h1 className="s-h1">Menu Management</h1>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Manage your store&apos;s menu items, categories, modifiers, and pricing
          </p>
        </div>
        
        <TabNavigation tabs={menuTabs} />
        
        {children}
      </div>
    </main>
  );
}