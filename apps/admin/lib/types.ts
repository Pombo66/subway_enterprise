export interface MenuItem {
  id: string;
  name: string;
  price: number | string; // Can be number from API or string from form input
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  storeId?: string;
  Store?: {
    id: string;
    name: string;
    country?: string;
    region?: string;
  };
  modifiers?: ModifierGroup[] | string[];
  description?: string;
  category?: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  minSelection?: number;
  maxSelection?: number;
  required?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Modifier {
  id: string;
  modifierGroupId: string;
  name: string;
  priceAdjustment: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  itemCount?: number;
}

export interface MenuItemCategory {
  id: string;
  menuItemId: string;
  categoryId: string;
  menuItem?: MenuItem;
  category?: Category;
}

export interface CreateMenuItemData {
  name: string;
  price: string;
  active: boolean;
  storeId: string;
}

export interface FormErrors {
  name?: string;
  price?: string;
  storeId?: string;
  general?: string;
}

export interface PriceOverride {
  id: string;
  storeId: string;
  storeName: string;
  region: string;
  menuItemId: string;
  price: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEntry {
  id: string;
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  diff?: string;
  timestamp: Date;
}

export interface PricingItem extends MenuItem {
  basePrice: number;
  overrideCount?: number;
  lastPriceUpdate?: Date;
  hasOverrides?: boolean;
}

export interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  Store?: { 
    id: string; 
    name: string; 
    region: string | null;
    country?: string | null;
    city?: string | null;
  } | null;
  User?: {
    id: string;
    email: string;
  } | null;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}