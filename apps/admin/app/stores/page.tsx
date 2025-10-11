'use client';

import { useState, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  createdAt: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Mock data for now
    setStores([
      { id: '1', name: 'London Central', country: 'UK', region: 'EMEA', createdAt: new Date().toISOString() },
      { id: '2', name: 'New York Times Square', country: 'USA', region: 'AMER', createdAt: new Date().toISOString() },
      { id: '3', name: 'Tokyo Shibuya', country: 'Japan', region: 'APAC', createdAt: new Date().toISOString() },
    ]);
    setLoading(false);
  }, []);

  const handleAddStore = (newStore: Omit<Store, 'id' | 'createdAt'>) => {
    const store: Store = {
      ...newStore,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setStores(prev => [...prev, store]);
    setShowAddDrawer(false);
  };

  const handleEditStore = (updatedStore: Store) => {
    setStores(prev => prev.map(store => 
      store.id === updatedStore.id ? updatedStore : store
    ));
    setEditingStore(null);
  };

  const handleDeleteStore = (storeId: string) => {
    if (confirm('Are you sure you want to delete this store?')) {
      setStores(prev => prev.filter(store => store.id !== storeId));
    }
  };

  // Get unique countries for the filter dropdown
  const uniqueCountries = Array.from(new Set(stores.map(store => store.country).filter(Boolean))).sort();

  // Filter stores based on region, country, and search term
  const filteredStores = stores.filter(store => {
    const matchesRegion = selectedRegion === 'all' || store.region === selectedRegion;
    const matchesCountry = selectedCountry === 'all' || store.country === selectedCountry;
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (store.country && store.country.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRegion && matchesCountry && matchesSearch;
  });

  if (loading) {
    return <div className="s-wrap"><div className="p-6">Loading stores...</div></div>;
  }

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Store Management</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Manage your store locations and regions
            </p>
          </div>
          <button 
            onClick={() => setShowAddDrawer(true)}
            className="menu-add-button-custom"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
            Add New Store
          </button>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="s-select"
          >
            <option value="all">All Regions</option>
            <option value="EMEA">EMEA</option>
            <option value="AMER">AMER</option>
            <option value="APAC">APAC</option>
          </select>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="s-select"
          >
            <option value="all">All Countries</option>
            {uniqueCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="s-input search-input"
            />
          </div>
        </div>

        <section className="s-panel">
          <div className="s-panelCard">
            <p className="s-panelT">Store Locations</p>
            <div className="stores-table">
              <div className="stores-header">
                <div className="stores-cell">Name</div>
                <div className="stores-cell">Country</div>
                <div className="stores-cell">Region</div>
                <div className="stores-cell">Created</div>
                <div className="stores-cell">Actions</div>
              </div>
              <div className="stores-body">
                {filteredStores.map((store) => (
                  <div key={store.id} className="stores-row">
                    <div className="stores-cell">
                      <span className="store-name">{store.name}</span>
                    </div>
                    <div className="stores-cell">
                      <span className="store-country">{store.country ?? '—'}</span>
                    </div>
                    <div className="stores-cell">
                      <span className={`s-badge region-${store.region?.toLowerCase()}`}>
                        {store.region ?? '—'}
                      </span>
                    </div>
                    <div className="stores-cell">
                      <span className="store-date">
                        {new Date(store.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="stores-cell">
                      <div className="stores-actions">
                        <button 
                          onClick={() => setEditingStore(store)}
                          className="stores-action-btn stores-edit"
                          title="Edit store"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteStore(store.id)}
                          className="stores-action-btn stores-delete"
                          title="Delete store"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <AddStoreDrawer 
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          onAdd={handleAddStore}
        />

        <EditStoreDrawer 
          isOpen={!!editingStore}
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onSave={handleEditStore}
        />
      </div>
    </main>
  );
}

interface AddStoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (store: Omit<Store, 'id' | 'createdAt'>) => void;
}

function AddStoreDrawer({ isOpen, onClose, onAdd }: AddStoreDrawerProps) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      country: country.trim() || null,
      region: region || null,
    });

    // Reset form
    setName('');
    setCountry('');
    setRegion('');
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content">
        <div className="drawer-header">
          <h2 className="drawer-title">Add New Store</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="storeName" className="form-label">Store Name</label>
            <input
              id="storeName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="s-input"
              placeholder="e.g., London Central"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="storeCountry" className="form-label">Country</label>
            <input
              id="storeCountry"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="s-input"
              placeholder="e.g., UK"
            />
          </div>

          <div className="form-group">
            <label htmlFor="storeRegion" className="form-label">Region</label>
            <select
              id="storeRegion"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="s-select"
            >
              <option value="">Select region</option>
              <option value="EMEA">EMEA</option>
              <option value="AMER">AMER</option>
              <option value="APAC">APAC</option>
            </select>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="s-btn">
              Add Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditStoreDrawerProps {
  isOpen: boolean;
  store: Store | null;
  onClose: () => void;
  onSave: (store: Store) => void;
}

function EditStoreDrawer({ isOpen, store, onClose, onSave }: EditStoreDrawerProps) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');

  // Update form when store changes
  useEffect(() => {
    if (store) {
      setName(store.name);
      setCountry(store.country || '');
      setRegion(store.region || '');
    }
  }, [store]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !name.trim()) return;

    onSave({
      ...store,
      name: name.trim(),
      country: country.trim() || null,
      region: region || null,
    });
  };

  if (!isOpen || !store) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content">
        <div className="drawer-header">
          <h2 className="drawer-title">Edit Store</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="editStoreName" className="form-label">Store Name</label>
            <input
              id="editStoreName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="s-input"
              placeholder="e.g., London Central"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="editStoreCountry" className="form-label">Country</label>
            <input
              id="editStoreCountry"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="s-input"
              placeholder="e.g., UK"
            />
          </div>

          <div className="form-group">
            <label htmlFor="editStoreRegion" className="form-label">Region</label>
            <select
              id="editStoreRegion"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="s-select"
            >
              <option value="">Select region</option>
              <option value="EMEA">EMEA</option>
              <option value="AMER">AMER</option>
              <option value="APAC">APAC</option>
            </select>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="s-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
