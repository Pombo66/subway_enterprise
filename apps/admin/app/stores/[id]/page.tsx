'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';
import TabNavigation from '../../components/TabNavigation';

interface Store {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  city?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface PriceOverride {
  id: string;
  menuItemId: string;
  menuItemName: string;
  basePrice: number;
  overridePrice: number;
  effectiveFrom: string;
  effectiveTo?: string;
  category?: string;
}

// Mock store data
const mockStores: Store[] = [
  { id: '1', name: 'Central Station', country: 'United States', region: 'AMER', city: 'New York', createdAt: new Date().toISOString() },
  { id: '2', name: 'Riverside Mall', country: 'United Kingdom', region: 'EMEA', city: 'London', createdAt: new Date().toISOString() },
  { id: '3', name: 'Downtown Plaza', country: 'Canada', region: 'AMER', city: 'Toronto', createdAt: new Date().toISOString() },
  { id: '4', name: 'Tokyo Central', country: 'Japan', region: 'APAC', city: 'Tokyo', createdAt: new Date().toISOString() },
  { id: '5', name: 'Paris Nord', country: 'France', region: 'EMEA', city: 'Paris', createdAt: new Date().toISOString() },
];

// Mock price overrides data
const mockPriceOverrides: PriceOverride[] = [
  {
    id: '1',
    menuItemId: 'item1',
    menuItemName: 'Italian BMT',
    basePrice: 8.99,
    overridePrice: 9.49,
    effectiveFrom: new Date().toISOString(),
    category: 'Meat'
  },
  {
    id: '2',
    menuItemId: 'item2',
    menuItemName: 'Turkey Breast',
    basePrice: 7.99,
    overridePrice: 8.29,
    effectiveFrom: new Date().toISOString(),
    category: 'Meat'
  },
  {
    id: '3',
    menuItemId: 'item3',
    menuItemName: 'Veggie Delite',
    basePrice: 6.99,
    overridePrice: 6.49,
    effectiveFrom: new Date().toISOString(),
    category: 'Vegetarian'
  },
];

export default function StoreDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<Store | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Handle tab switching from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'pricing') {
      setActiveTab('pricing');
    } else {
      setActiveTab('details');
    }
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Fetch store data
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        
        // Find store in mock data
        const foundStore = mockStores.find(s => s.id === storeId);
        if (!foundStore) {
          showError('Store not found');
          router.push('/stores');
          return;
        }
        
        setStore(foundStore);
        setPriceOverrides(mockPriceOverrides);
      } catch (error) {
        console.error('Failed to fetch store data:', error);
        showError('Failed to load store data');
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchStoreData();
    }
  }, [storeId, router, showError]);

  const handleBackToStores = () => {
    router.push('/stores');
  };

  const handleEditPriceOverride = (overrideId: string, newPrice: number) => {
    setPriceOverrides(prev => prev.map(override => 
      override.id === overrideId 
        ? { ...override, overridePrice: newPrice }
        : override
    ));
    showSuccess('Price override updated successfully!');
  };

  const handleClearPriceOverride = (overrideId: string) => {
    const override = priceOverrides.find(o => o.id === overrideId);
    if (override && confirm(`Clear price override for "${override.menuItemName}"? This will restore the base price of £${override.basePrice.toFixed(2)}.`)) {
      setPriceOverrides(prev => prev.filter(o => o.id !== overrideId));
      showSuccess('Price override cleared successfully!');
    }
  };

  const handleClearAllOverrides = () => {
    if (priceOverrides.length === 0) return;
    
    if (confirm(`Clear all ${priceOverrides.length} price overrides? This will restore all items to their base prices.`)) {
      setPriceOverrides([]);
      showSuccess('All price overrides cleared successfully!');
    }
  };

  // Filter price overrides based on search and category
  const filteredOverrides = priceOverrides.filter(override => {
    const matchesSearch = !searchTerm || 
      override.menuItemName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || override.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(priceOverrides.map(o => o.category).filter(Boolean)));

  const tabs = [
    {
      key: 'details',
      label: 'Store Details',
      href: `/stores/${storeId}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    },
    {
      key: 'pricing',
      label: 'Pricing Overrides',
      href: `/stores/${storeId}?tab=pricing`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 10h1a1 1 0 1 1 0 2h-1a7.002 7.002 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-1.07A7.002 7.002 0 0 1 5 12H4a1 1 0 1 1 0-2h1a7.002 7.002 0 0 1 6-6.93V2a1 1 0 0 1 1-1Z"/>
        </svg>
      )
    }
  ];

  if (loading) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-white">Loading store details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <p className="text-white">Store not found</p>
            <button onClick={handleBackToStores} className="s-btn mt-4">
              Back to Stores
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main>
      <div className="s-wrap">
        {/* Header */}
        <div className="menu-header-section">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button 
                onClick={handleBackToStores}
                className="back-button"
                title="Back to stores"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <h1 className="s-h1" style={{ margin: 0 }}>{store.name}</h1>
            </div>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px' }}>
              {store.city && `${store.city}, `}{store.country} • {store.region}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation 
          tabs={tabs}
          activeTab={activeTab}
        />

        {/* Store Details Tab */}
        {activeTab === 'details' && (
          <section className="s-panel">
            <div className="s-panelCard">
              <p className="s-panelT">Store Information</p>
              
              <div className="store-details-grid">
                <div className="store-detail-item">
                  <label className="store-detail-label">Store Name</label>
                  <div className="store-detail-value">{store.name}</div>
                </div>
                
                <div className="store-detail-item">
                  <label className="store-detail-label">City</label>
                  <div className="store-detail-value">{store.city || '—'}</div>
                </div>
                
                <div className="store-detail-item">
                  <label className="store-detail-label">Country</label>
                  <div className="store-detail-value">{store.country || '—'}</div>
                </div>
                
                <div className="store-detail-item">
                  <label className="store-detail-label">Region</label>
                  <div className="store-detail-value">
                    <span className={`badge region-${store.region?.toLowerCase()}`}>
                      {store.region || '—'}
                    </span>
                  </div>
                </div>
                
                <div className="store-detail-item">
                  <label className="store-detail-label">Created</label>
                  <div className="store-detail-value">
                    {new Date(store.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
                <div className="store-detail-item">
                  <label className="store-detail-label">Store ID</label>
                  <div className="store-detail-value store-id">{store.id}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Pricing Overrides Tab */}
        {activeTab === 'pricing' && (
          <>
            {/* Header with Add Override Button */}
            <div className="menu-header-section">
              <div>
                <h2 style={{ color: 'var(--s-head)', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                  Pricing Overrides
                </h2>
                <p style={{ color: 'var(--s-muted)', fontSize: '14px' }}>
                  Manage store-specific pricing that overrides base menu prices
                </p>
              </div>
              <button 
                className="s-btn menu-add-button-custom"
                onClick={() => {/* TODO: Add override functionality */}}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                </svg>
                Add Price Override
              </button>
            </div>

            {/* Filters and Actions */}
            <div className="filters-section">
              <div className="cascading-filters">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="s-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                
                {priceOverrides.length > 0 && (
                  <button 
                    onClick={handleClearAllOverrides}
                    className="clear-all-btn"
                  >
                    Clear All Overrides ({priceOverrides.length})
                  </button>
                )}
              </div>
              
              <div className="search-container">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="s-input search-input"
                />
              </div>
            </div>

            {/* Price Override Summary */}
            {priceOverrides.length > 0 && (
              <section className="s-panel">
                <div className="s-panelCard">
                  <p className="s-panelT">Override Summary</p>
                  <div className="override-summary">
                    <div className="summary-item">
                      <div className="summary-label">Total Overrides</div>
                      <div className="summary-value">{priceOverrides.length}</div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-label">Price Increases</div>
                      <div className="summary-value positive">
                        {priceOverrides.filter(o => o.overridePrice > o.basePrice).length}
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-label">Price Decreases</div>
                      <div className="summary-value negative">
                        {priceOverrides.filter(o => o.overridePrice < o.basePrice).length}
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-label">Avg. Difference</div>
                      <div className="summary-value">
                        {(() => {
                          const avgDiff = priceOverrides.reduce((sum, o) => sum + (o.overridePrice - o.basePrice), 0) / priceOverrides.length;
                          return `${avgDiff >= 0 ? '+' : ''}£${Math.abs(avgDiff).toFixed(2)}`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="s-panel">
              <div className="s-panelCard">
                <p className="s-panelT">
                  Price Overrides ({filteredOverrides.length})
                  {priceOverrides.length > filteredOverrides.length && (
                    <span style={{ color: 'var(--s-muted)', fontWeight: 'normal', marginLeft: '8px' }}>
                      • {priceOverrides.length} total
                    </span>
                  )}
                </p>
                
                {filteredOverrides.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--s-muted)' }}>
                      {priceOverrides.length === 0 ? (
                        <>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                            <path d="M12 1a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 10h1a1 1 0 1 1 0 2h-1a7.002 7.002 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-1.07A7.002 7.002 0 0 1 5 12H4a1 1 0 1 1 0-2h1a7.002 7.002 0 0 1 6-6.93V2a1 1 0 0 1 1-1Z"/>
                          </svg>
                          <h3 style={{ color: 'var(--s-text)', marginBottom: '8px' }}>No Price Overrides</h3>
                          <p>This store is using base prices for all menu items.</p>
                        </>
                      ) : (
                        <>
                          <h3 style={{ color: 'var(--s-text)', marginBottom: '8px' }}>No Results Found</h3>
                          <p>No price overrides match your search criteria.</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <PriceOverridesTable 
                    overrides={filteredOverrides}
                    onEditOverride={handleEditPriceOverride}
                    onClearOverride={handleClearPriceOverride}
                  />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

interface PriceOverridesTableProps {
  overrides: PriceOverride[];
  onEditOverride: (overrideId: string, newPrice: number) => void;
  onClearOverride: (overrideId: string) => void;
}

function PriceOverridesTable({ overrides, onEditOverride, onClearOverride }: PriceOverridesTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const handleStartEdit = (override: PriceOverride) => {
    setEditingId(override.id);
    setEditPrice(override.overridePrice.toString());
  };

  const handleSaveEdit = (overrideId: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      return;
    }
    
    onEditOverride(overrideId, price);
    setEditingId(null);
    setEditPrice('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice('');
  };

  const calculateDifference = (basePrice: number, overridePrice: number) => {
    const diff = overridePrice - basePrice;
    const percentage = ((diff / basePrice) * 100);
    return { amount: diff, percentage };
  };

  return (
    <div className="price-overrides-table">
      <div className="price-overrides-header">
        <div className="price-cell">Item</div>
        <div className="price-cell">Category</div>
        <div className="price-cell">Base Price</div>
        <div className="price-cell">Override Price</div>
        <div className="price-cell">Difference</div>
        <div className="price-cell">Actions</div>
      </div>
      <div className="price-overrides-body">
        {overrides.map((override) => {
          const diff = calculateDifference(override.basePrice, override.overridePrice);
          const isEditing = editingId === override.id;
          
          return (
            <div key={override.id} className="price-overrides-row">
              <div className="price-cell">
                <span className="item-name">{override.menuItemName}</span>
              </div>
              <div className="price-cell">
                <span className="item-category">{override.category || '—'}</span>
              </div>
              <div className="price-cell">
                <span className="base-price">£{override.basePrice.toFixed(2)}</span>
              </div>
              <div className="price-cell">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="price-edit-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(override.id);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                ) : (
                  <span className="override-price">£{override.overridePrice.toFixed(2)}</span>
                )}
              </div>
              <div className="price-cell">
                <div className="price-difference">
                  <span className={`diff-amount ${diff.amount >= 0 ? 'positive' : 'negative'}`}>
                    {diff.amount >= 0 ? '+' : ''}£{Math.abs(diff.amount).toFixed(2)}
                  </span>
                  <span className={`diff-percentage ${diff.amount >= 0 ? 'positive' : 'negative'}`}>
                    ({diff.amount >= 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="price-cell">
                <div className="price-actions">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={() => handleSaveEdit(override.id)}
                        className="price-action-btn save"
                        title="Save changes"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="price-action-btn cancel"
                        title="Cancel editing"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleStartEdit(override)}
                        className="price-action-btn edit"
                        title="Edit price"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                      <button 
                        onClick={() => onClearOverride(override.id)}
                        className="price-action-btn clear"
                        title={`Restore to base price (£${override.basePrice.toFixed(2)})`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}