'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { bff } from '../../lib/api';
import CascadingFilters from './components/CascadingFilters';
import TabNavigation from './components/TabNavigation';
import { useToast } from '../components/ToastProvider';

interface Store {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  city?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface FilterState {
  region?: string;
  country?: string;
  city?: string;
}



// Enhanced mock data with more realistic store information
const mockStores: Store[] = [
  { id: '1', name: 'Central Station', country: 'United States', region: 'AMER', city: 'New York', createdAt: new Date().toISOString() },
  { id: '2', name: 'Riverside Mall', country: 'United Kingdom', region: 'EMEA', city: 'London', createdAt: new Date().toISOString() },
  { id: '3', name: 'Downtown Plaza', country: 'Canada', region: 'AMER', city: 'Toronto', createdAt: new Date().toISOString() },
  { id: '4', name: 'Tokyo Central', country: 'Japan', region: 'APAC', city: 'Tokyo', createdAt: new Date().toISOString() },
  { id: '5', name: 'Paris Nord', country: 'France', region: 'EMEA', city: 'Paris', createdAt: new Date().toISOString() },
  { id: '6', name: 'Berlin Hauptbahnhof', country: 'Germany', region: 'EMEA', city: 'Berlin', createdAt: new Date().toISOString() },
  { id: '7', name: 'Sydney Harbour', country: 'Australia', region: 'APAC', city: 'Sydney', createdAt: new Date().toISOString() },
  { id: '8', name: 'Los Angeles Downtown', country: 'United States', region: 'AMER', city: 'Los Angeles', createdAt: new Date().toISOString() },
  { id: '9', name: 'Madrid Centro', country: 'Spain', region: 'EMEA', city: 'Madrid', createdAt: new Date().toISOString() },
  { id: '10', name: 'Singapore Marina', country: 'Singapore', region: 'APAC', city: 'Singapore', createdAt: new Date().toISOString() },
];

function StoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const [stores, setStores] = useState<Store[]>(mockStores);
  const [loading, setLoading] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);


  // Fetch stores from API
  const fetchStores = useCallback(async (currentFilters: FilterState = {}) => {
    try {
      setLoading(true);
      
      // Use enhanced mock data with better filtering
      let filteredStores = [...mockStores];
      
      // Apply region filter (exact match)
      if (currentFilters.region) {
        filteredStores = filteredStores.filter(store => 
          store.region === currentFilters.region
        );
      }
      
      // Apply country filter (exact match)
      if (currentFilters.country) {
        filteredStores = filteredStores.filter(store => 
          store.country === currentFilters.country
        );
      }
      
      // Apply city filter (exact match, case-insensitive)
      if (currentFilters.city) {
        filteredStores = filteredStores.filter(store => 
          store.city?.toLowerCase() === currentFilters.city?.toLowerCase()
        );
      }
      
      setStores(filteredStores);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      showError('Failed to load stores. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Handle filter changes from CascadingFilters component
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset pagination when filters change
    fetchStores(newFilters);
  }, [fetchStores]);



  // Handle redirect from ?view=map parameter
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'map') {
      router.replace('/stores/map');
    }
  }, [router, searchParams]);

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddDrawer) {
          setShowAddDrawer(false);
        }
        if (editingStore) {
          setEditingStore(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showAddDrawer, editingStore]);

  const handleAddStore = (newStore: Omit<Store, 'id' | 'createdAt'>) => {
    const store: Store = {
      ...newStore,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setStores(prev => [...prev, store]);
    setShowAddDrawer(false);
    showSuccess(`Store "${store.name}" created successfully!`);
  };

  const handleEditStore = (updatedStore: Store) => {
    setStores(prev => prev.map(store => 
      store.id === updatedStore.id ? updatedStore : store
    ));
    setEditingStore(null);
    showSuccess(`Store "${updatedStore.name}" updated successfully!`);
  };

  const handleDeleteStore = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store && confirm(`Are you sure you want to delete "${store.name}"?`)) {
      setStores(prev => prev.filter(store => store.id !== storeId));
      showSuccess(`Store "${store.name}" deleted successfully!`);
    }
  };

  const handleViewStore = (storeId: string) => {
    router.push(`/stores/${storeId}`);
  };

  const handleMapView = () => {
    router.push('/stores/map');
  };



  // Filter stores based on search term (region/country filtering is handled by filters)
  const searchFilteredStores = stores.filter(store => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      store.name.toLowerCase().includes(searchLower) ||
      (store.country && store.country.toLowerCase().includes(searchLower)) ||
      (store.city && store.city.toLowerCase().includes(searchLower)) ||
      (store.region && store.region.toLowerCase().includes(searchLower))
    );
  });

  // Pagination
  const totalPages = Math.ceil(searchFilteredStores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStores = searchFilteredStores.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={() => setShowAddDrawer(true)}
              className="s-btn menu-add-button-custom"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Add New Store
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab="list" />

        {/* Filters Section */}
        <div className="filters-section">
          <Suspense fallback={<div>Loading filters...</div>}>
            <CascadingFilters onFiltersChange={handleFiltersChange} />
          </Suspense>
          
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
            <div className="s-panelHeader">
              <p className="s-panelT">Store Locations ({searchFilteredStores.length})</p>
              {totalPages > 1 && (
                <div className="pagination-info">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
            
            <div className="stores-table">
              <div className="stores-header">
                <div className="stores-cell">Name</div>
                <div className="stores-cell">City</div>
                <div className="stores-cell">Country</div>
                <div className="stores-cell">Region</div>
                <div className="stores-cell">Actions</div>
              </div>
              <div className="stores-body">
                {paginatedStores.length === 0 ? (
                  <div className="stores-row">
                    <div className="stores-cell" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px' }}>
                      <div style={{ color: 'var(--s-muted)' }}>
                        {searchTerm || filters.region || filters.country || filters.city 
                          ? 'No stores found matching your criteria' 
                          : 'No stores available'
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  paginatedStores.map((store) => (
                    <div key={store.id} className="stores-row">
                      <div className="stores-cell">
                        <button
                          onClick={() => handleViewStore(store.id)}
                          className="store-name-link"
                          title="View store details"
                        >
                          {store.name}
                        </button>
                      </div>
                      <div className="stores-cell">
                        <span className="store-city">{store.city ?? '—'}</span>
                      </div>
                      <div className="stores-cell">
                        <span className="store-country">{store.country ?? '—'}</span>
                      </div>
                      <div className="stores-cell">
                        <span className={`badge region-${store.region?.toLowerCase()}`}>
                          {store.region ?? '—'}
                        </span>
                      </div>
                      <div className="stores-cell">
                        <div className="stores-actions">
                          <button 
                            onClick={() => handleViewStore(store.id)}
                            className="stores-action-btn stores-view"
                            title="View store details"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            View
                          </button>
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
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                
                <div className="pagination-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
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
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      city: city.trim() || null,
      country: country.trim() || null,
      region: region || null,
    });

    // Reset form
    setName('');
    setCity('');
    setCountry('');
    setRegion('');
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
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
            <label htmlFor="storeCity" className="form-label">City</label>
            <input
              id="storeCity"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="s-input"
              placeholder="e.g., London"
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
              placeholder="e.g., United Kingdom"
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
            <button type="button" onClick={onClose} className="s-btn btn-secondary">
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
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');

  // Update form when store changes
  useEffect(() => {
    if (store) {
      setName(store.name);
      setCity(store.city || '');
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
      city: city.trim() || null,
      country: country.trim() || null,
      region: region || null,
    });
  };

  if (!isOpen || !store) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
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
            <label htmlFor="editStoreCity" className="form-label">City</label>
            <input
              id="editStoreCity"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="s-input"
              placeholder="e.g., London"
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
              placeholder="e.g., United Kingdom"
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
            <button type="button" onClick={onClose} className="s-btn btn-secondary">
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

export default function StoresPage() {
  return (
    <Suspense fallback={<div className="s-wrap"><div className="p-6">Loading stores...</div></div>}>
      <StoresPageContent />
    </Suspense>
  );
}
