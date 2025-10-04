export const MENU_ITEM_SELECT = {
  id: true,
  name: true,
  price: true,
  active: true,
  storeId: true,
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
  active: true,
  createdAt: true,
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