/**
 * Repository pattern for menu item operations
 */

import { CreateMenuItemData } from '../types';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  storeId: string;
  Store?: {
    id: string;
    name: string;
    country: string;
    region: string;
  };
}

export interface MenuItemQuery {
  storeId?: string;
  active?: boolean;
  take?: number;
}

export interface MenuItemRepository {
  create(data: CreateMenuItemData): Promise<MenuItem>;
  findMany(query?: MenuItemQuery): Promise<MenuItem[]>;
  findById(id: string): Promise<MenuItem | null>;
  update(id: string, data: Partial<MenuItem>): Promise<MenuItem>;
  delete(id: string): Promise<void>;
}

export class ApiMenuItemRepository implements MenuItemRepository {
  private baseUrl = '/api/menu/items';

  async create(data: CreateMenuItemData): Promise<MenuItem> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        price: parseFloat(data.price)
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async findMany(query?: MenuItemQuery): Promise<MenuItem[]> {
    const params = new URLSearchParams();
    if (query?.storeId) params.append('storeId', query.storeId);
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.take) params.append('take', query.take.toString());

    const response = await fetch(`${this.baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async findById(id: string): Promise<MenuItem | null> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async update(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}