/**
 * Prisma selectors for settings-related queries
 */

export const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const AUDIT_ENTRY_SELECT = {
  id: true,
  actor: true,
  entity: true,
  entityId: true,
  action: true,
  diff: true,
  timestamp: true,
} as const;

export const FEATURE_FLAG_SELECT = {
  id: true,
  key: true,
  enabled: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;