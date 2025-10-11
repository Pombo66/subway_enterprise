'use client';

import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { MenuItem, ModifierGroup } from '../../../lib/types';
import MenuTable from './components/MenuTable';
import { useToast } from '../../components/ToastProvider';
import { TelemetryErrorBoundary } from '../../components/TelemetryErrorBoundary';
import { ErrorBoundary, withFormErrorBoundary } from '../../components/ErrorBoundary';
import { ErrorDisplay, FieldError, ErrorState } from '../../components/ErrorDisplay';
import { useFormValidation } from '../../../lib/hooks/useFormValidation';
import { useErrorHandler } from '../../../lib/hooks/useErrorHandler';
import { bffWithErrorHandling } from '../../../lib/api';

// Zod schemas for validation
const CreateMenuItemSchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters').max(100, 'Item name cannot exceed 100 characters'),
  price: z.number().min(0.01, 'Price must be greater than 0').max(999.99, 'Price cannot exceed £999.99'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  category: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
  active: z.boolean(),
});

const UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({
  id: z.string(),
});

type CreateMenuItemData = z.infer<typeof CreateMenuItemSchema>;
type UpdateMenuItemData = z.infer<typeof UpdateMenuItemSchema>;

// Mock data for development - will be replaced with API calls
const mockItems: MenuItem[] = [
  { 
    id: '1', 
    name: 'Italian BMT', 
    price: 8.99, 
    active: true,
    description: 'Pepperoni, salami, and ham',
    category: 'Meat',
    modifiers: ['bread', 'extras', 'sauces'],
    Store: {
      id: 'store1',
      name: 'Downtown Store',
      region: 'EMEA'
    }
  },
  { 
    id: '2', 
    name: 'Turkey Breast', 
    price: 7.99, 
    active: true,
    description: 'Oven roasted turkey breast',
    category: 'Meat',
    modifiers: ['bread', 'sauces'],
    Store: {
      id: 'store1',
      name: 'Downtown Store',
      region: 'EMEA'
    }
  },
];

const mockCategories = ['Meat', 'Vegetarian', 'Vegan', 'Seafood', 'Sides', 'Drinks', 'Desserts'];

const mockModifierGroups: ModifierGroup[] = [
  {
    id: 'bread',
    name: 'Bread Types',
    description: 'Choose your bread type',
    active: true
  },
  {
    id: 'extras',
    name: 'Extras',
    description: 'Additional toppings and extras',
    active: true
  },
  {
    id: 'sauces',
    name: 'Sauces',
    description: 'Sauce options',
    active: true
  },
];

export default function EnhancedMenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>(mockItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedScope, setSelectedScope] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const { showSuccess } = useToast();
  const { handleApiError } = useErrorHandler();

  // Load items with error handling
  const loadItems = async () => {
    setLoading(true);
    setError(null);
    
    const result = await handleApiError(
      () => bffWithErrorHandling('/menu/items'),
      'loading menu items'
    );
    
    if (result.success) {
      const items = Array.isArray(result.data) ? result.data as MenuItem[] : mockItems;
      setItems(items);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddDrawer) {
          setShowAddDrawer(false);
        }
        if (editingItem) {
          setEditingItem(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showAddDrawer, editingItem]);

  // Filter items based on search, category, and scope
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesScope = selectedScope === 'all' || 
                        (selectedScope === 'global' && !item.Store) ||
                        (selectedScope === 'region' && item.Store?.region) ||
                        (selectedScope === 'country' && item.Store?.country) ||
                        (selectedScope === 'store' && item.Store?.id);
    
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

  const handleAddItem = async (newItemData: CreateMenuItemData, keepDrawerOpen = false) => {
    const result = await handleApiError(
      () => bffWithErrorHandling('/menu/items', undefined, {
        method: 'POST',
        body: JSON.stringify(newItemData),
      }),
      'creating menu item',
      {
        showSuccessToast: true,
        successMessage: `Menu item "${newItemData.name}" created successfully!`,
      }
    );

    if (result.success) {
      // Add to local state for immediate UI update
      const newItem: MenuItem = {
        ...newItemData,
        id: Date.now().toString(), // In real app, this would come from API
      };
      setItems(prev => [...prev, newItem]);
      
      if (!keepDrawerOpen) {
        setShowAddDrawer(false);
      }
    }
    
    return result;
  };

  const handleEditItem = async (updatedItemData: UpdateMenuItemData) => {
    const result = await handleApiError(
      () => bffWithErrorHandling(`/menu/items/${updatedItemData.id}`, undefined, {
        method: 'PATCH',
        body: JSON.stringify(updatedItemData),
      }),
      'updating menu item',
      {
        showSuccessToast: true,
        successMessage: `Menu item "${updatedItemData.name}" updated successfully!`,
      }
    );

    if (result.success) {
      setItems(prev => prev.map(item => 
        item.id === updatedItemData.id ? { ...item, ...updatedItemData } : item
      ));
      setEditingItem(null);
    }
    
    return result;
  };

  const handleDeleteItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    const result = await handleApiError(
      () => bffWithErrorHandling(`/menu/items/${itemId}`, undefined, {
        method: 'DELETE',
      }),
      'deleting menu item',
      {
        showSuccessToast: true,
        successMessage: `Menu item "${item.name}" deleted successfully!`,
      }
    );

    if (result.success) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  if (loading) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-white">Loading menu items...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="s-wrap">
        <ErrorState
          title="Failed to load menu items"
          message={error}
          action={{
            label: "Try again",
            onClick: loadItems,
          }}
        />
      </div>
    );
  }

  return (
    <TelemetryErrorBoundary>
      <ErrorBoundary>
        <>
          <div className="menu-header-section">
            <div>
              <h2 style={{ color: 'var(--s-head)', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Items</h2>
              <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>Manage your store&apos;s menu items</p>
            </div>
            <button 
              onClick={() => setShowAddDrawer(true)}
              className="s-btn menu-add-button-custom"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Create Item
            </button>
          </div>

          {/* Filters Section */}
          <div className="filters-section">
            <select 
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="s-select"
            >
              <option value="all">All Scopes</option>
              <option value="global">Global</option>
              <option value="region">Region</option>
              <option value="country">Country</option>
              <option value="store">Store</option>
            </select>

            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="s-select"
            >
              <option value="">All Categories</option>
              {mockCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            
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
                <p className="s-panelT">Menu Items ({filteredItems.length})</p>
                {totalPages > 1 && (
                  <div className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>
              
              <MenuTable
                items={paginatedItems}
                loading={loading}
                error={error}
                onRefresh={loadItems}
                onEditItem={setEditingItem}
                onDeleteItem={handleDeleteItem}
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

          <AddItemDrawer 
            isOpen={showAddDrawer}
            onClose={() => setShowAddDrawer(false)}
            onAdd={handleAddItem}
            defaultCategory={selectedCategory}
            categories={mockCategories}
            modifierGroups={mockModifierGroups}
          />

          <EditItemDrawer 
            isOpen={!!editingItem}
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={handleEditItem}
            categories={mockCategories}
            modifierGroups={mockModifierGroups}
          />
        </>
      </ErrorBoundary>
    </TelemetryErrorBoundary>
  );
}

// Enhanced Add Item Drawer with validation
const AddItemDrawer = withFormErrorBoundary(function AddItemDrawer({ 
  isOpen, 
  onClose, 
  onAdd, 
  defaultCategory, 
  categories, 
  modifierGroups 
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: CreateMenuItemData, keepDrawerOpen?: boolean) => Promise<any>;
  defaultCategory?: string;
  categories: string[];
  modifierGroups: ModifierGroup[];
}) {
  const [formData, setFormData] = useState<Partial<CreateMenuItemData>>({
    name: '',
    price: undefined,
    description: '',
    category: '',
    modifiers: [],
    active: true,
  });
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    isSubmitting,
    errors,
    submitError,
    handleSubmit,
    getFieldError,
    hasFieldError,
    clearErrors,
  } = useFormValidation({
    schema: CreateMenuItemSchema,
    onSubmit: async (data) => {
      const itemData = {
        ...data,
        active: data.active ?? true, // Ensure active is always provided
      };
      const result = await onAdd(itemData, false);
      if (result.success) {
        resetForm();
      }
    },
  });

  // Auto-populate category from filter and auto-focus name field when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (defaultCategory) {
        setFormData(prev => ({ ...prev, category: defaultCategory }));
      }
      
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, defaultCategory]);

  const resetForm = () => {
    setFormData({
      name: '',
      price: undefined,
      description: '',
      category: defaultCategory || '',
      modifiers: [],
      active: true,
    });
    clearErrors();
    
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleFieldChange = (field: keyof CreateMenuItemData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleModifier = (modifierId: string) => {
    const currentModifiers = formData.modifiers || [];
    const newModifiers = currentModifiers.includes(modifierId) 
      ? currentModifiers.filter(id => id !== modifierId)
      : [...currentModifiers, modifierId];
    
    handleFieldChange('modifiers', newModifiers);
  };

  const handleFormSubmit = (e: React.FormEvent, keepDrawerOpen = false) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      price: formData.price || 0,
      name: formData.name || '',
    } as CreateMenuItemData;
    
    handleSubmit(submitData);
  };

  const handleAddAndCreateAnother = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      price: formData.price || 0,
      name: formData.name || '',
    } as CreateMenuItemData;
    
    const result = await onAdd(submitData, true);
    if (result.success) {
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Add New Menu Item</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {submitError && (
          <ErrorDisplay 
            error={submitError} 
            className="mx-6 mb-4"
            showRetry={true}
            onRetry={() => handleFormSubmit(new Event('submit') as any)}
          />
        )}

        <form onSubmit={handleFormSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="itemName" className="form-label">Item Name *</label>
            <input
              ref={nameInputRef}
              id="itemName"
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className={`s-input ${hasFieldError('name') ? 'error' : ''}`}
              placeholder="e.g., Italian BMT"
              required
            />
            <FieldError errors={errors} fieldName="name" />
          </div>

          <div className="form-group">
            <label htmlFor="itemPrice" className="form-label">Base Price (£) *</label>
            <input
              id="itemPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.price || ''}
              onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || undefined)}
              className={`s-input ${hasFieldError('price') ? 'error' : ''}`}
              placeholder="e.g., 8.99"
              required
            />
            <FieldError errors={errors} fieldName="price" />
          </div>

          <div className="form-group">
            <label htmlFor="itemDescription" className="form-label">Description</label>
            <textarea
              id="itemDescription"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className={`s-textarea ${hasFieldError('description') ? 'error' : ''}`}
              placeholder="Brief description of the item"
              rows={2}
            />
            <FieldError errors={errors} fieldName="description" />
          </div>

          <div className="form-group">
            <label htmlFor="itemCategory" className="form-label">Category</label>
            <select
              id="itemCategory"
              value={formData.category || ''}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="s-select"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Modifier Groups</label>
            <div className="modifier-groups">
              {modifierGroups.map((group) => (
                <div key={group.id} className="modifier-group">
                  <label className="modifier-checkbox">
                    <input
                      type="checkbox"
                      checked={(formData.modifiers || []).includes(group.id)}
                      onChange={() => toggleModifier(group.id)}
                    />
                    <span className="modifier-label">
                      <strong>{group.name}</strong>
                      {group.description && (
                        <span className="modifier-options">
                          {group.description}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="status-toggle">
              <button
                type="button"
                onClick={() => handleFieldChange('active', true)}
                className={`status-btn ${formData.active ? 'active' : ''}`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('active', false)}
                className={`status-btn ${!formData.active ? 'active' : ''}`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleAddAndCreateAnother} 
              className="btn-secondary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add & Create Another'}
            </button>
            <button type="submit" className="s-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Enhanced Edit Item Drawer with validation
const EditItemDrawer = withFormErrorBoundary(function EditItemDrawer({ 
  isOpen, 
  item, 
  onClose, 
  onSave, 
  categories, 
  modifierGroups 
}: {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onSave: (item: UpdateMenuItemData) => Promise<any>;
  categories: string[];
  modifierGroups: ModifierGroup[];
}) {
  const [formData, setFormData] = useState<Partial<UpdateMenuItemData>>({});

  const {
    isSubmitting,
    errors,
    submitError,
    handleSubmit,
    hasFieldError,
  } = useFormValidation({
    schema: UpdateMenuItemSchema,
    onSubmit: async (data) => {
      await onSave(data);
    },
  });

  // Update form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        id: item.id,
        name: item.name,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
        description: item.description || '',
        category: item.category || '',
        modifiers: Array.isArray(item.modifiers) && typeof item.modifiers[0] === 'string' ? item.modifiers as string[] : [],
        active: item.active,
      });
    }
  }, [item]);

  const handleFieldChange = (field: keyof UpdateMenuItemData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleModifier = (modifierId: string) => {
    const currentModifiers = formData.modifiers || [];
    const newModifiers = currentModifiers.includes(modifierId) 
      ? currentModifiers.filter(id => id !== modifierId)
      : [...currentModifiers, modifierId];
    
    handleFieldChange('modifiers', newModifiers);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(formData as UpdateMenuItemData);
  };

  if (!isOpen || !item) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Edit Menu Item</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {submitError && (
          <ErrorDisplay 
            error={submitError} 
            className="mx-6 mb-4"
            showRetry={true}
            onRetry={() => handleFormSubmit(new Event('submit') as any)}
          />
        )}

        <form onSubmit={handleFormSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="editItemName" className="form-label">Item Name *</label>
            <input
              id="editItemName"
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className={`s-input ${hasFieldError('name') ? 'error' : ''}`}
              placeholder="e.g., Italian BMT"
              required
            />
            <FieldError errors={errors} fieldName="name" />
          </div>

          <div className="form-group">
            <label htmlFor="editItemPrice" className="form-label">Base Price (£) *</label>
            <input
              id="editItemPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.price || ''}
              onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || undefined)}
              className={`s-input ${hasFieldError('price') ? 'error' : ''}`}
              placeholder="e.g., 8.99"
              required
            />
            <FieldError errors={errors} fieldName="price" />
          </div>

          <div className="form-group">
            <label htmlFor="editItemDescription" className="form-label">Description</label>
            <textarea
              id="editItemDescription"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className={`s-textarea ${hasFieldError('description') ? 'error' : ''}`}
              placeholder="Brief description of the item"
              rows={2}
            />
            <FieldError errors={errors} fieldName="description" />
          </div>

          <div className="form-group">
            <label htmlFor="editItemCategory" className="form-label">Category</label>
            <select
              id="editItemCategory"
              value={formData.category || ''}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="s-select"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Modifier Groups</label>
            <div className="modifier-groups">
              {modifierGroups.map((group) => (
                <div key={group.id} className="modifier-group">
                  <label className="modifier-checkbox">
                    <input
                      type="checkbox"
                      checked={(formData.modifiers || []).includes(group.id)}
                      onChange={() => toggleModifier(group.id)}
                    />
                    <span className="modifier-label">
                      <strong>{group.name}</strong>
                      {group.description && (
                        <span className="modifier-options">
                          {group.description}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="status-toggle">
              <button
                type="button"
                onClick={() => handleFieldChange('active', true)}
                className={`status-btn ${formData.active ? 'active' : ''}`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('active', false)}
                className={`status-btn ${!formData.active ? 'active' : ''}`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="s-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});