'use client';

import { useState, useEffect, useRef } from 'react';
import { ModifierGroup, Modifier, MenuItem } from '../../../lib/types';
import { useToast } from '../../components/ToastProvider';

// Mock data for modifier groups
const mockModifierGroups: ModifierGroup[] = [
  {
    id: '1',
    name: 'Bread Types',
    description: 'Choose your bread type',
    active: true,
    minSelection: 1,
    maxSelection: 1,
    required: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Extras',
    description: 'Additional toppings and extras',
    active: true,
    minSelection: 0,
    maxSelection: 5,
    required: false,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: '3',
    name: 'Sauces',
    description: 'Sauce options',
    active: true,
    minSelection: 0,
    maxSelection: 3,
    required: false,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17')
  },
  {
    id: '4',
    name: 'Cheese',
    description: 'Cheese varieties',
    active: false,
    minSelection: 0,
    maxSelection: 2,
    required: false,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  }
];

// Mock data for individual modifiers
const mockModifiers: Modifier[] = [
  { id: '1', modifierGroupId: '1', name: 'Italian Herbs & Cheese', priceAdjustment: 0.50, active: true },
  { id: '2', modifierGroupId: '1', name: 'Honey Oat', priceAdjustment: 0.30, active: true },
  { id: '3', modifierGroupId: '1', name: 'White', priceAdjustment: 0.00, active: true },
  { id: '4', modifierGroupId: '2', name: 'Extra Cheese', priceAdjustment: 1.00, active: true },
  { id: '5', modifierGroupId: '2', name: 'Bacon', priceAdjustment: 1.50, active: true },
  { id: '6', modifierGroupId: '2', name: 'Avocado', priceAdjustment: 1.25, active: true },
  { id: '7', modifierGroupId: '3', name: 'Mayo', priceAdjustment: 0.00, active: true },
  { id: '8', modifierGroupId: '3', name: 'Mustard', priceAdjustment: 0.00, active: true },
  { id: '9', modifierGroupId: '3', name: 'Southwest', priceAdjustment: 0.25, active: true }
];

// Mock menu items for attachment interface
const mockMenuItems: MenuItem[] = [
  { id: '1', name: 'Italian BMT', price: 8.99, active: true, modifiers: ['1', '2'] },
  { id: '2', name: 'Turkey Breast', price: 7.99, active: true, modifiers: ['1'] },
  { id: '3', name: 'Veggie Delite', price: 6.99, active: true, modifiers: [] },
  { id: '4', name: 'Chicken Teriyaki', price: 9.49, active: true, modifiers: ['1', '2', '3'] }
];

export default function MenuModifiersPage() {
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>(mockModifierGroups);
  const [modifiers, setModifiers] = useState<Modifier[]>(mockModifiers);
  const [loading, setLoading] = useState(false);
  const [showAddGroupDrawer, setShowAddGroupDrawer] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [showModifiersDrawer, setShowModifiersDrawer] = useState<ModifierGroup | null>(null);
  const [showAttachmentDrawer, setShowAttachmentDrawer] = useState<ModifierGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showSuccess, showError } = useToast();

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddGroupDrawer) setShowAddGroupDrawer(false);
        if (editingGroup) setEditingGroup(null);
        if (showModifiersDrawer) setShowModifiersDrawer(null);
        if (showAttachmentDrawer) setShowAttachmentDrawer(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showAddGroupDrawer, editingGroup, showModifiersDrawer, showAttachmentDrawer]);

  // Filter modifier groups based on search
  const filteredGroups = modifierGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddGroup = (newGroup: Omit<ModifierGroup, 'id' | 'createdAt' | 'updatedAt'>) => {
    const group: ModifierGroup = {
      ...newGroup,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setModifierGroups(prev => [...prev, group]);
    showSuccess(`Modifier group "${group.name}" created successfully!`);
    setShowAddGroupDrawer(false);
  };

  const handleEditGroup = (updatedGroup: ModifierGroup) => {
    setModifierGroups(prev => prev.map(group => 
      group.id === updatedGroup.id ? { ...updatedGroup, updatedAt: new Date() } : group
    ));
    showSuccess(`Modifier group "${updatedGroup.name}" updated successfully!`);
    setEditingGroup(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = modifierGroups.find(g => g.id === groupId);
    if (!group) return;

    const groupModifiers = modifiers.filter(m => m.modifierGroupId === groupId);
    if (groupModifiers.length > 0) {
      showError(`Cannot delete modifier group "${group.name}" because it contains ${groupModifiers.length} modifiers. Please remove modifiers first.`);
      return;
    }

    if (confirm(`Are you sure you want to delete the modifier group "${group.name}"?`)) {
      setModifierGroups(prev => prev.filter(g => g.id !== groupId));
      showSuccess(`Modifier group "${group.name}" deleted successfully!`);
    }
  };

  const handleModifierChange = (groupId: string, updatedModifiers: Modifier[]) => {
    setModifiers(prev => [
      ...prev.filter(m => m.modifierGroupId !== groupId),
      ...updatedModifiers
    ]);
    showSuccess('Modifiers updated successfully!');
  };

  if (loading) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-white">Loading modifier groups...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="menu-header-section">
        <div>
          <h2 style={{ color: 'var(--s-head)', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Modifiers</h2>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Manage modifier groups and individual modifiers with min/max selection rules
          </p>
        </div>
        <button 
          onClick={() => setShowAddGroupDrawer(true)}
          className="s-btn menu-add-button-custom"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          Create Group
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
            placeholder="Search modifier groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="s-input search-input"
          />
        </div>
      </div>

      <section className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <p className="s-panelT">Modifier Groups ({filteredGroups.length})</p>
          </div>
          
          <ModifierGroupsTable
            groups={filteredGroups}
            modifiers={modifiers}
            onEdit={setEditingGroup}
            onDelete={handleDeleteGroup}
            onManageModifiers={setShowModifiersDrawer}
            onAttachToItems={setShowAttachmentDrawer}
          />
        </div>
      </section>

      <AddModifierGroupDrawer 
        isOpen={showAddGroupDrawer}
        onClose={() => setShowAddGroupDrawer(false)}
        onAdd={handleAddGroup}
        existingGroups={modifierGroups}
      />

      <EditModifierGroupDrawer 
        isOpen={!!editingGroup}
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onSave={handleEditGroup}
        existingGroups={modifierGroups}
      />

      <ManageModifiersDrawer
        isOpen={!!showModifiersDrawer}
        group={showModifiersDrawer}
        modifiers={modifiers.filter(m => m.modifierGroupId === showModifiersDrawer?.id)}
        onClose={() => setShowModifiersDrawer(null)}
        onChange={handleModifierChange}
      />

      <AttachToItemsDrawer
        isOpen={!!showAttachmentDrawer}
        group={showAttachmentDrawer}
        menuItems={mockMenuItems}
        onClose={() => setShowAttachmentDrawer(null)}
        onAttachmentChange={(groupId, itemIds) => {
          showSuccess('Item attachments updated successfully!');
        }}
      />
    </>
  );
}

interface ModifierGroupsTableProps {
  groups: ModifierGroup[];
  modifiers: Modifier[];
  onEdit: (group: ModifierGroup) => void;
  onDelete: (groupId: string) => void;
  onManageModifiers: (group: ModifierGroup) => void;
  onAttachToItems: (group: ModifierGroup) => void;
}

function ModifierGroupsTable({ 
  groups, 
  modifiers, 
  onEdit, 
  onDelete, 
  onManageModifiers,
  onAttachToItems
}: ModifierGroupsTableProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">No modifier groups found</h3>
        <p className="text-gray-400">Create your first modifier group to organize menu options.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 font-medium text-gray-300">Name</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Description</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Rules</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Modifiers</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const groupModifiers = modifiers.filter(m => m.modifierGroupId === group.id);
            return (
              <tr
                key={group.id}
                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="font-medium text-white">{group.name}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-gray-300 max-w-xs truncate">
                    {group.description || '-'}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-300">
                    <div>Min: {group.minSelection || 0}</div>
                    <div>Max: {group.maxSelection || 'Unlimited'}</div>
                    <div className={`text-xs ${group.required ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {group.required ? 'Required' : 'Optional'}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => onManageModifiers(group)}
                    className="s-btn text-blue-400 hover:text-blue-300 underline"
                  >
                    {groupModifiers.length} modifiers
                  </button>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    group.active 
                      ? 'bg-green-900/50 text-green-300 border border-green-700' 
                      : 'bg-red-900/50 text-red-300 border border-red-700'
                  }`}>
                    {group.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEdit(group)}
                      className="s-btn text-blue-400 hover:text-blue-300 p-1"
                      title="Edit group"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => onAttachToItems(group)}
                      className="s-btn text-green-400 hover:text-green-300 p-1"
                      title="Attach to items"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 16H9V7h9v14z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(group.id)}
                      className="s-btn text-red-400 hover:text-red-300 p-1"
                      title="Delete group"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface AddModifierGroupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (group: Omit<ModifierGroup, 'id' | 'createdAt' | 'updatedAt'>) => void;
  existingGroups: ModifierGroup[];
}

function AddModifierGroupDrawer({ isOpen, onClose, onAdd, existingGroups }: AddModifierGroupDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [minSelection, setMinSelection] = useState(0);
  const [maxSelection, setMaxSelection] = useState(1);
  const [required, setRequired] = useState(false);
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'Group name is required';
    }
    if (existingGroups.some(group => group.name.toLowerCase() === value.trim().toLowerCase())) {
      return 'A modifier group with this name already exists';
    }
    return '';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (nameError) setNameError('');
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setActive(true);
    setMinSelection(0);
    setMaxSelection(1);
    setRequired(false);
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

    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      active,
      minSelection,
      maxSelection,
      required
    });

    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Add New Modifier Group</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="groupName" className="form-label">Group Name *</label>
            <input
              ref={nameInputRef}
              id="groupName"
              type="text"
              value={name}
              onChange={handleNameChange}
              className={`s-input ${nameError ? 'border-red-500' : ''}`}
              placeholder="e.g., Bread Types"
              required
            />
            {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="groupDescription" className="form-label">Description</label>
            <textarea
              id="groupDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="s-textarea"
              placeholder="Brief description of this modifier group"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Selection Rules</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minSelection" className="form-label text-sm">Minimum Selection</label>
                <input
                  id="minSelection"
                  type="number"
                  min="0"
                  value={minSelection}
                  onChange={(e) => setMinSelection(parseInt(e.target.value) || 0)}
                  className="s-input"
                />
              </div>
              <div>
                <label htmlFor="maxSelection" className="form-label text-sm">Maximum Selection</label>
                <input
                  id="maxSelection"
                  type="number"
                  min="1"
                  value={maxSelection}
                  onChange={(e) => setMaxSelection(parseInt(e.target.value) || 1)}
                  className="s-input"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Selection</label>
            <div className="status-toggle">
              <button
                type="button"
                onClick={() => setRequired(true)}
                className={`status-btn ${required ? 'active' : ''}`}
              >
                Required
              </button>
              <button
                type="button"
                onClick={() => setRequired(false)}
                className={`status-btn ${!required ? 'active' : ''}`}
              >
                Optional
              </button>
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
            <button type="submit" className="s-btn" disabled={!!nameError}>
              Add Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditModifierGroupDrawerProps {
  isOpen: boolean;
  group: ModifierGroup | null;
  onClose: () => void;
  onSave: (group: ModifierGroup) => void;
  existingGroups: ModifierGroup[];
}

function EditModifierGroupDrawer({ isOpen, group, onClose, onSave, existingGroups }: EditModifierGroupDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [minSelection, setMinSelection] = useState(0);
  const [maxSelection, setMaxSelection] = useState(1);
  const [required, setRequired] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
      setActive(group.active ?? true);
      setMinSelection(group.minSelection || 0);
      setMaxSelection(group.maxSelection || 1);
      setRequired(group.required || false);
      setNameError('');
    }
  }, [group]);

  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'Group name is required';
    }
    if (existingGroups.some(g => 
      g.id !== group?.id && g.name.toLowerCase() === value.trim().toLowerCase()
    )) {
      return 'A modifier group with this name already exists';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    
    const nameValidationError = validateName(name);
    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }

    onSave({
      ...group,
      name: name.trim(),
      description: description.trim() || undefined,
      active,
      minSelection,
      maxSelection,
      required
    });
  };

  if (!isOpen || !group) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Edit Modifier Group</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="editGroupName" className="form-label">Group Name *</label>
            <input
              id="editGroupName"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              className={`s-input ${nameError ? 'border-red-500' : ''}`}
              placeholder="e.g., Bread Types"
              required
            />
            {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="editGroupDescription" className="form-label">Description</label>
            <textarea
              id="editGroupDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="s-textarea"
              placeholder="Brief description of this modifier group"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Selection Rules</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editMinSelection" className="form-label text-sm">Minimum Selection</label>
                <input
                  id="editMinSelection"
                  type="number"
                  min="0"
                  value={minSelection}
                  onChange={(e) => setMinSelection(parseInt(e.target.value) || 0)}
                  className="s-input"
                />
              </div>
              <div>
                <label htmlFor="editMaxSelection" className="form-label text-sm">Maximum Selection</label>
                <input
                  id="editMaxSelection"
                  type="number"
                  min="1"
                  value={maxSelection}
                  onChange={(e) => setMaxSelection(parseInt(e.target.value) || 1)}
                  className="s-input"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Selection</label>
            <div className="status-toggle">
              <button
                type="button"
                onClick={() => setRequired(true)}
                className={`status-btn ${required ? 'active' : ''}`}
              >
                Required
              </button>
              <button
                type="button"
                onClick={() => setRequired(false)}
                className={`status-btn ${!required ? 'active' : ''}`}
              >
                Optional
              </button>
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
            <button type="submit" className="s-btn" disabled={!!nameError}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ManageModifiersDrawerProps {
  isOpen: boolean;
  group: ModifierGroup | null;
  modifiers: Modifier[];
  onClose: () => void;
  onChange: (groupId: string, modifiers: Modifier[]) => void;
}

function ManageModifiersDrawer({ isOpen, group, modifiers, onClose, onChange }: ManageModifiersDrawerProps) {
  const [localModifiers, setLocalModifiers] = useState<Modifier[]>([]);
  const [showAddModifier, setShowAddModifier] = useState(false);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);

  useEffect(() => {
    setLocalModifiers(modifiers);
  }, [modifiers]);

  const handleAddModifier = (newModifier: Omit<Modifier, 'id'>) => {
    const modifier: Modifier = {
      ...newModifier,
      id: Date.now().toString()
    };
    const updatedModifiers = [...localModifiers, modifier];
    setLocalModifiers(updatedModifiers);
    setShowAddModifier(false);
  };

  const handleEditModifier = (updatedModifier: Modifier) => {
    const updatedModifiers = localModifiers.map(m => 
      m.id === updatedModifier.id ? updatedModifier : m
    );
    setLocalModifiers(updatedModifiers);
    setEditingModifier(null);
  };

  const handleDeleteModifier = (modifierId: string) => {
    const modifier = localModifiers.find(m => m.id === modifierId);
    if (modifier && confirm(`Are you sure you want to delete "${modifier.name}"?`)) {
      const updatedModifiers = localModifiers.filter(m => m.id !== modifierId);
      setLocalModifiers(updatedModifiers);
    }
  };

  const handleSave = () => {
    if (group) {
      onChange(group.id, localModifiers);
      onClose();
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Manage Modifiers - {group.name}</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="drawer-form">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-400">
              {localModifiers.length} modifiers in this group
            </p>
            <button
              onClick={() => setShowAddModifier(true)}
              className="s-btn text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Add Modifier
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
            {localModifiers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p>No modifiers in this group</p>
                <p className="text-sm">Add your first modifier to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {localModifiers.map((modifier) => (
                  <div key={modifier.id} className="p-3 hover:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{modifier.name}</div>
                        <div className="text-sm text-gray-400">
                          Price adjustment: {modifier.priceAdjustment >= 0 ? '+' : ''}£{modifier.priceAdjustment.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          modifier.active 
                            ? 'bg-green-900/50 text-green-300' 
                            : 'bg-red-900/50 text-red-300'
                        }`}>
                          {modifier.active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => setEditingModifier(modifier)}
                          className="s-btn text-blue-400 hover:text-blue-300 p-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteModifier(modifier.id)}
                          className="s-btn text-red-400 hover:text-red-300 p-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="drawer-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="s-btn">
              Save Changes
            </button>
          </div>
        </div>

        {showAddModifier && (
          <AddModifierForm
            groupId={group.id}
            onAdd={handleAddModifier}
            onCancel={() => setShowAddModifier(false)}
          />
        )}

        {editingModifier && (
          <EditModifierForm
            modifier={editingModifier}
            onSave={handleEditModifier}
            onCancel={() => setEditingModifier(null)}
          />
        )}
      </div>
    </div>
  );
}

interface AddModifierFormProps {
  groupId: string;
  onAdd: (modifier: Omit<Modifier, 'id'>) => void;
  onCancel: () => void;
}

function AddModifierForm({ groupId, onAdd, onCancel }: AddModifierFormProps) {
  const [name, setName] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState('0.00');
  const [active, setActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      modifierGroupId: groupId,
      name: name.trim(),
      priceAdjustment: parseFloat(priceAdjustment) || 0,
      active
    });

    setName('');
    setPriceAdjustment('0.00');
    setActive(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">Add New Modifier</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Modifier Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="s-input w-full"
              placeholder="e.g., Extra Cheese"
              required
            />
          </div>

          <div>
            <label className="form-label">Price Adjustment (£)</label>
            <input
              type="number"
              step="0.01"
              value={priceAdjustment}
              onChange={(e) => setPriceAdjustment(e.target.value)}
              className="s-input w-full"
              placeholder="0.00"
            />
          </div>

          <div>
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

          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="s-btn">
              Add Modifier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditModifierFormProps {
  modifier: Modifier;
  onSave: (modifier: Modifier) => void;
  onCancel: () => void;
}

function EditModifierForm({ modifier, onSave, onCancel }: EditModifierFormProps) {
  const [name, setName] = useState(modifier.name);
  const [priceAdjustment, setPriceAdjustment] = useState(modifier.priceAdjustment.toString());
  const [active, setActive] = useState(modifier.active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...modifier,
      name: name.trim(),
      priceAdjustment: parseFloat(priceAdjustment) || 0,
      active
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">Edit Modifier</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Modifier Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="s-input w-full"
              placeholder="e.g., Extra Cheese"
              required
            />
          </div>

          <div>
            <label className="form-label">Price Adjustment (£)</label>
            <input
              type="number"
              step="0.01"
              value={priceAdjustment}
              onChange={(e) => setPriceAdjustment(e.target.value)}
              className="s-input w-full"
              placeholder="0.00"
            />
          </div>

          <div>
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

          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onCancel} className="btn-secondary">
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

interface AttachToItemsDrawerProps {
  isOpen: boolean;
  group: ModifierGroup | null;
  menuItems: MenuItem[];
  onClose: () => void;
  onAttachmentChange: (groupId: string, itemIds: string[]) => void;
}

function AttachToItemsDrawer({ isOpen, group, menuItems, onClose, onAttachmentChange }: AttachToItemsDrawerProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (group) {
      // Get items currently attached to this group
      const attachedItems = menuItems
        .filter(item => {
          if (Array.isArray(item.modifiers)) {
            // Handle both string[] and ModifierGroup[] cases
            return item.modifiers.some(modifier => 
              typeof modifier === 'string' ? modifier === group.id : modifier.id === group.id
            );
          }
          return false;
        })
        .map(item => item.id);
      setSelectedItems(attachedItems);
    }
  }, [group, menuItems]);

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
    if (group) {
      onAttachmentChange(group.id, selectedItems);
      onClose();
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Attach &quot;{group.name}&quot; to Menu Items</h2>
          <button onClick={onClose} className="drawer-close">
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
                        className="s-input mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-sm text-gray-400">
                          £{typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                          {item.category && (
                            <span className="ml-2 text-blue-400">
                              {item.category}
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
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="s-btn">
              Save Attachments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}