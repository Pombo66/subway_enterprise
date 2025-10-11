'use client';

import { useState, useEffect } from 'react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description?: string;
  category?: string;
  modifiers?: string[];
}

interface ModifierGroup {
  id: string;
  name: string;
  options: string[];
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Mock modifier groups
  const modifierGroups: ModifierGroup[] = [
    {
      id: 'bread',
      name: 'Bread Types',
      options: ['Italian Herbs & Cheese', 'Honey Oat', 'White', 'Wheat', 'Multigrain']
    },
    {
      id: 'extras',
      name: 'Extras',
      options: ['Extra Cheese', 'Bacon', 'Avocado', 'Double Meat', 'Extra Vegetables']
    },
    {
      id: 'sauces',
      name: 'Sauces',
      options: ['Mayo', 'Mustard', 'Southwest', 'Ranch', 'Chipotle', 'Honey Mustard']
    }
  ];

  useEffect(() => {
    // Mock data for now
    setItems([
      { 
        id: '1', 
        name: 'Italian BMT', 
        price: 8.99, 
        active: true,
        description: 'Pepperoni, salami, and ham',
        category: 'Meat',
        modifiers: ['bread', 'extras', 'sauces']
      },
      { 
        id: '2', 
        name: 'Turkey Breast', 
        price: 7.99, 
        active: true,
        description: 'Oven roasted turkey breast',
        category: 'Meat',
        modifiers: ['bread', 'sauces']
      },
      { 
        id: '3', 
        name: 'Veggie Delite', 
        price: 6.99, 
        active: false,
        description: 'Fresh vegetables and cheese',
        category: 'Vegetarian',
        modifiers: ['bread', 'extras']
      },
    ]);
    setLoading(false);
  }, []);

  const handleAddItem = (newItem: Omit<MenuItem, 'id'>) => {
    const item: MenuItem = {
      ...newItem,
      id: Date.now().toString(),
    };
    setItems(prev => [...prev, item]);
    setShowAddDrawer(false);
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
    return <div className="p-6">Loading menu items...</div>;
  }

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Menu Management</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>Manage your store's menu items</p>
          </div>
          <button 
            onClick={() => setShowAddDrawer(true)}
            className="menu-add-button-custom"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
            Add New Item
          </button>
        </div>

        <section className="s-panel">
          <div className="s-panelCard">
            <p className="s-panelT">Menu Items</p>
            <div className="menu-table">
              <div className="menu-header">
                <div className="menu-cell">Name</div>
                <div className="menu-cell">Price</div>
                <div className="menu-cell">Status</div>
                <div className="menu-cell">Actions</div>
              </div>
              <div className="menu-body">
                {items.map((item) => (
                  <div key={item.id} className="menu-row">
                    <div className="menu-cell">
                      <span className="menu-item-name">{item.name}</span>
                    </div>
                    <div className="menu-cell">
                      <span className="menu-price">£{item.price.toFixed(2)}</span>
                    </div>
                    <div className="menu-cell">
                      <span className={`s-badge ${item.active ? 'badge-active' : 'badge-inactive'}`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="menu-cell">
                      <div className="menu-actions">
                        <button 
                          onClick={() => setEditingItem(item)}
                          className="menu-action-btn menu-edit"
                          title="Edit item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="menu-action-btn menu-delete"
                          title="Delete item"
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

        <AddItemDrawer 
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          onAdd={handleAddItem}
        />

        <EditItemDrawer 
          isOpen={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleEditItem}
        />
      </div>
    </main>
  );
}

interface AddItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<MenuItem, 'id'>) => void;
}

function AddItemDrawer({ isOpen, onClose, onAdd }: AddItemDrawerProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  // Mock modifier groups (same as parent component)
  const modifierGroups: ModifierGroup[] = [
    {
      id: 'bread',
      name: 'Bread Types',
      options: ['Italian Herbs & Cheese', 'Honey Oat', 'White', 'Wheat', 'Multigrain']
    },
    {
      id: 'extras',
      name: 'Extras',
      options: ['Extra Cheese', 'Bacon', 'Avocado', 'Double Meat', 'Extra Vegetables']
    },
    {
      id: 'sauces',
      name: 'Sauces',
      options: ['Mayo', 'Mustard', 'Southwest', 'Ranch', 'Chipotle', 'Honey Mustard']
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim()) return;

    onAdd({
      name: name.trim(),
      price: parseFloat(price),
      active,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
    });

    // Reset form
    setName('');
    setPrice('');
    setActive(true);
    setDescription('');
    setCategory('');
    setSelectedModifiers([]);
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
      <div className="drawer-content">
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
              className="s-input"
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
                      <span className="modifier-options">
                        {group.options.slice(0, 3).join(', ')}
                        {group.options.length > 3 && ` +${group.options.length - 3} more`}
                      </span>
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

  // Mock modifier groups (same as parent component)
  const modifierGroups: ModifierGroup[] = [
    {
      id: 'bread',
      name: 'Bread Types',
      options: ['Italian Herbs & Cheese', 'Honey Oat', 'White', 'Wheat', 'Multigrain']
    },
    {
      id: 'extras',
      name: 'Extras',
      options: ['Extra Cheese', 'Bacon', 'Avocado', 'Double Meat', 'Extra Vegetables']
    },
    {
      id: 'sauces',
      name: 'Sauces',
      options: ['Mayo', 'Mustard', 'Southwest', 'Ranch', 'Chipotle', 'Honey Mustard']
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
      setSelectedModifiers(item.modifiers || []);
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
      <div className="drawer-content">
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
              className="s-input"
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
                      <span className="modifier-options">
                        {group.options.slice(0, 3).join(', ')}
                        {group.options.length > 3 && ` +${group.options.length - 3} more`}
                      </span>
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