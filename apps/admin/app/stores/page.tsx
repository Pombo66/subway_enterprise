'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { bff } from '../../lib/api';
import CompactFilters from './components/CompactFilters';
import TabNavigation from './components/TabNavigation';
import UploadStoreData from './components/UploadStoreData';
import UploadErrorBoundary from './components/UploadErrorBoundary';
import { useToast } from '../components/ToastProvider';
import { onStoresImported } from '../../lib/events/store-events';

interface Store {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  city?: string | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt?: string;
}

interface FilterState {
  region?: string;
  country?: string;
  city?: string;
  status?: string;
  dataQuality?: 'all' | 'incomplete' | 'complete';
}



// Start with empty stores - will be populated by uploads and API calls

function StoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const filtersRef = useRef<FilterState>({});
  const isLoadingRef = useRef(false);
  const hasInitialLoadRef = useRef(false);


  // Fetch stores from API - simplified to prevent infinite loops
  const fetchStores = useCallback(async (currentFilters: FilterState = {}) => {
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      console.log('🔒 Fetch already in progress, skipping duplicate request');
      return;
    }

    console.log('📡 Fetching stores with filters:', currentFilters);
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (currentFilters.region) {
        params.append('region', currentFilters.region);
      }
      if (currentFilters.country) {
        params.append('country', currentFilters.country);
      }
      if (currentFilters.city) {
        params.append('city', currentFilters.city);
      }
      if (currentFilters.status) {
        params.append('status', currentFilters.status);
      }
      
      // Fetch from API
      const queryString = params.toString();
      const response = await fetch(`/api/stores${queryString ? `?${queryString}` : ''}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stores: ${response.status}`);
      }
      
      const storesData = await response.json();
      
      // Handle different response formats
      let stores: Store[] = [];
      if (Array.isArray(storesData)) {
        stores = storesData;
      } else if (storesData.success && Array.isArray(storesData.data)) {
        stores = storesData.data;
      } else if (storesData.data && Array.isArray(storesData.data)) {
        stores = storesData.data;
      }
      
      setStores(stores);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      // Show error without dependency - use custom event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('show-toast', {
          detail: { type: 'error', message: 'Failed to load stores. Please try again.' }
        });
        window.dispatchEvent(event);
      }
      setStores([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []); // No dependencies - stable callback!

  // Handle filter changes from CascadingFilters component
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    filtersRef.current = newFilters;
    setCurrentPage(1); // Reset pagination when filters change
    fetchStores(newFilters);
  }, [fetchStores]);

  // Initial data load - only once
  useEffect(() => {
    if (!hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true;
      const initialFilters = {};
      filtersRef.current = initialFilters;
      fetchStores(initialFilters);
    }
  }, [fetchStores]);

  // Listen for store import events
  useEffect(() => {
    const unsubscribe = onStoresImported((event) => {
      console.log('🔄 Stores imported, refreshing list view:', event.data);
      // Refresh with current filters using ref to avoid dependency issues
      fetchStores(filtersRef.current);
    });

    return () => {
      unsubscribe();
    };
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

  const handleEditStore = async (updatedStore: Store) => {
    try {
      // Save to database via API
      const response = await fetch(`/api/stores/${updatedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedStore.name,
          city: updatedStore.city,
          country: updatedStore.country,
          region: updatedStore.region,
          status: updatedStore.status,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update store');
      }

      // Update local state
      setStores(prev => prev.map(store => 
        store.id === updatedStore.id ? updatedStore : store
      ));
      setEditingStore(null);
      showSuccess(`Store "${updatedStore.name}" updated successfully!`);
      
      // Emit event to notify map of the update (single store, not full refetch)
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('store-updated', {
          detail: { store: updatedStore }
        });
        window.dispatchEvent(event);
        
        // Update store in cache
        const { updateStoreInCache } = await import('../../lib/events/cache-events');
        updateStoreInCache(updatedStore.id);
      }
    } catch (error) {
      console.error('Failed to update store:', error);
      showError('Failed to update store. Please try again.');
    }
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

  const handleUploadSuccess = (summary: any) => {
    console.log('📊 Upload success summary:', summary);
    
    // Refresh the stores data after successful upload
    fetchStores(filters);
    
    // Create detailed success message
    const parts = [];
    if (summary.inserted > 0) parts.push(`${summary.inserted} new`);
    if (summary.updated > 0) parts.push(`${summary.updated} updated`);
    if (summary.pendingGeocode > 0) parts.push(`${summary.pendingGeocode} pending geocode`);
    
    const message = parts.length > 0 
      ? `Import completed! ${parts.join(', ')} stores.`
      : 'Import completed successfully!';
    
    showSuccess(message);
    
    // Show warning if there were failures (but only if nothing succeeded)
    if (summary.failed > 0) {
      const totalSuccess = (summary.inserted || 0) + (summary.updated || 0);
      
      if (totalSuccess > 0) {
        // Some rows succeeded, show as warning not error
        setTimeout(() => {
          showError(`Note: ${summary.failed} rows were skipped due to validation errors. ${totalSuccess} stores were imported successfully.`);
        }, 1000);
      } else {
        // Nothing succeeded, show as error
        setTimeout(() => {
          showError(`${summary.failed} rows failed to import. Please check the data and try again.`);
        }, 1000);
      }
    }
  };

  const handleRefreshData = () => {
    fetchStores(filters);
  };

  const handleBulkDelete = async () => {
    const count = searchFilteredStores.length;
    const filterDesc = filters.region || filters.country || filters.city || 'all';
    
    if (!confirm(`⚠️ PERMANENT DELETE\n\nThis will permanently delete ${count} store(s) matching filter "${filterDesc}".\n\nThis action CANNOT be undone!\n\nAre you sure?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete all filtered stores one by one
      let successCount = 0;
      let failCount = 0;
      
      for (const store of searchFilteredStores) {
        try {
          await fetch(`/api/stores/${store.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to delete store ${store.id}:`, err);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        showSuccess(`Successfully deleted ${successCount} store(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      }
      
      if (failCount > 0) {
        showError(`Failed to delete ${failCount} store(s)`);
      }
      
      fetchStores(filters);
    } catch (error) {
      console.error('Bulk delete error:', error);
      showError('Failed to delete stores. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  // Calculate stores with incomplete data
  const storesWithMissingCoords = stores.filter(store => 
    !store.latitude || !store.longitude || 
    isNaN(store.latitude) || isNaN(store.longitude)
  );

  // Filter stores based on search term and data quality
  const searchFilteredStores = stores.filter(store => {
    // Data quality filter
    if (filters.dataQuality === 'incomplete') {
      const hasIncompleteData = !store.latitude || !store.longitude || 
        isNaN(store.latitude) || isNaN(store.longitude);
      if (!hasIncompleteData) return false;
    } else if (filters.dataQuality === 'complete') {
      const hasIncompleteData = !store.latitude || !store.longitude || 
        isNaN(store.latitude) || isNaN(store.longitude);
      if (hasIncompleteData) return false;
    }
    
    // Search term filter
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
            {searchFilteredStores.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="s-btn s-btn--danger"
                style={{ 
                  background: 'var(--s-error, #dc3545)', 
                  color: 'white',
                  border: 'none'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete All ({searchFilteredStores.length})
              </button>
            )}
            <UploadErrorBoundary>
              <UploadStoreData 
                onUploadSuccess={handleUploadSuccess}
                onRefreshData={handleRefreshData}
              />
            </UploadErrorBoundary>
            <button 
              onClick={() => setShowAddDrawer(true)}
              className="s-btn s-btn--primary"
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

        {/* Data Quality Warning */}
        {storesWithMissingCoords.length > 0 && (
          <button
            onClick={() => setFilters({ ...filters, dataQuality: 'incomplete' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '16px 0',
              fontSize: '14px',
              color: 'white',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <span>
              {storesWithMissingCoords.length} store{storesWithMissingCoords.length !== 1 ? 's' : ''} missing coordinates (add location to display on map)
            </span>
          </button>
        )}

        {/* Filters Section */}
        <div className="filters-section">
          <Suspense fallback={<div>Loading filters...</div>}>
            <CompactFilters 
              onFiltersChange={handleFiltersChange}
              incompleteCount={storesWithMissingCoords.length}
            />
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
            
            <div className="stores-table" style={{ 
              display: 'grid',
              gridTemplateColumns: '2.5fr 0.7fr 0.8fr 0.8fr 0.7fr 1.8fr',
              gap: '0',
              rowGap: '8px'
            }}>
              <div className="stores-header" style={{ 
                display: 'contents'
              }}>
                <div className="stores-cell">Name</div>
                <div className="stores-cell">Status</div>
                <div className="stores-cell">City</div>
                <div className="stores-cell">Country</div>
                <div className="stores-cell">Region</div>
                <div className="stores-cell">Actions</div>
              </div>
              <div className="stores-body" style={{ display: 'contents' }}>
                {paginatedStores.length === 0 ? (
                  <div className="stores-row" style={{ display: 'contents' }}>
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
                    <div key={store.id} className="stores-row" style={{ display: 'contents' }}>
                      <div className="stores-cell">
                        <button
                          onClick={() => handleViewStore(store.id)}
                          className="store-name-button"
                          title="View store details"
                        >
                          {store.name}
                        </button>
                      </div>
                      <div className="stores-cell">
                        <span className={`badge status-${store.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {store.status ?? '—'}
                        </span>
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
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  First
                </button>
                
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
                
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Last
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
  const [status, setStatus] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      city: city.trim() || null,
      country: country.trim() || null,
      region: region || null,
      status: status || null,
    });

    // Reset form
    setName('');
    setCity('');
    setCountry('');
    setRegion('');
    setStatus('');
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

          <div className="form-group">
            <label htmlFor="storeStatus" className="form-label">Status</label>
            <select
              id="storeStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="s-select"
            >
              <option value="">Select status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Planned">Planned</option>
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
  const [status, setStatus] = useState('');

  // Update form when store changes
  useEffect(() => {
    if (store) {
      setName(store.name);
      setCity(store.city || '');
      setCountry(store.country || '');
      setRegion(store.region || '');
      setStatus(store.status || '');
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
      status: status || null,
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

          <div className="form-group">
            <label htmlFor="editStoreStatus" className="form-label">Status</label>
            <select
              id="editStoreStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="s-select"
            >
              <option value="">Select status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Planned">Planned</option>
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
