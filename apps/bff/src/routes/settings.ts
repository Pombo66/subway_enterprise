import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { 
  CreateUserDto, 
  UpdateUserDto,
  AuditLogQueryDto,
  UpdateFeatureFlagDto
} from '../dto/settings.dto';
import { ApiResponse, ApiResponseBuilder } from '../types/api-response';
import { 
  USER_SELECT, 
  AUDIT_ENTRY_SELECT,
  FEATURE_FLAG_SELECT
} from '../selectors/settings.selectors';
import { ErrorInterceptor } from '../interceptors/error.interceptor';
import { createAuditUtil } from '../util/audit.util';
import { createComprehensiveLoggingUtil } from '../util/comprehensive-logging.util';
import { 
  UserResponse, 
  AuditEntryResponse,
  FeatureFlagResponse,
  AuditLogPaginatedResponse
} from '../types/settings-responses';

@Controller()
@UseInterceptors(ErrorInterceptor)
export class SettingsController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  // Users & Roles CRUD endpoints
  @Get('/settings/users')
  async getUsers(): Promise<ApiResponse<UserResponse[]>> {
    const users = await this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: [
        { email: 'asc' }
      ],
    });

    return ApiResponseBuilder.success(users);
  }

  @Get('/settings/users/:id')
  async getUser(@Param('id') userId: string): Promise<ApiResponse<UserResponse>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT
    });

    if (!user) {
      return ApiResponseBuilder.error('User not found');
    }

    return ApiResponseBuilder.success(user);
  }

  @Post('/settings/users')
  async createUser(@Body() body: CreateUserDto): Promise<ApiResponse<UserResponse>> {
    const { email, role, firstName, lastName, active = true } = body;

    // Check if user with same email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email }
    });
    if (existing) {
      return ApiResponseBuilder.error('User with this email already exists');
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'STAFF'];
    if (!validRoles.includes(role)) {
      return ApiResponseBuilder.error('Invalid role. Must be one of: ADMIN, MANAGER, STAFF');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        role,
        firstName,
        lastName,
        active,
      },
      select: USER_SELECT
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'User',
      entityId: user.id,
      action: 'CREATE',
      newData: {
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        active: user.active
      }
    });

    return ApiResponseBuilder.success(user);
  }

  @Patch('/settings/users/:id')
  async updateUser(
    @Param('id') userId: string,
    @Body() body: UpdateUserDto
  ): Promise<ApiResponse<UserResponse>> {
    // Verify user exists
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT
    });
    if (!existing) {
      return ApiResponseBuilder.error('User not found');
    }

    // If updating email, check for duplicates
    if (body.email && body.email !== existing.email) {
      const duplicate = await this.prisma.user.findUnique({
        where: { email: body.email }
      });
      if (duplicate) {
        return ApiResponseBuilder.error('User with this email already exists');
      }
    }

    // Validate role if provided
    if (body.role) {
      const validRoles = ['ADMIN', 'MANAGER', 'STAFF'];
      if (!validRoles.includes(body.role)) {
        return ApiResponseBuilder.error('Invalid role. Must be one of: ADMIN, MANAGER, STAFF');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: body,
      select: USER_SELECT
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'User',
      entityId: userId,
      action: 'UPDATE',
      oldData: {
        email: existing.email,
        role: existing.role,
        firstName: existing.firstName,
        lastName: existing.lastName,
        active: existing.active
      },
      newData: {
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        active: user.active
      }
    });

    return ApiResponseBuilder.success(user);
  }

  @Delete('/settings/users/:id')
  async deleteUser(@Param('id') userId: string): Promise<ApiResponse<null>> {
    // Verify user exists
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT
    });
    if (!existing) {
      return ApiResponseBuilder.error('User not found');
    }

    // Check if user has orders (prevent deletion if they do)
    const orderCount = await this.prisma.order.count({
      where: { userId: userId }
    });
    if (orderCount > 0) {
      return ApiResponseBuilder.error('Cannot delete user with existing orders. Deactivate the user instead.');
    }

    await this.prisma.user.delete({
      where: { id: userId }
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'User',
      entityId: userId,
      action: 'DELETE',
      oldData: {
        email: existing.email,
        role: existing.role,
        firstName: existing.firstName,
        lastName: existing.lastName,
        active: existing.active
      }
    });

    return ApiResponseBuilder.success(null);
  }

  // Audit Log endpoints
  @Get('/settings/audit')
  async getAuditLog(@Query() query: AuditLogQueryDto): Promise<ApiResponse<AuditLogPaginatedResponse>> {
    const { search, entity, action, actor, page = 1, limit = 50 } = query;
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (search) {
      const searchTerm = search.toLowerCase();
      where.OR = [
        { actor: { contains: searchTerm } },
        { entity: { contains: searchTerm } },
        { entityId: { contains: searchTerm } },
        { action: { contains: searchTerm } },
      ];
    }

    if (entity) {
      where.entity = entity;
    }

    if (action) {
      where.action = action;
    }

    if (actor) {
      where.actor = { contains: actor };
    }

    // Handle pagination
    const skip = (page - 1) * limit;

    const [entries, totalCount] = await Promise.all([
      this.prisma.auditEntry.findMany({
        where,
        select: AUDIT_ENTRY_SELECT,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditEntry.count({ where }),
    ]);

    const response: AuditLogPaginatedResponse = {
      entries,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };

    return ApiResponseBuilder.success(response);
  }

  // Feature Flags endpoints
  @Get('/settings/flags')
  async getFeatureFlags(): Promise<ApiResponse<FeatureFlagResponse[]>> {
    const flags = await this.prisma.featureFlag.findMany({
      select: FEATURE_FLAG_SELECT,
      orderBy: { key: 'asc' },
    });

    return ApiResponseBuilder.success(flags);
  }

  @Get('/settings/flags/:key')
  async getFeatureFlag(@Param('key') key: string): Promise<ApiResponse<FeatureFlagResponse>> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      select: FEATURE_FLAG_SELECT
    });

    if (!flag) {
      return ApiResponseBuilder.error('Feature flag not found');
    }

    return ApiResponseBuilder.success(flag);
  }

  @Patch('/settings/flags/:key')
  async updateFeatureFlag(
    @Param('key') key: string,
    @Body() body: UpdateFeatureFlagDto
  ): Promise<ApiResponse<FeatureFlagResponse>> {
    const { enabled, description } = body;

    // Verify feature flag exists
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key },
      select: FEATURE_FLAG_SELECT
    });
    if (!existing) {
      return ApiResponseBuilder.error('Feature flag not found');
    }

    const updateData: Record<string, unknown> = { enabled };
    if (description !== undefined) {
      updateData.description = description;
    }

    const flag = await this.prisma.featureFlag.update({
      where: { key },
      data: updateData,
      select: FEATURE_FLAG_SELECT
    });

    // Create comprehensive audit trail and telemetry
    const loggingUtil = createComprehensiveLoggingUtil(this.prisma);
    await loggingUtil.logFeatureFlagChange({
      userId: 'system', // In a real app, this would come from the authenticated user
      flagId: flag.id,
      flagKey: key,
      operation: existing.enabled !== flag.enabled ? 'TOGGLE' : 'UPDATE',
      oldValue: existing.enabled,
      newValue: flag.enabled,
      metadata: {
        source: 'admin_dashboard',
        descriptionChanged: existing.description !== flag.description,
        oldDescription: existing.description,
        newDescription: flag.description
      }
    });

    return ApiResponseBuilder.success(flag);
  }

  @Post('/settings/flags')
  async createFeatureFlag(@Body() body: { key: string; enabled?: boolean; description?: string }): Promise<ApiResponse<FeatureFlagResponse>> {
    const { key, enabled = false, description } = body;

    // Check if feature flag with same key already exists
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key }
    });
    if (existing) {
      return ApiResponseBuilder.error('Feature flag with this key already exists');
    }

    const flag = await this.prisma.featureFlag.create({
      data: {
        key,
        enabled,
        description,
      },
      select: FEATURE_FLAG_SELECT
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'FeatureFlag',
      entityId: flag.id,
      action: 'CREATE',
      newData: {
        key: flag.key,
        enabled: flag.enabled,
        description: flag.description
      }
    });

    return ApiResponseBuilder.success(flag);
  }

  @Delete('/settings/flags/:key')
  async deleteFeatureFlag(@Param('key') key: string): Promise<ApiResponse<null>> {
    // Verify feature flag exists
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key },
      select: FEATURE_FLAG_SELECT
    });
    if (!existing) {
      return ApiResponseBuilder.error('Feature flag not found');
    }

    await this.prisma.featureFlag.delete({
      where: { key }
    });

    // Create audit trail
    const auditUtil = createAuditUtil(this.prisma);
    await auditUtil.createAuditEntry({
      actor: 'system', // In a real app, this would come from the authenticated user
      entity: 'FeatureFlag',
      entityId: existing.id,
      action: 'DELETE',
      oldData: {
        key: existing.key,
        enabled: existing.enabled,
        description: existing.description
      }
    });

    return ApiResponseBuilder.success(null);
  }
}