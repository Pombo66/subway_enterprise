export const MENU_ITEM_SELECT = {
  id: true,
  name: true,
  price: true,
  active: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
  Store: {
    select: { 
      id: true, 
      name: true, 
      country: true, 
      region: true 
    }
  }
} as const;

export const MODIFIER_GROUP_SELECT = {
  id: true,
  name: true,
  description: true,
  minSelection: true,
  maxSelection: true,
  required: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const MODIFIER_SELECT = {
  id: true,
  name: true,
  priceAdjustment: true,
  active: true,
  modifierGroupId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const MODIFIER_GROUP_WITH_MODIFIERS_SELECT = {
  id: true,
  name: true,
  description: true,
  minSelection: true,
  maxSelection: true,
  required: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  modifiers: {
    select: MODIFIER_SELECT,
    orderBy: {
      name: 'asc' as const
    }
  }
} as const;

export const MENU_ITEM_WITH_MODIFIERS_SELECT = {
  id: true,
  modifiers: {
    select: {
      modifierGroup: {
        select: MODIFIER_GROUP_SELECT
      }
    },
    orderBy: {
      modifierGroup: {
        name: 'asc' as const
      }
    }
  }
} as const;

export const CATEGORY_SELECT = {
  id: true,
  name: true,
  description: true,
  sortOrder: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const CATEGORY_WITH_ITEMS_SELECT = {
  id: true,
  name: true,
  description: true,
  sortOrder: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      menuItem: {
        select: MENU_ITEM_SELECT
      }
    },
    orderBy: {
      menuItem: {
        name: 'asc' as const
      }
    }
  }
} as const;

export const MENU_ITEM_PRICING_SELECT = {
  id: true,
  name: true,
  basePrice: true,
  storeId: true,
  Store: {
    select: {
      id: true,
      name: true,
      country: true,
      region: true
    }
  },
  PriceOverrides: {
    select: {
      id: true,
      storeId: true,
      price: true,
      effectiveFrom: true,
      effectiveTo: true,
      store: {
        select: {
          id: true,
          name: true,
          country: true,
          region: true
        }
      }
    },
    orderBy: {
      effectiveFrom: 'desc' as const
    }
  }
} as const;