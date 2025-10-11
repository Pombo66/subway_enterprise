import { z } from 'zod';

// Base validation schemas
export const IdSchema = z.string().min(1, 'ID is required');
export const NameSchema = z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less');
export const DescriptionSchema = z.string().max(500, 'Description must be 500 characters or less').optional();
export const PriceSchema = z.number().min(0.01, 'Price must be greater than 0').max(999.99, 'Price must be less than 1000');
export const PriceAdjustmentSchema = z.number().min(-99.99, 'Price adjustment must be greater than -100').max(99.99, 'Price adjustment must be less than 100');
export const SortOrderSchema = z.number().min(0, 'Sort order must be non-negative').int('Sort order must be an integer');
export const ActiveSchema = z.boolean().default(true);

// Menu Item schemas
export const CreateMenuItemSchema = z.object({
  name: NameSchema,
  price: PriceSchema,
  storeId: IdSchema,
  active: ActiveSchema,
});

export const UpdateMenuItemSchema = z.object({
  name: NameSchema.optional(),
  price: PriceSchema.optional(),
  active: ActiveSchema.optional(),
});

export const MenuItemQuerySchema = z.object({
  region: z.string().optional(),
  country: z.string().optional(),
  storeId: z.string().optional(),
  search: z.string().optional(),
  take: z.coerce.number().min(1).max(1000).default(100),
  skip: z.coerce.number().min(0).default(0),
});

// Category schemas
export const CreateCategorySchema = z.object({
  name: NameSchema,
  description: DescriptionSchema,
  sortOrder: SortOrderSchema.default(0),
  active: ActiveSchema,
});

export const UpdateCategorySchema = z.object({
  name: NameSchema.optional(),
  description: DescriptionSchema,
  sortOrder: SortOrderSchema.optional(),
  active: ActiveSchema.optional(),
});

export const ReorderCategoriesSchema = z.object({
  categoryIds: z.array(IdSchema).min(1, 'At least one category ID is required'),
});

export const CategoryItemAssignmentSchema = z.object({
  menuItemId: IdSchema,
});

// Modifier Group schemas
export const CreateModifierGroupSchema = z.object({
  name: NameSchema,
  description: DescriptionSchema,
  minSelection: z.number().min(0, 'Minimum selection must be non-negative').int().default(0),
  maxSelection: z.number().min(1, 'Maximum selection must be at least 1').int().optional(),
  required: z.boolean().default(false),
  active: ActiveSchema,
}).refine(
  (data) => !data.maxSelection || data.maxSelection >= data.minSelection,
  {
    message: 'Maximum selection must be greater than or equal to minimum selection',
    path: ['maxSelection'],
  }
);

export const UpdateModifierGroupSchema = z.object({
  name: NameSchema.optional(),
  description: DescriptionSchema,
  minSelection: z.number().min(0, 'Minimum selection must be non-negative').int().optional(),
  maxSelection: z.number().min(1, 'Maximum selection must be at least 1').int().optional(),
  required: z.boolean().optional(),
  active: ActiveSchema.optional(),
}).refine(
  (data) => {
    if (data.maxSelection !== undefined && data.minSelection !== undefined) {
      return data.maxSelection >= data.minSelection;
    }
    return true;
  },
  {
    message: 'Maximum selection must be greater than or equal to minimum selection',
    path: ['maxSelection'],
  }
);

// Modifier schemas
export const CreateModifierSchema = z.object({
  name: NameSchema,
  priceAdjustment: PriceAdjustmentSchema.default(0),
  active: ActiveSchema,
});

export const UpdateModifierSchema = z.object({
  name: NameSchema.optional(),
  priceAdjustment: PriceAdjustmentSchema.optional(),
  active: ActiveSchema.optional(),
});

// Modifier attachment schemas
export const AttachModifierSchema = z.object({
  modifierGroupId: IdSchema,
});

// Pricing schemas
export const UpdateMenuItemPricingSchema = z.object({
  basePrice: PriceSchema,
});

// Parameter validation schemas
export const MenuItemParamsSchema = z.object({
  id: IdSchema,
});

export const CategoryParamsSchema = z.object({
  id: IdSchema,
});

export const ModifierGroupParamsSchema = z.object({
  id: IdSchema,
});

export const ModifierParamsSchema = z.object({
  groupId: IdSchema,
  modifierId: IdSchema,
});

export const CategoryItemParamsSchema = z.object({
  id: IdSchema,
  itemId: IdSchema,
});

export const MenuItemModifierParamsSchema = z.object({
  id: IdSchema,
  groupId: IdSchema,
});

// Type exports
export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>;
export type UpdateMenuItemDto = z.infer<typeof UpdateMenuItemSchema>;
export type MenuItemQueryDto = z.infer<typeof MenuItemQuerySchema>;
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
export type ReorderCategoriesDto = z.infer<typeof ReorderCategoriesSchema>;
export type CategoryItemAssignmentDto = z.infer<typeof CategoryItemAssignmentSchema>;
export type CreateModifierGroupDto = z.infer<typeof CreateModifierGroupSchema>;
export type UpdateModifierGroupDto = z.infer<typeof UpdateModifierGroupSchema>;
export type CreateModifierDto = z.infer<typeof CreateModifierSchema>;
export type UpdateModifierDto = z.infer<typeof UpdateModifierSchema>;
export type AttachModifierDto = z.infer<typeof AttachModifierSchema>;
export type UpdateMenuItemPricingDto = z.infer<typeof UpdateMenuItemPricingSchema>;