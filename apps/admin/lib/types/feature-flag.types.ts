import { z } from 'zod';

export const FeatureFlagSchema = z.object({
  id: z.string(),
  key: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateFeatureFlagSchema = z.object({
  key: z.string().min(1, 'Key is required').regex(/^[A-Z_][A-Z0-9_]*$/, 'Key must be uppercase with underscores only'),
  enabled: z.boolean().default(false),
  description: z.string().optional(),
});

export const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean().optional(),
  description: z.string().optional(),
});

export const FeatureFlagQuerySchema = z.object({
  search: z.string().optional(),
  enabled: z.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
export type CreateFeatureFlagRequest = z.infer<typeof CreateFeatureFlagSchema>;
export type UpdateFeatureFlagRequest = z.infer<typeof UpdateFeatureFlagSchema>;
export type FeatureFlagQuery = z.infer<typeof FeatureFlagQuerySchema>;

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FeatureFlagEvent {
  id: string;
  flagKey: string;
  action: 'ENABLED' | 'DISABLED' | 'CREATED' | 'UPDATED' | 'DELETED';
  actor: string;
  timestamp: string;
  previousValue?: boolean;
  newValue?: boolean;
}