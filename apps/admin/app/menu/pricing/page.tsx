'use client';

import { useState, useEffect, useRef } from 'react';
import { MenuItem } from '../../../lib/types';
import { useToast } from '../../components/ToastProvider';

// Extended interface for pricing management
interface PricingItem extends MenuItem {
  basePrice: number;
  overrideCount?: number;
  lastPriceUpdate?: Date;
  hasOverrides?: boolean;
}

interface PriceOverride {
  id: string;
  storeId: string;
  storeName: string;
  region: string;
  menuItemId: string;
  price: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AuditEntry {
  id: string;
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  diff?: string;
  timestamp: Date;
}

// Mock data for pricing items
const mockPricingItems: PricingItem[] = [
  {
    id: '1',
    name: 'Italian BMT',
    price: 8.99,
    basePrice: 8.99,
    active: true,
    description: 'Pepperoni, salami, and ham',
    category: 'Meat',
    overrideCount: 3,
    hasOverrides: true,
    lastPriceUpdate: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Turkey Breast',
    price: 7.99,
    basePrice: 7.99,
    active: true,
    description: 'Oven roasted turkey breast',
    category: 'Meat',
    overrideCount: 1,
    hasOverrides: true,
    lastPriceUpdate: new Date('2024-01-10')
  },
  {
    id: '3',
    name: 'Veggie Delite',
    price: 6.99,
    basePrice: 6.99,
    active: true,
    description: 'Fresh vegetables and cheese',
    category: 'Vegetarian',
    overrideCount: 0,
    hasOverrides: false,
    lastPriceUpdate: new Date('2024-01-05')
  },
  {
    id: '4',
    name: 'Chicken Teriyaki',
    price: 9.49,
    basePrice: 9.49,
    active: true,
    description: 'Grilled chicken with teriyaki sauce',
    category: 'Meat',
    overrideCount: 2,
    hasOverrides: true,
    lastPriceUpdate: new Date('2024-01-20')
  },
  {
    id: '5',
    name: 'Tuna',
    price: 7.49,
    basePrice: 7.49,
    active: false,
    description: 'Tuna with mayo',
    category: 'Seafood',
    overrideCount: 0,
    hasOverrides: false,
    lastPriceUpdate: new Date('2024-01-01')
  }
];

// Mock price overrides data
const mockPriceOverrides: PriceOverride[] = [
  {
    id: '1',
    storeId: 'store1',
    storeName: 'Downtown Store',
    region: 'EMEA',
    menuItemId: '1',
    price: 9.49,
    effectiveFrom: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    storeId: 'store2',
    storeName: 'Mall Store',
    region: 'AMER',
    menuItemId: '1',
    price: 8.49,
    effectiveFrom: new Date('2024-01-16'),
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  }
];

const mockCategories = ['All Categories', 'Meat', 'Vegetarian', 'Vegan', 'Seafood', 'Sides', 'Drinks', 'Desserts'];

export default function MenuPricingPage() {
  const [items, setItems] = useState<PricingItem[]>(mockPricingItems);
  const [loading, setLoading] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState<PricingItem | null>(null);
  const [showOverridesDrawer, setShowOverridesDrawer] = useState<PricingItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedScope, setSelectedScope] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { showSuccess, showError } = useToast();

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showEditDrawer) setShowEditDrawer(null);
        if (showOverridesDrawer) setShowOverridesDrawer(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showEditDrawer, showOverridesDrawer]);

  // Filter items based on search, category, and scope
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;
    const matchesScope = selectedScope === 'all' || 
                        (selectedScope === 'with-overrides' && item.hasOverrides) ||
                        (selectedScope === 'no-overrides' && !item.hasOverrides) ||
                        (selectedScope === 'active' && item.active) ||
                        (selectedScope === 'inactive' && !item.active);
    
    return matchesSearch && matchesCategory && matchesScope;
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedScope]);

  const handleUpdateBasePrice = (itemId: string, newPrice: number) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            basePrice: newPrice, 
            price: newPrice,
            lastPriceUpdate: new Date() 
          } 
        : item
    ));
    
    const item = items.find(i => i.id === itemId);
    if (item) {
      showSuccess(`Base price for "${item.name}" updated to £${newPrice.toFixed(2)}`);
      
      // Emit telemetry event (mock)
      console.log('Telemetry: Base price updated', {
        itemId,
        itemName: item.name,
        oldPrice: item.basePrice,
        newPrice,
        timestamp: new Date().toISOString()
      });
      
      // Create audit entry (mock)
      console.log('Audit: Price change', {
        actor: 'current-user@subway.com',
        entity: 'MenuItem',
        entityId: itemId,
        action: 'UPDATE_BASE_PRICE',
        diff: JSON.stringify({
          basePrice: { from: item.basePrice, to: newPrice }
        }),
        timestamp: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-white">Loading pricing data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="menu-header-section">
        <div>
          <h2 style={{ color: 'var(--s-head)', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Pricing</h2>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Manage base prices and view price override comparisons across stores
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="cascading-filters">
          <select 
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="s-select"
          >
            <option value="all">All Items</option>
            <option value="with-overrides">With Overrides</option>
            <option value="no-overrides">No Overrides</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="s-select"
          >
            {mockCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
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

      <section className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <p className="s-panelT">Menu Pricing ({filteredItems.length})</p>
            {totalPages > 1 && (
              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>
            )}
          </div>
          
          <PricingTable
            items={paginatedItems}
            loading={loading}
            onEditPrice={setShowEditDrawer}
            onViewOverrides={setShowOverridesDrawer}
          />

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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                ))}
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

      <EditBasePriceDrawer 
        isOpen={!!showEditDrawer}
        item={showEditDrawer}
        onClose={() => setShowEditDrawer(null)}
        onSave={handleUpdateBasePrice}
      />

      <ViewOverridesDrawer
        isOpen={!!showOverridesDrawer}
        item={showOverridesDrawer}
        overrides={mockPriceOverrides.filter(o => o.menuItemId === showOverridesDrawer?.id)}
        onClose={() => setShowOverridesDrawer(null)}
      />
    </>
  );
}

interface PricingTableProps {
  items: PricingItem[];
  loading: boolean;
  onEditPrice: (item: PricingItem) => void;
  onViewOverrides: (item: PricingItem) => void;
}

function PricingTable({ items, loading, onEditPrice, onViewOverrides }: PricingTableProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-white">Loading pricing data...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">No pricing data found</h3>
        <p className="text-gray-400">No items match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 font-medium text-gray-300">Item</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Category</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Base Price</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Overrides</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Last Updated</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium text-white">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-400 mt-1">{item.description}</div>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="text-gray-300">{item.category || '-'}</div>
              </td>
              <td className="py-3 px-4">
                <div className="font-semibold text-yellow-400">
                  £{typeof item.basePrice === 'number' ? item.basePrice.toFixed(2) : item.basePrice}
                </div>
              </td>
              <td className="py-3 px-4">
                {item.hasOverrides ? (
                  <button
                    onClick={() => onViewOverrides(item)}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {item.overrideCount} override{item.overrideCount !== 1 ? 's' : ''}
                  </button>
                ) : (
                  <span className="text-gray-500">No overrides</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="text-sm text-gray-400">
                  {item.lastPriceUpdate ? item.lastPriceUpdate.toLocaleDateString() : '-'}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  item.active 
                    ? 'bg-green-900/50 text-green-300 border border-green-700' 
                    : 'bg-red-900/50 text-red-300 border border-red-700'
                }`}>
                  {item.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEditPrice(item)}
                    className="text-blue-400 hover:text-blue-300 p-1"
                    title="Edit base price"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 10h1a1 1 0 1 1 0 2h-1a7.002 7.002 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-1.07A7.002 7.002 0 0 1 5 12H4a1 1 0 1 1 0-2h1a7.002 7.002 0 0 1 6-6.93V2a1 1 0 0 1 1-1Z"/>
                    </svg>
                  </button>
                  {item.hasOverrides && (
                    <button
                      onClick={() => onViewOverrides(item)}
                      className="text-green-400 hover:text-green-300 p-1"
                      title="View price overrides"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface EditBasePriceDrawerProps {
  isOpen: boolean;
  item: PricingItem | null;
  onClose: () => void;
  onSave: (itemId: string, newPrice: number) => void;
}

function EditBasePriceDrawer({ isOpen, item, onClose, onSave }: EditBasePriceDrawerProps) {
  const [newPrice, setNewPrice] = useState('');
  const [priceError, setPriceError] = useState('');
  const priceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item && isOpen) {
      setNewPrice(item.basePrice.toString());
      setPriceError('');
      setTimeout(() => priceInputRef.current?.focus(), 100);
    }
  }, [item, isOpen]);

  const validatePrice = (value: string): string => {
    if (!value.trim()) {
      return 'Price is required';
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    
    if (numValue < 0) {
      return 'Price cannot be negative';
    }
    
    if (numValue > 999.99) {
      return 'Price cannot exceed £999.99';
    }
    
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    if (!decimalRegex.test(value)) {
      return 'Please enter a valid price (e.g., 8.99)';
    }
    
    return '';
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPrice(value);
    
    if (priceError) {
      setPriceError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const priceValidationError = validatePrice(newPrice);
    if (priceValidationError) {
      setPriceError(priceValidationError);
      return;
    }

    const price = parseFloat(newPrice);
    onSave(item.id, price);
    onClose();
  };

  if (!isOpen || !item) return null;

  const priceChange = item ? parseFloat(newPrice) - item.basePrice : 0;
  const hasChange = Math.abs(priceChange) > 0.001;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Edit Base Price</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label className="form-label">Item</label>
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="font-medium text-white">{item.name}</div>
              {item.description && (
                <div className="text-sm text-gray-400 mt-1">{item.description}</div>
              )}
              {item.category && (
                <div className="text-sm text-gray-500 mt-1">Category: {item.category}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Current Base Price</label>
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-lg font-semibold text-yellow-400">
                £{item.basePrice.toFixed(2)}
              </div>
              {item.lastPriceUpdate && (
                <div className="text-sm text-gray-400 mt-1">
                  Last updated: {item.lastPriceUpdate.toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="newPrice" className="form-label">New Base Price (£) *</label>
            <input
              ref={priceInputRef}
              id="newPrice"
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              value={newPrice}
              onChange={handlePriceChange}
              onBlur={() => {
                if (newPrice.trim()) {
                  const error = validatePrice(newPrice);
                  setPriceError(error);
                }
              }}
              className={`s-input ${priceError ? 'border-red-500' : ''}`}
              placeholder="e.g., 8.99"
              required
            />
            {priceError && <span className="text-red-400 text-sm mt-1 block">{priceError}</span>}
          </div>

          {hasChange && !priceError && (
            <div className="form-group">
              <label className="form-label">Price Change</label>
              <div className={`p-3 rounded-lg border ${
                priceChange > 0 
                  ? 'bg-red-900/20 border-red-700 text-red-300' 
                  : 'bg-green-900/20 border-green-700 text-green-300'
              }`}>
                <div className="flex items-center gap-2">
                  {priceChange > 0 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14l5-5 5 5z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  )}
                  <span className="font-medium">
                    {priceChange > 0 ? '+' : ''}£{priceChange.toFixed(2)} 
                    ({((priceChange / item.basePrice) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {item.hasOverrides && (
            <div className="form-group">
              <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 mt-0.5">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                  <div className="text-sm">
                    <div className="text-yellow-400 font-medium">Price Override Warning</div>
                    <div className="text-yellow-300 mt-1">
                      This item has {item.overrideCount} store-specific price override{item.overrideCount !== 1 ? 's' : ''}. 
                      Changing the base price will not affect existing overrides.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="s-btn"
              disabled={!!priceError || !hasChange}
            >
              Update Base Price
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ViewOverridesDrawerProps {
  isOpen: boolean;
  item: PricingItem | null;
  overrides: PriceOverride[];
  onClose: () => void;
}

function ViewOverridesDrawer({ isOpen, item, overrides, onClose }: ViewOverridesDrawerProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Price Overrides - {item.name}</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="drawer-form">
          <div className="form-group">
            <label className="form-label">Base Price</label>
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-lg font-semibold text-yellow-400">
                £{item.basePrice.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Global base price for all stores
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Store Overrides ({overrides.length})
            </label>
            
            {overrides.length === 0 ? (
              <div className="p-4 text-center text-gray-400 border border-gray-700 rounded-lg">
                No price overrides found for this item
              </div>
            ) : (
              <div className="space-y-3">
                {overrides.map((override) => {
                  const priceDiff = override.price - item.basePrice;
                  const percentDiff = ((priceDiff / item.basePrice) * 100);
                  
                  return (
                    <div key={override.id} className="p-3 border border-gray-700 rounded-lg bg-gray-800/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-white">{override.storeName}</div>
                          <div className="text-sm text-gray-400">{override.region}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white">£{override.price.toFixed(2)}</div>
                          <div className={`text-sm ${
                            priceDiff > 0 ? 'text-red-400' : priceDiff < 0 ? 'text-green-400' : 'text-gray-400'
                          }`}>
                            {priceDiff > 0 ? '+' : ''}£{priceDiff.toFixed(2)} ({percentDiff.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Effective from: {override.effectiveFrom.toLocaleDateString()}
                        {override.effectiveTo && (
                          <span> • Until: {override.effectiveTo.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="drawer-actions">
            <button onClick={onClose} className="s-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}