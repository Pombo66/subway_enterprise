import { z } from 'zod';

// Base validation schemas
export const IdSchema = z.string().min(1, 'ID is required');
export const PriceSchema = z.number().min(0.01, 'Price must be greater than 0').max(999.99, 'Price must be less than 1000');

// Store Query schemas
export const StoreQuerySchema = z.object({
  region: z.string().optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  active: z.boolean().optional(),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(50),
});

// Price Override schemas
export const CreatePriceOverrideSchema = z.object({
  menuItemId: IdSchema,
  price: PriceSchema,
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.effectiveFrom && data.effectiveTo) {
      return new Date(data.effectiveFrom) < new Date(data.effectiveTo);
    }
    return true;
  },
  {
    message: 'Effective from date must be before effective to date',
    path: ['effectiveTo'],
  }
);

export const UpdatePriceOverrideSchema = z.object({
  price: PriceSchema.optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.effectiveFrom && data.effectiveTo) {
      return new Date(data.effectiveFrom) < new Date(data.effectiveTo);
    }
    return true;
  },
  {
    message: 'Effective from date must be before effective to date',
    path: ['effectiveTo'],
  }
);

// Parameter validation schemas
export const StoreParamsSchema = z.object({
  id: IdSchema,
});

export const PriceOverrideParamsSchema = z.object({
  storeId: IdSchema,
  itemId: IdSchema,
});

// Type exports
export type StoreQueryDto = z.infer<typeof StoreQuerySchema>;
export type CreatePriceOverrideDto = z.infer<typeof CreatePriceOverrideSchema>;
export type UpdatePriceOverrideDto = z.infer<typeof UpdatePriceOverrideSchema>;