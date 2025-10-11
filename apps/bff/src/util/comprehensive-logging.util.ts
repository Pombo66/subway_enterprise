import { PrismaClient } from '@prisma/client';
import { createAuditUtil, AuditContext, TelemetryEventData } from './audit.util';

export interface UserActionContext {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export interface ComprehensiveLogEntry {
  auditEntry: AuditContext;
  telemetryEvent: TelemetryEventData;
  userAction: UserActionContext;
}

export class ComprehensiveLoggingUtil {
  private auditUtil: ReturnType<typeof createAuditUtil>;

  constructor(private readonly prisma: PrismaClient) {
    this.auditUtil = createAuditUtil(prisma);
  }

  /**
   * Log a comprehensive user action with audit trail, telemetry, and user action logging
   */
  async logUserAction(context: {
    // User context
    userId: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    
    // Action context
    action: string;
    entity: string;
    entityId: string;
    
    // Data context
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    
    // Additional metadata
    metadata?: Record<string, unknown>;
    
    // Telemetry specific properties
    telemetryEventType?: string;
    telemetryProperties?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // Create audit entry with telemetry
      await this.auditUtil.createAuditEntryWithTelemetry({
        actor: context.userId,
        entity: context.entity,
        entityId: context.entityId,
        action: context.action,
        oldData: context.oldData,
        newData: context.newData,
        metadata: {
          ...context.metadata,
          userAgent: context.userAgent,
          ipAddress: context.ipAddress,
          sessionId: context.sessionId,
        }
      }, {
        eventType: context.telemetryEventType || 'user_action',
        userId: context.userId,
        sessionId: context.sessionId,
        properties: {
          action: context.action,
          entity: context.entity,
          entityId: context.entityId,
          userAgent: context.userAgent,
          ipAddress: context.ipAddress,
          ...context.telemetryProperties,
        }
      });

      // Log to console for development/debugging
      console.log(`[USER_ACTION] ${context.userId} performed ${context.action} on ${context.entity}:${context.entityId}`, {
        timestamp: new Date().toISOString(),
        sessionId: context.sessionId,
        metadata: context.metadata,
      });

    } catch (error) {
      console.error('Failed to log comprehensive user action:', error);
      
      // Fallback: at least try to emit a telemetry event about the logging failure
      try {
        await this.auditUtil.emitTelemetryEvent({
          eventType: 'logging_error',
          userId: context.userId,
          sessionId: context.sessionId,
          properties: {
            error: error instanceof Error ? error.message : 'Unknown error',
            originalAction: context.action,
            originalEntity: context.entity,
            originalEntityId: context.entityId,
          }
        });
      } catch (fallbackError) {
        console.error('Failed to log even the fallback telemetry event:', fallbackError);
      }
    }
  }

  /**
   * Log a CRUD operation with standardized action names
   */
  async logCrudOperation(context: {
    userId: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    entity: string;
    entityId: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logUserAction({
      ...context,
      action: context.operation,
      telemetryEventType: `${context.entity.toLowerCase()}_${context.operation.toLowerCase()}`,
      telemetryProperties: {
        crudOperation: context.operation,
        hasOldData: !!context.oldData,
        hasNewData: !!context.newData,
      }
    });
  }

  /**
   * Log a feature flag change with specific telemetry
   */
  async logFeatureFlagChange(context: {
    userId: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    flagId: string;
    flagKey: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
    oldValue?: boolean;
    newValue?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logUserAction({
      userId: context.userId,
      sessionId: context.sessionId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      action: `FEATURE_FLAG_${context.operation}`,
      entity: 'FeatureFlag',
      entityId: context.flagId,
      oldData: context.oldValue !== undefined ? { enabled: context.oldValue } : undefined,
      newData: context.newValue !== undefined ? { enabled: context.newValue } : undefined,
      metadata: {
        ...context.metadata,
        flagKey: context.flagKey,
      },
      telemetryEventType: 'feature_flag_changed',
      telemetryProperties: {
        flagKey: context.flagKey,
        operation: context.operation,
        oldValue: context.oldValue,
        newValue: context.newValue,
      }
    });
  }

  /**
   * Log a pricing change with specific context
   */
  async logPricingChange(context: {
    userId: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    itemId: string;
    itemName?: string;
    storeId?: string;
    oldPrice?: number;
    newPrice: number;
    priceType: 'BASE' | 'OVERRIDE';
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logUserAction({
      userId: context.userId,
      sessionId: context.sessionId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      action: `PRICING_${context.priceType}_UPDATE`,
      entity: 'MenuItem',
      entityId: context.itemId,
      oldData: context.oldPrice !== undefined ? { price: context.oldPrice } : undefined,
      newData: { price: context.newPrice },
      metadata: {
        ...context.metadata,
        itemName: context.itemName,
        storeId: context.storeId,
        priceType: context.priceType,
      },
      telemetryEventType: 'pricing_changed',
      telemetryProperties: {
        itemName: context.itemName,
        storeId: context.storeId,
        priceType: context.priceType,
        oldPrice: context.oldPrice,
        newPrice: context.newPrice,
        priceChange: context.oldPrice ? context.newPrice - context.oldPrice : null,
      }
    });
  }
}

// Helper function to create comprehensive logging utility instance
export function createComprehensiveLoggingUtil(prisma: PrismaClient): ComprehensiveLoggingUtil {
  return new ComprehensiveLoggingUtil(prisma);
}