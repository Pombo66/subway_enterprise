'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { OverviewTab } from './tabs/OverviewTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { OrdersTab } from './tabs/OrdersTab';
import { StaffTab } from './tabs/StaffTab';
import { PhotosTab } from './tabs/PhotosTab';
import { HoursTab } from './tabs/HoursTab';

interface Store {
  id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  operatingHours: string | null;
  phoneNumber: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'overview' | 'performance' | 'orders' | 'staff' | 'photos' | 'hours';

export default function StoreDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const fetchStore = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`);
      
      if (!response.ok) {
        throw new Error('Store not found');
      }
      
      const data = await response.json();
      setStore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchStore();
    }
  }, [storeId]);

  const handleBack = () => {
    router.push('/stores');
  };

  if (loading) {
    return (
      <main>
        <div className="s-wrap">
          <div className="p-6">Loading store details...</div>
        </div>
      </main>
    );
  }

  if (error || !store) {
    return (
      <main>
        <div className="s-wrap">
          <div className="menu-header-section">
            <div>
              <h1 className="s-h1">Store Not Found</h1>
            </div>
            <button onClick={handleBack} className="s-btn s-btn--secondary">
              ← Back to Stores
            </button>
          </div>
        </div>
      </main>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'orders', label: 'Orders' },
    { id: 'staff', label: 'Staff' },
    { id: 'photos', label: 'Photos' },
    { id: 'hours', label: 'Hours' }
  ];

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">{store.name}</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              {store.city}, {store.country}
            </p>
          </div>
          <button onClick={handleBack} className="s-btn s-btn--secondary">
            ← Back to Stores
          </button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--s-border)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--s-primary)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--s-primary)' : 'var(--s-muted)',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab store={store} onUpdate={fetchStore} />}
        {activeTab === 'performance' && <PerformanceTab storeId={storeId} />}
        {activeTab === 'orders' && <OrdersTab storeId={storeId} />}
        {activeTab === 'staff' && <StaffTab storeId={storeId} />}
        {activeTab === 'photos' && <PhotosTab storeId={storeId} />}
        {activeTab === 'hours' && <HoursTab storeId={storeId} store={store} onUpdate={fetchStore} />}
      </div>
    </main>
  );
}
