import { z } from 'zod';

// Base validation schemas
export const IdSchema = z.string().min(1, 'ID is required');
export const OrderStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'], {
  errorMap: () => ({ message: 'Invalid order status' }),
});

// Order Query schemas
export const OrderQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  storeId: IdSchema.optional(),
  userId: IdSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(50),
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

// Order Update schemas
export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

// Parameter validation schemas
export const OrderParamsSchema = z.object({
  id: IdSchema,
});

// Type exports
export type OrderQueryDto = z.infer<typeof OrderQuerySchema>;
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;