'use client';

import { useState, useEffect, useRef } from 'react';
import { MenuItem, ModifierGroup } from '../../../lib/types';
import MenuTable from './components/MenuTable';
import { useToast } from '../../components/ToastProvider';

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
  { 
    id: '3', 
    name: 'Veggie Delite', 
    price: 6.99, 
    active: false,
    description: 'Fresh vegetables and cheese',
    category: 'Vegetarian',
    modifiers: ['bread', 'extras'],
    Store: {
      id: 'store2',
      name: 'Mall Store',
      region: 'AMER'
    }
  },
];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>(mockItems);
  const [loading, setLoading] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { showSuccess, showError } = useToast();



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

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Meat', 'Vegetarian', 'Vegan', 'Sides', 'Drinks', 'Desserts'];

  const handleAddItem = (newItem: Omit<MenuItem, 'id'>, keepDrawerOpen = false) => {
    const item: MenuItem = {
      ...newItem,
      id: Date.now().toString(),
    };
    setItems(prev => [...prev, item]);
    showSuccess(`Menu item "${item.name}" created successfully!`);
    
    if (!keepDrawerOpen) {
      setShowAddDrawer(false);
    }
  };

  const handleEditItem = (updatedItem: MenuItem) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
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

  return (
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === 'All' ? '' : e.target.value)}
            className="s-select"
          >
            {categories.map(category => (
              <option key={category} value={category === 'All' ? '' : category}>
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
            <p className="s-panelT">Menu Items ({filteredItems.length})</p>
            
            <MenuTable
              items={filteredItems}
              loading={loading}
              error={null}
              onRefresh={() => window.location.reload()}
              onEditItem={setEditingItem}
              onDeleteItem={handleDeleteItem}
            />
          </div>
        </section>

        <AddItemDrawer 
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          onAdd={handleAddItem}
          defaultCategory={selectedCategory}
        />

        <EditItemDrawer 
          isOpen={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleEditItem}
        />
    </>
  );
}

interface AddItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<MenuItem, 'id'>, keepDrawerOpen?: boolean) => void;
  defaultCategory?: string;
}

function AddItemDrawer({ isOpen, onClose, onAdd, defaultCategory }: AddItemDrawerProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [priceError, setPriceError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const modifierGroups: ModifierGroup[] = [
    {
      id: 'bread',
      name: 'Bread Types',
      description: 'Choose your bread type'
    },
    {
      id: 'extras',
      name: 'Extras',
      description: 'Additional toppings and extras'
    },
    {
      id: 'sauces',
      name: 'Sauces',
      description: 'Sauce options'
    }
  ];

  // Auto-populate category from filter and auto-focus name field when drawer opens
  useEffect(() => {
    if (isOpen) {
      // Auto-populate category from currently selected filter
      if (defaultCategory && defaultCategory !== 'All') {
        setCategory(defaultCategory);
      }
      
      // Auto-focus on name field
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, defaultCategory]);

  // Decimal validation for price input
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
    
    // Check for valid decimal format (max 2 decimal places)
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    if (!decimalRegex.test(value)) {
      return 'Please enter a valid price (e.g., 8.99)';
    }
    
    return '';
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPrice(value);
    
    // Clear error when user starts typing
    if (priceError) {
      setPriceError('');
    }
  };

  const handlePriceBlur = () => {
    if (price.trim()) {
      const error = validatePrice(price);
      setPriceError(error);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setActive(true);
    setDescription('');
    setCategory(defaultCategory && defaultCategory !== 'All' ? defaultCategory : '');
    setSelectedModifiers([]);
    setPriceError('');
    
    // Re-focus name field after reset
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent, keepDrawerOpen = false) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name.trim()) {
      return;
    }
    
    if (!price.trim()) {
      setPriceError('Price is required');
      return;
    }
    
    // Validate price format
    const priceValidationError = validatePrice(price);
    if (priceValidationError) {
      setPriceError(priceValidationError);
      return;
    }

    onAdd({
      name: name.trim(),
      price: parseFloat(price),
      active,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
    }, keepDrawerOpen);

    // Reset form if keeping drawer open
    if (keepDrawerOpen) {
      resetForm();
    }
  };

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers(prev => 
      prev.includes(modifierId) 
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    );
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

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="itemName" className="form-label">Item Name</label>
            <input
              ref={nameInputRef}
              id="itemName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="s-input"
              placeholder="e.g., Italian BMT"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="itemPrice" className="form-label">Price (£)</label>
            <input
              id="itemPrice"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="s-input"
              placeholder="e.g., 8.99"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="itemDescription" className="form-label">Description (Optional)</label>
            <textarea
              id="itemDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="s-textarea"
              placeholder="Brief description of the item"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="itemCategory" className="form-label">Category (Optional)</label>
            <select
              id="itemCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="s-select"
            >
              <option value="">Select category</option>
              <option value="Meat">Meat</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Sides">Sides</option>
              <option value="Drinks">Drinks</option>
              <option value="Desserts">Desserts</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Available Modifiers</label>
            <div className="modifier-groups">
              {modifierGroups.map((group) => (
                <div key={group.id} className="modifier-group">
                  <label className="modifier-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedModifiers.includes(group.id)}
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
                onClick={() => setActive(true)}
                className={`status-btn ${active ? 'active' : ''}`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setActive(false)}
                className={`status-btn ${!active ? 'active' : ''}`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="s-btn">
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditItemDrawerProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
}

function EditItemDrawer({ isOpen, item, onClose, onSave }: EditItemDrawerProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const modifierGroups: ModifierGroup[] = [
    {
      id: 'bread',
      name: 'Bread Types',
      description: 'Choose your bread type'
    },
    {
      id: 'extras',
      name: 'Extras',
      description: 'Additional toppings and extras'
    },
    {
      id: 'sauces',
      name: 'Sauces',
      description: 'Sauce options'
    }
  ];

  // Update form when item changes
  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price.toString());
      setActive(item.active);
      setDescription(item.description || '');
      setCategory(item.category || '');
      setSelectedModifiers(Array.isArray(item.modifiers) && typeof item.modifiers[0] === 'string' ? item.modifiers as string[] : []);
    }
  }, [item]);

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers(prev => 
      prev.includes(modifierId) 
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !name.trim() || !price.trim()) return;

    onSave({
      ...item,
      name: name.trim(),
      price: parseFloat(price),
      active,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
    });
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

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="editItemName" className="form-label">Item Name</label>
            <input
              id="editItemName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="s-input"
              placeholder="e.g., Italian BMT"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="editItemPrice" className="form-label">Price (£)</label>
            <input
              id="editItemPrice"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="s-input"
              placeholder="e.g., 8.99"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="editItemDescription" className="form-label">Description (Optional)</label>
            <textarea
              id="editItemDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="s-textarea"
              placeholder="Brief description of the item"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="editItemCategory" className="form-label">Category (Optional)</label>
            <select
              id="editItemCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="s-select"
            >
              <option value="">Select category</option>
              <option value="Meat">Meat</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Sides">Sides</option>
              <option value="Drinks">Drinks</option>
              <option value="Desserts">Desserts</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Available Modifiers</label>
            <div className="modifier-groups">
              {modifierGroups.map((group) => (
                <div key={group.id} className="modifier-group">
                  <label className="modifier-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedModifiers.includes(group.id)}
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
                onClick={() => setActive(true)}
                className={`status-btn ${active ? 'active' : ''}`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setActive(false)}
                className={`status-btn ${!active ? 'active' : ''}`}
              >
                Inactive
              </button>
            </div>
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