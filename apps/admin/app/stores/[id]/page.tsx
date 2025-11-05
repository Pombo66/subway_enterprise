'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
  createdAt: string;
  updatedAt: string;
}

export default function StoreDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Store>>({});

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await fetch(`/api/stores/${storeId}`);
        
        if (!response.ok) {
          throw new Error('Store not found');
        }
        
        const data = await response.json();
        setStore(data);
        setEditForm(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load store');
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchStore();
    }
  }, [storeId]);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update store');
      }

      const updatedStore = await response.json();
      setStore(updatedStore.store || updatedStore);
      setIsEditing(false);
    } catch (err) {
      alert('Failed to save changes');
    }
  };

  const handleCancel = () => {
    setEditForm(store || {});
    setIsEditing(false);
  };

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
          <div className="s-panel">
            <div className="s-panelCard">
              <p style={{ color: 'var(--s-muted)', padding: '32px', textAlign: 'center' }}>
                {error || 'The store you are looking for could not be found.'}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">{store.name}</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Store Details
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {isEditing ? (
              <>
                <button onClick={handleCancel} className="s-btn s-btn--secondary">
                  Cancel
                </button>
                <button onClick={handleSave} className="s-btn s-btn--primary">
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="s-btn s-btn--primary">
                  Edit Store
                </button>
                <button onClick={handleBack} className="s-btn s-btn--secondary">
                  ← Back to Stores
                </button>
              </>
            )}
          </div>
        </div>

        {/* Store Information */}
        <div className="s-panel">
          <div className="s-panelCard">
            <div className="s-panelHeader">
              <p className="s-panelT">Store Information</p>
            </div>
            
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Store Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="s-input"
                    style={{ marginTop: '4px' }}
                  />
                ) : (
                  <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)' }}>
                    {store.name}
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Status
                </label>
                {isEditing ? (
                  <select
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="s-select"
                    style={{ marginTop: '4px' }}
                  >
                    <option value="">Select status</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Planned">Planned</option>
                  </select>
                ) : (
                  <p style={{ fontSize: '16px', marginTop: '4px' }}>
                    <span className={`badge status-${store.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {store.status || '—'}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  City
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="s-input"
                    style={{ marginTop: '4px' }}
                  />
                ) : (
                  <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)' }}>
                    {store.city || '—'}
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Country
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.country || ''}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="s-input"
                    style={{ marginTop: '4px' }}
                  />
                ) : (
                  <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)' }}>
                    {store.country || '—'}
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Region
                </label>
                {isEditing ? (
                  <select
                    value={editForm.region || ''}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    className="s-select"
                    style={{ marginTop: '4px' }}
                  >
                    <option value="">Select region</option>
                    <option value="EMEA">EMEA</option>
                    <option value="AMER">AMER</option>
                    <option value="APAC">APAC</option>
                  </select>
                ) : (
                  <p style={{ fontSize: '16px', marginTop: '4px' }}>
                    <span className={`badge region-${store.region?.toLowerCase()}`}>
                      {store.region || '—'}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Store ID
                </label>
                <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--s-muted)', fontFamily: 'monospace' }}>
                  {store.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="s-panel">
          <div className="s-panelCard">
            <div className="s-panelHeader">
              <p className="s-panelT">Location</p>
            </div>
            
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Street Address
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="s-input"
                    style={{ marginTop: '4px' }}
                    placeholder="Enter street address"
                  />
                ) : (
                  <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)' }}>
                    {store.address || store.name || '—'}
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Postcode / ZIP
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.postcode || ''}
                    onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                    className="s-input"
                    style={{ marginTop: '4px' }}
                    placeholder="Enter postcode"
                  />
                ) : (
                  <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)' }}>
                    {store.postcode || '—'}
                  </p>
                )}
              </div>

              {(store.latitude != null && store.longitude != null && typeof store.latitude === 'number' && typeof store.longitude === 'number') ? (
                <>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                      Latitude
                    </label>
                    <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)', fontFamily: 'monospace' }}>
                      {store.latitude.toFixed(6)}
                    </p>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                      Longitude
                    </label>
                    <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)', fontFamily: 'monospace' }}>
                      {store.longitude.toFixed(6)}
                    </p>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                      Map Link
                    </label>
                    <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--s-text)' }}>
                      <a 
                        href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--s-primary)', textDecoration: 'none' }}
                      >
                        View on Google Maps →
                      </a>
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '14px', color: 'var(--s-muted)', fontStyle: 'italic' }}>
                    ⚠️ Coordinates missing - This store will not appear on the map until geocoded
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="s-panel">
          <div className="s-panelCard">
            <div className="s-panelHeader">
              <p className="s-panelT">Metadata</p>
            </div>
            
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Created
                </label>
                <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--s-text)' }}>
                  {new Date(store.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                  Last Updated
                </label>
                <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--s-text)' }}>
                  {new Date(store.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
