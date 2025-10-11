'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the first tab (Users & Roles) when accessing the main settings page
    router.replace('/settings/users');
  }, [router]);

  return (
    <section className="s-panel">
      <div className="s-panelCard">
        <p className="s-panelT">Settings Overview</p>
        <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
          Redirecting to user management...
        </p>
      </div>
    </section>
  );
}