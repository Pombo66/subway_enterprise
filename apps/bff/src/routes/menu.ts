import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseInterceptors, UsePipes } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';
import { 
  CreateMenuItemDto, 
  AttachModifierDto, 
  MenuItemQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ReorderCategoriesDto,
  CategoryItemAssignmentDto,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierDto,
  UpdateModifierDto,
  UpdateMenuItemPricingDto
} from '../schemas/menu.schemas';
import { ApiResponse, ApiResponseBuilder } from '../types/api-response';
import { 
  MENU_ITEM_SELECT, 
  MODIFIER_GROUP_SELECT, 
  MENU_ITEM_WITH_MODIFIERS_SELECT,
  CATEGORY_SELECT,
  CATEGORY_WITH_ITEMS_SELECT,
  MODIFIER_SELECT,
  MODIFIER_GROUP_WITH_MODIFIERS_SELECT,
  MENU_ITEM_PRICING_SELECT
} from '../selectors/menu.selectors';
import { ErrorInterceptor } from '../interceptors/error.interceptor';
import { createAuditUtil } from '../util/audit.util';
import { 
  MenuItemResponse, 
  ModifierGroupResponse,
  CategoryResponse,
  CategoryWithItemsResponse,
  ModifierResponse,
  ModifierGroupWithModifiersResponse,
  MenuItemPricingResponse
} from '../types/menu-responses';
import { ValidateBody, ValidateQuery, ValidateParams } from '../decorators/validation.decorator';
import {
  CreateMenuItemSchema,
  UpdateMenuItemSchema,
  MenuItemQuerySchema,
  MenuItemParamsSchema,
  AttachModifierSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryParamsSchema,
  ReorderCategoriesSchema,
  CategoryItemAssignmentSchema,
  CategoryItemParamsSchema,
  CreateModifierGroupSchema,
  UpdateModifierGroupSchema,
  ModifierGroupParamsSchema,
  CreateModifierSchema,
  UpdateModifierSchema,
  ModifierParamsSchema,
  UpdateMenuItemPricingSchema,
  MenuItemModifierParamsSchema
} from '../schemas/menu.schemas';

@Controller()
@UseInterceptors(ErrorInterceptor)
export class MenuController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/menu/items')
  async getMenuItems(@ValidateQuery(MenuItemQuerySchema) q: MenuItemQueryDto): Promise<MenuItemResponse[]> {
    const where = makeWhere(parseScope(q as Record<string, unknown>)); // supports region/country/storeId
    const storeWhere: Record<string, unknown> = (where.store as Record<string, unknown>) ?? {};
    
    const results = await this.prisma.menuItem.findMany({
      where: {
        Store: storeWhere,
      },
      select: MENU_ITEM_SELECT,
      orderBy: { name: 'asc' },
      take: q.take || 100,
      skip: q.skip || 0,
    });

    return results.map(r => ({ ...r, price: Number(r.price ?? 0) }));
  }

  @Post('/menu/items')
  async createMenuItem(@ValidateBody(CreateMenuItemSchema) body: CreateMenuItemDto): Promise<ApiResponse<MenuItemResponse>> {
    const { name, price, storeId, active = true } = body;

    // Verify store exists
    const store = await this.prisma.store.findUnique({
      where: { id: storeId }
    });
    if (!store) {
      return ApiResponseBuilder.notFound('Store', storeId);
    }

    // Check for duplicate name in the same store
    const existingItem = await this.prisma.menuItem.findFirst({
      where: { 
        name: { equals: name },
        storeId: storeId
      }
    });
    if (existingItem) {
      return ApiResponseBuilder.conflict('Menu item with this name already exists in this store');
    }

    const item = await this.prisma.menuItem.create({
      data: {
        name,
        price,
        storeId,
        active,
      },
      select: MENU_ITEM_SELECT
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntryWithTelemetry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'MenuItem',
      entityId: item.id,
      action: 'CREATE',
      newData: { name, price: Number(price), storeId, active },
      metadata: { source: 'admin_dashboard' }
    }, {
      eventType: 'menu_item_created',
      properties: {
        itemId: item.id,
        itemName: name,
        storeId,
        price: Number(price)
      }
    });

    return ApiResponseBuilder.success({ ...item, price: Number(item.price ?? 0) });
  }

  @Get('/menu/modifier-groups')
  async getModifierGroups(): Promise<ApiResponse<ModifierGroupResponse[]>> {
    const groups = await this.prisma.modifierGroup.findMany({
      where: { active: true },
      select: MODIFIER_GROUP_SELECT,
      orderBy: { name: 'asc' },
    });

    return ApiResponseBuilder.success(groups);
  }



  @Get('/menu/items/:id/modifiers')
  async getItemModifiers(@Param('id') itemId: string): Promise<ApiResponse<ModifierGroupResponse[]>> {
    // Single query to get menu item with its modifiers
    const menuItemWithModifiers = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      select: MENU_ITEM_WITH_MODIFIERS_SELECT
    });

    if (!menuItemWithModifiers) {
      return ApiResponseBuilder.errorWithData('Menu item not found', []);
    }

    const attachedModifiers = menuItemWithModifiers.modifiers.map(m => m.modifierGroup);
    return ApiResponseBuilder.success(attachedModifiers);
  }

  @Post('/menu/items/:id/modifiers')
  async attachModifier(
    @ValidateParams(MenuItemParamsSchema) params: { id: string },
    @ValidateBody(AttachModifierSchema) body: AttachModifierDto
  ): Promise<ApiResponse<null>> {
    const { id: itemId } = params;
    const { modifierGroupId } = body;

    // Verify menu item exists
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: itemId }
    });
    if (!menuItem) {
      return ApiResponseBuilder.notFound('Menu item', itemId);
    }

    // Verify modifier group exists
    const modifierGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: modifierGroupId }
    });
    if (!modifierGroup) {
      return ApiResponseBuilder.notFound('Modifier group', modifierGroupId);
    }

    // Check if relationship already exists
    const existing = await this.prisma.menuItemModifier.findUnique({
      where: {
        menuItemId_modifierGroupId: {
          menuItemId: itemId,
          modifierGroupId: modifierGroupId
        }
      }
    });
    if (existing) {
      return ApiResponseBuilder.conflict('Modifier group already attached to this item');
    }

    // Create the relationship
    const relationship = await this.prisma.menuItemModifier.create({
      data: {
        menuItemId: itemId,
        modifierGroupId: modifierGroupId,
      }
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntryWithTelemetry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'MenuItemModifier',
      entityId: relationship.id,
      action: 'CREATE',
      newData: { menuItemId: itemId, modifierGroupId },
      metadata: { source: 'admin_dashboard', itemName: menuItem.name, groupName: modifierGroup.name }
    }, {
      eventType: 'modifier_attached',
      properties: {
        itemId,
        itemName: menuItem.name,
        modifierGroupId,
        groupName: modifierGroup.name
      }
    });

    return ApiResponseBuilder.success(null);
  }

  @Delete('/menu/items/:id/modifiers/:groupId')
  async detachModifier(
    @Param('id') itemId: string,
    @Param('groupId') groupId: string
  ): Promise<ApiResponse<null>> {
    // Verify the relationship exists
    const existing = await this.prisma.menuItemModifier.findUnique({
      where: {
        menuItemId_modifierGroupId: {
          menuItemId: itemId,
          modifierGroupId: groupId
        }
      }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Modifier group not attached to this item');
    }

    // Get additional data for audit trail
    const [menuItem, modifierGroup] = await Promise.all([
      this.prisma.menuItem.findUnique({ where: { id: itemId }, select: { name: true } }),
      this.prisma.modifierGroup.findUnique({ where: { id: groupId }, select: { name: true } })
    ]);

    // Remove the relationship
    await this.prisma.menuItemModifier.delete({
      where: {
        menuItemId_modifierGroupId: {
          menuItemId: itemId,
          modifierGroupId: groupId
        }
      }
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntryWithTelemetry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'MenuItemModifier',
      entityId: existing.id,
      action: 'DELETE',
      oldData: { menuItemId: itemId, modifierGroupId: groupId },
      metadata: { source: 'admin_dashboard', itemName: menuItem?.name, groupName: modifierGroup?.name }
    }, {
      eventType: 'modifier_detached',
      properties: {
        itemId,
        itemName: menuItem?.name,
        modifierGroupId: groupId,
        groupName: modifierGroup?.name
      }
    });

    return ApiResponseBuilder.success(null);
  }

  // Modifier Group CRUD endpoints
  @Post('/menu/modifier-groups')
  async createModifierGroup(@Body() body: CreateModifierGroupDto): Promise<ApiResponse<ModifierGroupResponse>> {
    const { name, description, minSelection = 0, maxSelection, required = false, active = true } = body;

    // Validate min/max selection rules
    if (maxSelection !== undefined && maxSelection < minSelection) {
      return ApiResponseBuilder.error('Maximum selection cannot be less than minimum selection');
    }

    // Check if modifier group with same name already exists
    const existing = await this.prisma.modifierGroup.findFirst({
      where: { name: { equals: name } }
    });
    if (existing) {
      return ApiResponseBuilder.error('Modifier group with this name already exists');
    }

    const group = await this.prisma.modifierGroup.create({
      data: {
        name,
        description,
        minSelection,
        maxSelection,
        required,
        active,
      },
      select: MODIFIER_GROUP_SELECT
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntryWithTelemetry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'ModifierGroup',
      entityId: group.id,
      action: 'CREATE',
      newData: { name, description, minSelection, maxSelection, required, active },
      metadata: { source: 'admin_dashboard' }
    }, {
      eventType: 'modifier_group_created',
      properties: {
        groupId: group.id,
        groupName: name,
        minSelection,
        maxSelection,
        required
      }
    });

    return ApiResponseBuilder.success(group);
  }

  @Patch('/menu/modifier-groups/:id')
  async updateModifierGroup(
    @Param('id') groupId: string,
    @Body() body: UpdateModifierGroupDto
  ): Promise<ApiResponse<ModifierGroupResponse>> {
    // Verify modifier group exists
    const existing = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Modifier group not found');
    }

    // If updating name, check for duplicates
    if (body.name && body.name !== existing.name) {
      const duplicate = await this.prisma.modifierGroup.findFirst({
        where: { 
          name: { equals: body.name },
          id: { not: groupId }
        }
      });
      if (duplicate) {
        return ApiResponseBuilder.error('Modifier group with this name already exists');
      }
    }

    const group = await this.prisma.modifierGroup.update({
      where: { id: groupId },
      data: body,
      select: MODIFIER_GROUP_SELECT
    });

    return ApiResponseBuilder.success(group);
  }

  @Delete('/menu/modifier-groups/:id')
  async deleteModifierGroup(@Param('id') groupId: string): Promise<ApiResponse<null>> {
    // Verify modifier group exists
    const existing = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Modifier group not found');
    }

    await this.prisma.modifierGroup.delete({
      where: { id: groupId }
    });

    return ApiResponseBuilder.success(null);
  }

  // Individual Modifier CRUD endpoints
  @Get('/menu/modifier-groups/:groupId/modifiers')
  async getModifiers(@Param('groupId') groupId: string): Promise<ApiResponse<ModifierResponse[]>> {
    // Verify modifier group exists
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      return ApiResponseBuilder.error('Modifier group not found');
    }

    const modifiers = await this.prisma.modifier.findMany({
      where: { modifierGroupId: groupId },
      select: MODIFIER_SELECT,
      orderBy: { name: 'asc' },
    });

    const modifiersWithPrice = modifiers.map(modifier => ({
      ...modifier,
      priceAdjustment: Number(modifier.priceAdjustment ?? 0)
    }));

    return ApiResponseBuilder.success(modifiersWithPrice);
  }

  @Post('/menu/modifier-groups/:groupId/modifiers')
  async createModifier(
    @Param('groupId') groupId: string,
    @Body() body: CreateModifierDto
  ): Promise<ApiResponse<ModifierResponse>> {
    const { name, priceAdjustment = 0, active = true } = body;

    // Verify modifier group exists
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      return ApiResponseBuilder.error('Modifier group not found');
    }

    // Check if modifier with same name already exists in this group
    const existing = await this.prisma.modifier.findFirst({
      where: { 
        modifierGroupId: groupId,
        name: { equals: name }
      }
    });
    if (existing) {
      return ApiResponseBuilder.error('Modifier with this name already exists in this group');
    }

    const modifier = await this.prisma.modifier.create({
      data: {
        name,
        priceAdjustment,
        active,
        modifierGroupId: groupId,
      },
      select: MODIFIER_SELECT
    });

    return ApiResponseBuilder.success({
      ...modifier,
      priceAdjustment: Number(modifier.priceAdjustment ?? 0)
    });
  }

  @Patch('/menu/modifier-groups/:groupId/modifiers/:modifierId')
  async updateModifier(
    @Param('groupId') groupId: string,
    @Param('modifierId') modifierId: string,
    @Body() body: UpdateModifierDto
  ): Promise<ApiResponse<ModifierResponse>> {
    // Verify modifier exists and belongs to the group
    const existing = await this.prisma.modifier.findFirst({
      where: { 
        id: modifierId,
        modifierGroupId: groupId
      }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Modifier not found in this group');
    }

    // If updating name, check for duplicates within the group
    if (body.name && body.name !== existing.name) {
      const duplicate = await this.prisma.modifier.findFirst({
        where: { 
          modifierGroupId: groupId,
          name: { equals: body.name },
          id: { not: modifierId }
        }
      });
      if (duplicate) {
        return ApiResponseBuilder.error('Modifier with this name already exists in this group');
      }
    }

    const modifier = await this.prisma.modifier.update({
      where: { id: modifierId },
      data: body,
      select: MODIFIER_SELECT
    });

    return ApiResponseBuilder.success({
      ...modifier,
      priceAdjustment: Number(modifier.priceAdjustment ?? 0)
    });
  }

  @Delete('/menu/modifier-groups/:groupId/modifiers/:modifierId')
  async deleteModifier(
    @Param('groupId') groupId: string,
    @Param('modifierId') modifierId: string
  ): Promise<ApiResponse<null>> {
    // Verify modifier exists and belongs to the group
    const existing = await this.prisma.modifier.findFirst({
      where: { 
        id: modifierId,
        modifierGroupId: groupId
      }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Modifier not found in this group');
    }

    await this.prisma.modifier.delete({
      where: { id: modifierId }
    });

    return ApiResponseBuilder.success(null);
  }

  // Category endpoints
  @Get('/menu/categories')
  async getCategories(): Promise<ApiResponse<CategoryResponse[]>> {
    const categories = await this.prisma.category.findMany({
      select: {
        ...CATEGORY_SELECT,
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
    });

    const categoriesWithCount = categories.map(category => ({
      ...category,
      itemCount: category._count.items
    }));

    return ApiResponseBuilder.success(categoriesWithCount);
  }

  @Get('/menu/categories/:id')
  async getCategory(@Param('id') categoryId: string): Promise<ApiResponse<CategoryWithItemsResponse>> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: CATEGORY_WITH_ITEMS_SELECT
    });

    if (!category) {
      return ApiResponseBuilder.error('Category not found');
    }

    // Transform the response to match expected format
    const categoryWithItems = {
      ...category,
      items: category.items.map(item => ({
        menuItem: {
          ...item.menuItem,
          price: Number(item.menuItem.price ?? 0)
        }
      }))
    };

    return ApiResponseBuilder.success(categoryWithItems);
  }

  @Post('/menu/categories')
  async createCategory(@Body() body: CreateCategoryDto): Promise<ApiResponse<CategoryResponse>> {
    const { name, description, sortOrder = 0, active = true } = body;

    // Check if category with same name already exists
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: name } }
    });
    if (existing) {
      return ApiResponseBuilder.error('Category with this name already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        description,
        sortOrder,
        active,
      },
      select: CATEGORY_SELECT
    });

    return ApiResponseBuilder.success(category);
  }

  @Patch('/menu/categories/:id')
  async updateCategory(
    @Param('id') categoryId: string,
    @Body() body: UpdateCategoryDto
  ): Promise<ApiResponse<CategoryResponse>> {
    // Verify category exists
    const existing = await this.prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Category not found');
    }

    // If updating name, check for duplicates
    if (body.name && body.name !== existing.name) {
      const duplicate = await this.prisma.category.findFirst({
        where: { 
          name: { equals: body.name },
          id: { not: categoryId }
        }
      });
      if (duplicate) {
        return ApiResponseBuilder.error('Category with this name already exists');
      }
    }

    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: body,
      select: CATEGORY_SELECT
    });

    return ApiResponseBuilder.success(category);
  }

  @Delete('/menu/categories/:id')
  async deleteCategory(@Param('id') categoryId: string): Promise<ApiResponse<null>> {
    // Verify category exists
    const existing = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        _count: {
          select: {
            items: true
          }
        }
      }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Category not found');
    }

    // Check if category has items
    if (existing._count.items > 0) {
      return ApiResponseBuilder.error('Cannot delete category that contains menu items. Remove items first.');
    }

    await this.prisma.category.delete({
      where: { id: categoryId }
    });

    return ApiResponseBuilder.success(null);
  }

  @Put('/menu/categories/reorder')
  async reorderCategories(@Body() body: ReorderCategoriesDto): Promise<ApiResponse<null>> {
    const { categoryIds } = body;

    // Verify all categories exist
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true }
    });

    if (categories.length !== categoryIds.length) {
      return ApiResponseBuilder.error('One or more categories not found');
    }

    // Update sort order for each category
    const updatePromises = categoryIds.map((categoryId, index) =>
      this.prisma.category.update({
        where: { id: categoryId },
        data: { sortOrder: index }
      })
    );

    await Promise.all(updatePromises);

    return ApiResponseBuilder.success(null);
  }

  // Category-Item relationship endpoints
  @Post('/menu/categories/:id/items')
  async assignItemToCategory(
    @Param('id') categoryId: string,
    @Body() body: CategoryItemAssignmentDto
  ): Promise<ApiResponse<null>> {
    const { menuItemId } = body;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!category) {
      return ApiResponseBuilder.error('Category not found');
    }

    // Verify menu item exists
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId }
    });
    if (!menuItem) {
      return ApiResponseBuilder.error('Menu item not found');
    }

    // Check if relationship already exists
    const existing = await this.prisma.menuItemCategory.findUnique({
      where: {
        menuItemId_categoryId: {
          menuItemId: menuItemId,
          categoryId: categoryId
        }
      }
    });
    if (existing) {
      return ApiResponseBuilder.error('Menu item is already assigned to this category');
    }

    // Create the relationship
    await this.prisma.menuItemCategory.create({
      data: {
        menuItemId: menuItemId,
        categoryId: categoryId,
      }
    });

    return ApiResponseBuilder.success(null);
  }

  @Delete('/menu/categories/:id/items/:itemId')
  async removeItemFromCategory(
    @Param('id') categoryId: string,
    @Param('itemId') menuItemId: string
  ): Promise<ApiResponse<null>> {
    // Verify the relationship exists
    const existing = await this.prisma.menuItemCategory.findUnique({
      where: {
        menuItemId_categoryId: {
          menuItemId: menuItemId,
          categoryId: categoryId
        }
      }
    });
    if (!existing) {
      return ApiResponseBuilder.error('Menu item is not assigned to this category');
    }

    // Remove the relationship
    await this.prisma.menuItemCategory.delete({
      where: {
        menuItemId_categoryId: {
          menuItemId: menuItemId,
          categoryId: categoryId
        }
      }
    });

    return ApiResponseBuilder.success(null);
  }

  // Pricing endpoints
  @Get('/menu/pricing')
  async getMenuPricing(@Query() q: MenuItemQueryDto): Promise<ApiResponse<MenuItemPricingResponse[]>> {
    const where = makeWhere(parseScope(q as Record<string, unknown>));
    const storeWhere: Record<string, unknown> = (where.store as Record<string, unknown>) ?? {};
    
    const results = await this.prisma.menuItem.findMany({
      where: {
        Store: storeWhere,
        active: true,
      },
      select: MENU_ITEM_PRICING_SELECT,
      orderBy: { name: 'asc' },
      take: q.take || 100,
    });

    return ApiResponseBuilder.success(
      results.map(item => ({
        ...item,
        basePrice: Number(item.basePrice ?? 0),
        priceOverrides: item.PriceOverrides.map(override => ({
          ...override,
          price: Number(override.price ?? 0)
        }))
      }))
    );
  }

  @Patch('/menu/pricing/:itemId')
  async updateMenuItemPricing(
    @Param('itemId') itemId: string,
    @Body() body: UpdateMenuItemPricingDto
  ): Promise<ApiResponse<MenuItemPricingResponse>> {
    const { basePrice } = body;

    // Verify menu item exists
    const existingItem = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
        basePrice: true,
        storeId: true,
      }
    });

    if (!existingItem) {
      return ApiResponseBuilder.error('Menu item not found');
    }

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    const oldData = {
      basePrice: Number(existingItem.basePrice ?? 0)
    };
    const newData = {
      basePrice: basePrice
    };

    // Update the menu item
    const updatedItem = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: { basePrice: basePrice },
      select: MENU_ITEM_PRICING_SELECT
    });

    // Create audit entry
    await auditUtil.createAuditEntryWithTelemetry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'MenuItem',
      entityId: itemId,
      action: 'UPDATE_PRICING',
      oldData,
      newData,
      metadata: { source: 'admin_dashboard', itemName: existingItem.name }
    }, {
      eventType: 'menu_item_pricing_updated',
      properties: {
        itemId,
        itemName: existingItem.name,
        oldPrice: Number(existingItem.basePrice ?? 0),
        newPrice: basePrice
      }
    });

    return ApiResponseBuilder.success({
      ...updatedItem,
      basePrice: Number(updatedItem.basePrice ?? 0),
      priceOverrides: updatedItem.PriceOverrides.map(override => ({
        ...override,
        price: Number(override.price ?? 0)
      }))
    });
  }
}