// UI Constants
export const DRAWER_WIDTH = 600;
export const ANIMATION_DURATION = 300;

// API Endpoints
export const MODIFIER_ENDPOINTS = {
  GROUPS: '/menu/modifier-groups',
  ITEM_MODIFIERS: (itemId: string) => `/menu/items/${itemId}/modifiers`,
  ATTACH_MODIFIER: (itemId: string) => `/menu/items/${itemId}/modifiers`,
  DETACH_MODIFIER: (itemId: string, groupId: string) => `/menu/items/${itemId}/modifiers/${groupId}`,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  LOAD_GROUPS_FAILED: 'Failed to load modifier groups',
  LOAD_ATTACHED_FAILED: 'Failed to load attached modifiers',
  ATTACH_FAILED: 'Failed to attach modifier',
  DETACH_FAILED: 'Failed to detach modifier',
  GENERIC_ERROR: 'An unexpected error occurred',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ATTACHED: (name: string) => `${name} modifier attached successfully`,
  DETACHED: (name: string) => `${name} modifier detached successfully`,
} as const;