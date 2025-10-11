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
  minSelection: number;
  maxSelection?: number | null;
  required: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  modifierCount?: number;
}

export interface ModifierResponse {
  id: string;
  name: string;
  priceAdjustment: number;
  active: boolean;
  modifierGroupId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModifierGroupWithModifiersResponse extends ModifierGroupResponse {
  modifiers: ModifierResponse[];
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

export interface CategoryResponse {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
}

export interface CategoryWithItemsResponse extends CategoryResponse {
  items: Array<{
    menuItem: MenuItemResponse;
  }>;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface ReorderCategoriesRequest {
  categoryIds: string[];
}

export interface CategoryItemAssignmentRequest {
  menuItemId: string;
}

export interface MenuItemPricingResponse {
  id: string;
  name: string;
  basePrice: number;
  storeId: string;
  Store: {
    id: string;
    name: string;
    country: string | null;
    region: string | null;
  };
  priceOverrides: Array<{
    id: string;
    storeId: string;
    price: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    store: {
      id: string;
      name: string;
      country: string | null;
      region: string | null;
    };
  }>;
}

export interface UpdateMenuItemPricingRequest {
  basePrice: number;
}