export interface MenuItem {
  id: string;
  name: string;
  price: number | string; // Can be number from API or string from form input
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  storeId: string;
  Store: {
    id: string;
    name: string;
    country?: string;
    region?: string;
  };
  modifiers?: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}