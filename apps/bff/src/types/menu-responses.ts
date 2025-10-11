/**
 * Type definitions for menu-related API responses
 */
import { Decimal } from '@prisma/client/runtime/library';

export interface MenuItemResponse {
  id: string;
  name: string;
  price: number;
  active: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
  Store?: {
    id: string;
    name: string;
    country: string | null;
    region: string | null;
  };
}

export interface ModifierGroupResponse {
  id: string;
  name: string;
  description?: string | null;
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