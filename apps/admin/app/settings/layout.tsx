'use client';

import TabNavigation, { TabItem } from '../components/TabNavigation';

const settingsTabs: TabItem[] = [
  {
    key: 'users',
    label: 'Users & Roles',
    href: '/settings/users',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5v3h18v-3c0-2.5-4-5-9-5Z"/>
      </svg>
    )
  },
  {
    key: 'audit',
    label: 'Audit Log',
    href: '/settings/audit',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 3h14v18l-7-3-7 3V3Z"/>
      </svg>
    )
  },
  {
    key: 'flags',
    label: 'Feature Flags',
    href: '/settings/flags',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 3h14l-3 4 3 4H5V3Z"/>
      </svg>
    )
  }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div className="s-wrap">
        <div style={{ marginBottom: '16px' }}>
          <h1 className="s-h1">Settings</h1>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            System administration and configuration
          </p>
        </div>
        
        <TabNavigation tabs={settingsTabs} />
        
        {children}
      </div>
    </main>
  );
}