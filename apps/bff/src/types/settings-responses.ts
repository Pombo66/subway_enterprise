/**
 * Type definitions for settings-related API responses
 */

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEntryResponse {
  id: string;
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  diff?: string | null;
  timestamp: Date;
}

export interface FeatureFlagResponse {
  id: string;
  key: string;
  enabled: boolean;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogPaginatedResponse {
  entries: AuditEntryResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Request types
export interface CreateUserRequest {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
}

export interface UpdateFeatureFlagRequest {
  enabled: boolean;
  description?: string;
}