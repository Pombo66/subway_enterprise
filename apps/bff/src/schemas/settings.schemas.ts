import { z } from 'zod';

// Base validation schemas
export const IdSchema = z.string().min(1, 'ID is required');
export const EmailSchema = z.string().email('Please enter a valid email address');
export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'STAFF'], {
  errorMap: () => ({ message: 'Role must be one of: ADMIN, MANAGER, STAFF' }),
});
export const NameSchema = z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less');
export const ActiveSchema = z.boolean().default(true);

// User Management schemas
export const CreateUserSchema = z.object({
  email: EmailSchema,
  role: UserRoleSchema,
  firstName: NameSchema.optional(),
  lastName: NameSchema.optional(),
  active: ActiveSchema,
});

export const UpdateUserSchema = z.object({
  email: EmailSchema.optional(),
  role: UserRoleSchema.optional(),
  firstName: NameSchema.optional(),
  lastName: NameSchema.optional(),
  active: ActiveSchema.optional(),
});

// Audit Log Query schemas
export const AuditLogQuerySchema = z.object({
  search: z.string().optional(),
  entity: z.string().optional(),
  action: z.string().optional(),
  actor: z.string().optional(),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  }
);

// Feature Flag schemas
export const FeatureFlagKeySchema = z.string()
  .min(1, 'Feature flag key is required')
  .max(50, 'Feature flag key must be 50 characters or less')
  .regex(/^[A-Z_][A-Z0-9_]*$/, 'Feature flag key must be uppercase with underscores only');

export const CreateFeatureFlagSchema = z.object({
  key: FeatureFlagKeySchema,
  enabled: z.boolean().default(false),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

// Parameter validation schemas
export const UserParamsSchema = z.object({
  id: IdSchema,
});

export const FeatureFlagParamsSchema = z.object({
  key: FeatureFlagKeySchema,
});

// Type exports
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type AuditLogQueryDto = z.infer<typeof AuditLogQuerySchema>;
export type CreateFeatureFlagDto = z.infer<typeof CreateFeatureFlagSchema>;
export type UpdateFeatureFlagDto = z.infer<typeof UpdateFeatureFlagSchema>;