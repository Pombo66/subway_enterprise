import { Body, Controller, Delete, Get, Inject, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';
import { CreateMenuItemDto, AttachModifierDto, MenuItemQueryDto } from '../dto/menu.dto';
import { ApiResponse, ApiResponseBuilder } from '../types/api-response';
import { MENU_ITEM_SELECT, MODIFIER_GROUP_SELECT, MENU_ITEM_WITH_MODIFIERS_SELECT } from '../selectors/menu.selectors';
import { ErrorInterceptor } from '../interceptors/error.interceptor';
import { 
  MenuItemResponse, 
  ModifierGroupResponse, 
  MenuItemWithModifiersResponse 
} from '../types/menu-responses';

@Controller()
@UseInterceptors(ErrorInterceptor)
export class MenuController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/menu/items')
  async getMenuItems(@Query() q: MenuItemQueryDto): Promise<MenuItemResponse[]> {
    const where = makeWhere(parseScope(q)); // supports region/country/storeId
    const storeWhere: Record<string, unknown> = where.store ?? {};
    
    const results = await this.prisma.menuItem.findMany({
      where: {
        Store: storeWhere,
      },
      select: MENU_ITEM_SELECT,
      orderBy: { name: 'asc' },
      take: q.take || 100,
    });

    return results.map(r => ({ ...r, price: Number(r.price ?? 0) }));
  }

  @Post('/menu/items')
  async createMenuItem(@Body() body: CreateMenuItemDto): Promise<ApiResponse<MenuItemResponse>> {
    const { name, price, storeId, active = true } = body;

    // Verify store exists
    const store = await this.prisma.store.findUnique({
      where: { id: storeId }
    });
    if (!store) {
      return ApiResponseBuilder.error('Store not found');
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
    @Param('id') itemId: string,
    @Body() body: AttachModifierDto
  ): Promise<ApiResponse<null>> {
    const { modifierGroupId } = body;

    // Verify menu item exists
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: itemId }
    });
    if (!menuItem) {
      return ApiResponseBuilder.error('Menu item not found');
    }

    // Verify modifier group exists
    const modifierGroup = await this.prisma.modifierGroup.findUnique({
      where: { id: modifierGroupId }
    });
    if (!modifierGroup) {
      return ApiResponseBuilder.error('Modifier group not found');
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
      return ApiResponseBuilder.error('Modifier group already attached to this item');
    }

    // Create the relationship
    await this.prisma.menuItemModifier.create({
      data: {
        menuItemId: itemId,
        modifierGroupId: modifierGroupId,
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

    // Remove the relationship
    await this.prisma.menuItemModifier.delete({
      where: {
        menuItemId_modifierGroupId: {
          menuItemId: itemId,
          modifierGroupId: groupId
        }
      }
    });

    return ApiResponseBuilder.success(null);
  }
}