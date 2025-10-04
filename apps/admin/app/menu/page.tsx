'use client';

import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import MenuTable from './components/MenuTable';
import ItemDrawer from './components/ItemDrawer';
import ItemModifiersDrawer from './components/ItemModifiersDrawer';
import { MenuItem } from '../../lib/types';
import { useTelemetry } from '../hooks/useTelemetry';

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [modifiersDrawer, setModifiersDrawer] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
  }>({
    isOpen: false,
    itemId: '',
    itemName: ''
  });

  // Initialize telemetry
  const { trackPageView, trackUserAction, trackError } = useTelemetry();

  useEffect(() => {
    // Track page view
    trackPageView('/menu', { 
      feature: 'menu_management',
      timestamp: new Date().toISOString()
    });
    
    fetchMenuItems();
  }, [trackPageView]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/menu/items');
      // const data = await response.json();
      
      // Mock data for now
      const mockData: MenuItem[] = [
        {
          id: '1',
          name: 'Italian B.M.T.',
          price: 8.99,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeId: 'store-1',
          Store: { id: 'store-1', name: 'Downtown Store', region: 'EMEA' },
          modifiers: []
        },
        {
          id: '2',
          name: 'Turkey Breast',
          price: 7.49,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeId: 'store-2',
          Store: { id: 'store-2', name: 'Mall Store', region: 'AMER' },
          modifiers: []
        },
        {
          id: '3',
          name: 'Veggie Delite',
          price: 5.99,
          active: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeId: 'store-3',
          Store: { id: 'store-3', name: 'Airport Store', region: 'APAC' },
          modifiers: []
        }
      ];
      
      setItems(mockData);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      // Track error for telemetry
      trackError(error instanceof Error ? error : new Error('Failed to fetch menu items'), 'menu_page_fetch');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'active' && item.active) ||
      (selectedCategory === 'inactive' && !item.active);
    
    return matchesSearch && matchesCategory;
  });

  const handleEditModifiers = (itemId: string, itemName: string) => {
    // Track user action
    trackUserAction('open_modifiers_drawer', 'menu_table', {
      itemId,
      itemName
    });
    
    setModifiersDrawer({
      isOpen: true,
      itemId,
      itemName
    });
  };

  const handleCloseModifiersDrawer = () => {
    setModifiersDrawer({
      isOpen: false,
      itemId: '',
      itemName: ''
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Menu Management</h1>
        <p className="text-gray-600">Manage menu items across all stores</p>
      </div>

      {/* Header Controls - Inline layout with 12-16px spacing */}
      <div className="flex items-center gap-4 mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="s-select"
        >
          <option value="all">All Items</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="s-input pl-10"
          />
        </div>

        <button
          onClick={() => {
            trackUserAction('open_create_item_drawer', 'menu_page');
            setIsDrawerOpen(true);
          }}
          className="s-btn flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Item
        </button>
      </div>

      <MenuTable 
        items={filteredItems} 
        loading={loading}
        onRefresh={fetchMenuItems}
        onEditModifiers={handleEditModifiers}
      />

      <ItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchMenuItems}
      />

      <ItemModifiersDrawer
        itemId={modifiersDrawer.itemId}
        itemName={modifiersDrawer.itemName}
        isOpen={modifiersDrawer.isOpen}
        onClose={handleCloseModifiersDrawer}
      />
    </div>
  );
}