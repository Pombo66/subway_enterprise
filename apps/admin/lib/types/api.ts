import { ModifierGroup } from '../types';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ModifierGroupsResponse extends ApiResponse<ModifierGroup[]> {}
export interface AttachedModifiersResponse extends ApiResponse<ModifierGroup[]> {}
export interface ModifierActionResponse extends ApiResponse<null> {}

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Operation States
export type OperationType = 'attach' | 'detach';
export type OperationState = `${OperationType}-${string}` | undefined;