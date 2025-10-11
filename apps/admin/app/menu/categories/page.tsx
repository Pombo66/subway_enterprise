'use client';

import { useState, useEffect, useRef } from 'react';
import { Category, MenuItem } from '../../../lib/types';
import { useToast } from '../../components/ToastProvider';

// Mock data for categories
const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Meat Sandwiches',
    description: 'Sandwiches with meat proteins',
    sortOrder: 1,
    active: true,
    itemCount: 8,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Vegetarian',
    description: 'Plant-based sandwich options',
    sortOrder: 2,
    active: true,
    itemCount: 3,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: '3',
    name: 'Sides',
    description: 'Chips, cookies, and other sides',
    sortOrder: 3,
    active: true,
    itemCount: 5,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17')
  },
  {
    id: '4',
    name: 'Drinks',
    description: 'Beverages and fountain drinks',
    sortOrder: 4,
    active: false,
    itemCount: 0,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  }
];

// Mock menu items for assignment
const mockMenuItems: MenuItem[] = [
  { id: '1', name: 'Italian BMT', price: 8.99, active: true, category: 'Meat Sandwiches' },
  { id: '2', name: 'Turkey Breast', price: 7.99, active: true, category: 'Meat Sandwiches' },
  { id: '3', name: 'Veggie Delite', price: 6.99, active: true, category: 'Vegetarian' },
  { id: '4', name: 'Chips', price: 1.99, active: true, category: 'Sides' },
  { id: '5', name: 'Cookies', price: 1.50, active: true, category: 'Sides' },
  { id: '6', name: 'Tuna', price: 7.49, active: true },
  { id: '7', name: 'Ham', price: 6.99, active: true }
];

export default function MenuCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [loading, setLoading] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showItemAssignment, setShowItemAssignment] = useState<Category | null>(null);
  const [draggedItem, setDraggedItem] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showSuccess, showError } = useToast();

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddDrawer) setShowAddDrawer(false);
        if (editingCategory) setEditingCategory(null);
        if (showItemAssignment) setShowItemAssignment(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showAddDrawer, editingCategory, showItemAssignment]);

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddCategory = (newCategory: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const category: Category = {
      ...newCategory,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      itemCount: 0
    };
    setCategories(prev => [...prev, category].sort((a, b) => a.sortOrder - b.sortOrder));
    showSuccess(`Category "${category.name}" created successfully!`);
    setShowAddDrawer(false);
  };

  const handleEditCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(cat => 
      cat.id === updatedCategory.id ? { ...updatedCategory, updatedAt: new Date() } : cat
    ));
    showSuccess(`Category "${updatedCategory.name}" updated successfully!`);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    if (category.itemCount && category.itemCount > 0) {
      showError(`Cannot delete category "${category.name}" because it contains ${category.itemCount} items. Please reassign or remove items first.`);
      return;
    }

    if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      showSuccess(`Category "${category.name}" deleted successfully!`);
    }
  };

  const handleReorderCategories = (reorderedCategories: Category[]) => {
    const updatedCategories = reorderedCategories.map((cat, index) => ({
      ...cat,
      sortOrder: index + 1,
      updatedAt: new Date()
    }));
    setCategories(updatedCategories);
    showSuccess('Category order updated successfully!');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetCategory.id) return;

    const draggedIndex = filteredCategories.findIndex(cat => cat.id === draggedItem.id);
    const targetIndex = filteredCategories.findIndex(cat => cat.id === targetCategory.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCategories = [...filteredCategories];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    handleReorderCategories(newCategories);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  if (loading) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-white">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="menu-header-section">
        <div>
          <h2 style={{ color: 'var(--s-head)', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Categories</h2>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Organize menu items into categories with drag-and-drop ordering
          </p>
        </div>
        <button 
          onClick={() => setShowAddDrawer(true)}
          className="s-btn menu-add-button-custom"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          Create Category
        </button>
      </div>

      {/* Search Section */}
      <div className="filters-section">
        <div className="search-container">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="s-input search-input"
          />
        </div>
      </div>

      <section className="s-panel">
        <div className="s-panelCard">
          <div className="flex justify-between items-center mb-4">
            <p className="s-panelT">Categories ({filteredCategories.length})</p>
            <div className="text-sm text-gray-400">
              Drag and drop to reorder categories
            </div>
          </div>
          
          <CategoriesTable
            categories={filteredCategories}
            onEdit={setEditingCategory}
            onDelete={handleDeleteCategory}
            onAssignItems={setShowItemAssignment}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            draggedItem={draggedItem}
          />
        </div>
      </section>

      <AddCategoryDrawer 
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onAdd={handleAddCategory}
        existingCategories={categories}
      />

      <EditCategoryDrawer 
        isOpen={!!editingCategory}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={handleEditCategory}
        existingCategories={categories}
      />

      <ItemAssignmentDrawer
        isOpen={!!showItemAssignment}
        category={showItemAssignment}
        onClose={() => setShowItemAssignment(null)}
        menuItems={mockMenuItems}
        onAssignmentChange={(categoryId, itemIds) => {
          // Update item count for the category
          setCategories(prev => prev.map(cat => 
            cat.id === categoryId ? { ...cat, itemCount: itemIds.length } : cat
          ));
          showSuccess('Item assignments updated successfully!');
        }}
      />
    </>
  );
}

interface CategoriesTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onAssignItems: (category: Category) => void;
  onDragStart: (e: React.DragEvent, category: Category) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, category: Category) => void;
  onDragEnd: () => void;
  draggedItem: Category | null;
}

function CategoriesTable({ 
  categories, 
  onEdit, 
  onDelete, 
  onAssignItems,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedItem
}: CategoriesTableProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">No categories found</h3>
        <p className="text-gray-400">Create your first category to organize menu items.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 font-medium text-gray-300">Order</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Name</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Description</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Items</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr
              key={category.id}
              draggable
              onDragStart={(e) => onDragStart(e, category)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, category)}
              onDragEnd={onDragEnd}
              className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-move ${
                draggedItem?.id === category.id ? 'opacity-50' : ''
              }`}
            >
              <td className="py-3 px-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                  </svg>
                  <span className="text-gray-300">{category.sortOrder}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-white">{category.name}</div>
              </td>
              <td className="py-3 px-4">
                <div className="text-gray-300 max-w-xs truncate">
                  {category.description || '-'}
                </div>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => onAssignItems(category)}
                  className="s-btn text-blue-400 hover:text-blue-300 underline"
                >
                  {category.itemCount || 0} items
                </button>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  category.active 
                    ? 'bg-green-900/50 text-green-300 border border-green-700' 
                    : 'bg-red-900/50 text-red-300 border border-red-700'
                }`}>
                  {category.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEdit(category)}
                    className="s-btn text-blue-400 hover:text-blue-300 p-1"
                    title="Edit category"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(category.id)}
                    className="s-btn text-red-400 hover:text-red-300 p-1"
                    title="Delete category"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AddCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  existingCategories: Category[];
}

function AddCategoryDrawer({ isOpen, onClose, onAdd, existingCategories }: AddCategoryDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'Category name is required';
    }
    if (existingCategories.some(cat => cat.name.toLowerCase() === value.trim().toLowerCase())) {
      return 'A category with this name already exists';
    }
    return '';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (nameError) setNameError('');
  };

  const handleNameBlur = () => {
    if (name.trim()) {
      const error = validateName(name);
      setNameError(error);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setActive(true);
    setNameError('');
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameValidationError = validateName(name);
    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }

    const maxSortOrder = Math.max(...existingCategories.map(cat => cat.sortOrder), 0);
    
    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      sortOrder: maxSortOrder + 1,
      active,
      itemCount: 0
    });

    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Add New Category</h2>
          <button onClick={onClose} className="drawer-close" data-allow-unstyled={true}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="categoryName" className="form-label">Category Name</label>
            <input
              ref={nameInputRef}
              id="categoryName"
              type="text"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              className={`s-input ${nameError ? 'border-red-500' : ''}`}
              placeholder="e.g., Meat Sandwiches"
              required
            />
            {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="categoryDescription" className="form-label">Description (Optional)</label>
            <textarea
              id="categoryDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="s-textarea"
              placeholder="Brief description of this category"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="status-toggle">
              <button
                type="button"
                onClick={() => setActive(true)}
                className={`status-btn ${active ? 'active' : ''}`}
                data-allow-unstyled={true}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setActive(false)}
                className={`status-btn ${!active ? 'active' : ''}`}
                data-allow-unstyled={true}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary" data-allow-unstyled={true}>
              Cancel
            </button>
            <button type="submit" className="s-btn" disabled={!!nameError}>
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditCategoryDrawerProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (category: Category) => void;
  existingCategories: Category[];
}

function EditCategoryDrawer({ isOpen, category, onClose, onSave, existingCategories }: EditCategoryDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setActive(category.active);
      setNameError('');
    }
  }, [category]);

  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'Category name is required';
    }
    if (existingCategories.some(cat => 
      cat.id !== category?.id && cat.name.toLowerCase() === value.trim().toLowerCase()
    )) {
      return 'A category with this name already exists';
    }
    return '';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (nameError) setNameError('');
  };

  const handleNameBlur = () => {
    if (name.trim()) {
      const error = validateName(name);
      setNameError(error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    
    const nameValidationError = validateName(name);
    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }

    onSave({
      ...category,
      name: name.trim(),
      description: description.trim() || undefined,
      active
    });
  };

  if (!isOpen || !category) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Edit Category</h2>
          <button onClick={onClose} className="drawer-close" data-allow-unstyled={true}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="editCategoryName" className="form-label">Category Name</label>
            <input
              id="editCategoryName"
              type="text"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              className={`s-input ${nameError ? 'border-red-500' : ''}`}
              placeholder="e.g., Meat Sandwiches"
              required
            />
            {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="editCategoryDescription" className="form-label">Description (Optional)</label>
            <textarea
              id="editCategoryDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="s-textarea"
              placeholder="Brief description of this category"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="status-toggle">
              <button
                type="button"
                onClick={() => setActive(true)}
                className={`status-btn ${active ? 'active' : ''}`}
                data-allow-unstyled={true}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setActive(false)}
                className={`status-btn ${!active ? 'active' : ''}`}
                data-allow-unstyled={true}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary" data-allow-unstyled={true}>
              Cancel
            </button>
            <button type="submit" className="s-btn" disabled={!!nameError}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ItemAssignmentDrawerProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  menuItems: MenuItem[];
  onAssignmentChange: (categoryId: string, itemIds: string[]) => void;
}

function ItemAssignmentDrawer({ isOpen, category, onClose, menuItems, onAssignmentChange }: ItemAssignmentDrawerProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (category) {
      // Get items currently assigned to this category
      const assignedItems = menuItems
        .filter(item => item.category === category.name)
        .map(item => item.id);
      setSelectedItems(assignedItems);
    }
  }, [category, menuItems]);

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSave = () => {
    if (category) {
      onAssignmentChange(category.id, selectedItems);
      onClose();
    }
  };

  if (!isOpen || !category) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Assign Items to &quot;{category.name}&quot;</h2>
          <button onClick={onClose} className="drawer-close" data-allow-unstyled={true}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="drawer-form">
          <div className="form-group">
            <label className="form-label">Search Menu Items</label>
            <div className="search-container">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="s-input search-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Menu Items ({selectedItems.length} selected)
            </label>
            <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No items found
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {filteredItems.map((item) => (
                    <label key={item.id} className="flex items-center p-3 hover:bg-gray-800/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemToggle(item.id)}
                        className="mr-3"
                        data-allow-unstyled={true}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-sm text-gray-400">
                          £{typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                          {item.category && item.category !== category.name && (
                            <span className="ml-2 text-yellow-400">
                              (Currently in: {item.category})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        item.active 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary" data-allow-unstyled={true}>
              Cancel
            </button>
            <button onClick={handleSave} className="s-btn">
              Save Assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}