'use client';

import { useState } from 'react';

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
  phoneNumber: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OverviewTabProps {
  store: Store;
  onUpdate: () => void;
}

export function OverviewTab({ store, onUpdate }: OverviewTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Store>>(store);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update store');
      }

      setIsEditing(false);
      onUpdate();
    } catch (err) {
      alert('Failed to save changes');
    }
  };

  const handleCancel = () => {
    setEditForm(store);
    setIsEditing(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        {isEditing ? (
          <>
            <button onClick={handleCancel} className="s-btn s-btn--secondary" style={{ marginRight: '8px' }}>
              Cancel
            </button>
            <button onClick={handleSave} className="s-btn s-btn--primary">
              Save Changes
            </button>
          </>
        ) : (
          <button onClick={() => setIsEditing(true)} className="s-btn s-btn--primary">
            Edit Store
          </button>
        )}
      </div>

      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader" style={{ marginBottom: '0' }}>
            <p className="s-panelT">Store Information</p>
          </div>
          
          <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', rowGap: '28px' }}>
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
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phoneNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="s-input"
                  style={{ marginTop: '4px' }}
                  placeholder="Enter phone number"
                />
              ) : (
                <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)' }}>
                  {store.phoneNumber || '—'}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="s-input"
                  style={{ marginTop: '4px' }}
                  placeholder="Enter email"
                />
              ) : (
                <p style={{ fontSize: '16px', marginTop: '4px', color: 'var(--s-text)' }}>
                  {store.email || '—'}
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

      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader" style={{ marginBottom: '0' }}>
            <p className="s-panelT">Location</p>
          </div>
          
          <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', rowGap: '28px' }}>
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

            {(store.latitude != null && store.longitude != null) && (
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
            )}
          </div>
        </div>
      </div>

      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader" style={{ marginBottom: '0' }}>
            <p className="s-panelT">Metadata</p>
          </div>
          
          <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', rowGap: '28px' }}>
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
    </>
  );
}
