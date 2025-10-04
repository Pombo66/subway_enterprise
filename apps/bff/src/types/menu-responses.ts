/**
 * Type definitions for menu-related API responses
 */

export interface MenuItemResponse {
  id: string;
  name: string;
  price: number;
  active: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModifierGroupResponse {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModifierResponse {
  id: string;
  name: string;
  price: number;
  active: boolean;
  modifierGroupId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemWithModifiersResponse extends MenuItemResponse {
  modifiers: Array<{
    modifierGroup: ModifierGroupResponse;
  }>;
}

export interface CreateMenuItemRequest {
  name: string;
  price: number;
  storeId: string;
  active?: boolean;
}

export interface AttachModifierRequest {
  modifierGroupId: string;
}