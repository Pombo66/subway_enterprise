import { PrismaClient } from '@prisma/client';

export interface AuditContext {
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TelemetryEventData {
  eventType: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
}

export class AuditUtil {
  constructor(private readonly prisma: PrismaClient) {}

  async createAuditEntry(context: AuditContext): Promise<void> {
    try {
      let diff: string | null = null;

      // Generate diff if both old and new data are provided
      if (context.oldData && context.newData) {
        const changes: Record<string, { from: unknown; to: unknown }> = {};
        
        // Check for changes in new data
        for (const [key, newValue] of Object.entries(context.newData)) {
          const oldValue = context.oldData[key];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes[key] = { from: oldValue, to: newValue };
          }
        }

        // Check for removed fields
        for (const [key, oldValue] of Object.entries(context.oldData)) {
          if (!(key in context.newData)) {
            changes[key] = { from: oldValue, to: undefined };
          }
        }

        if (Object.keys(changes).length > 0) {
          diff = JSON.stringify(changes);
        }
      } else if (context.action === 'CREATE' && context.newData) {
        diff = JSON.stringify({ created: context.newData });
      } else if (context.action === 'DELETE' && context.oldData) {
        diff = JSON.stringify({ deleted: context.oldData });
      }

      await this.prisma.auditEntry.create({
        data: {
          actor: context.actor,
          entity: context.entity,
          entityId: context.entityId,
          action: context.action,
          diff: diff,
          timestamp: new Date(),
        },
      });

      // Emit telemetry event for audit trail
      await this.emitTelemetryEvent({
        eventType: 'audit_trail',
        userId: context.actor,
        properties: {
          entity: context.entity,
          entityId: context.entityId,
          action: context.action,
          timestamp: new Date().toISOString(),
          hasChanges: !!diff,
          metadata: context.metadata,
        },
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking the main operation
      console.error('Failed to create audit entry:', error);
    }
  }

  async emitTelemetryEvent(event: TelemetryEventData): Promise<void> {
    try {
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: event.eventType,
          userId: event.userId,
          sessionId: event.sessionId,
          properties: event.properties ? JSON.stringify(event.properties) : null,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking the main operation
      console.error('Failed to emit telemetry event:', error);
    }
  }

  async createAuditEntryWithTelemetry(
    context: AuditContext,
    telemetryEvent?: Partial<TelemetryEventData>
  ): Promise<void> {
    // Create audit entry
    await this.createAuditEntry(context);

    // Emit additional telemetry event if provided
    if (telemetryEvent) {
      await this.emitTelemetryEvent({
        eventType: telemetryEvent.eventType || 'user_action',
        userId: telemetryEvent.userId || context.actor,
        sessionId: telemetryEvent.sessionId,
        properties: {
          action: context.action,
          entity: context.entity,
          entityId: context.entityId,
          timestamp: new Date().toISOString(),
          ...telemetryEvent.properties,
        },
      });
    }
  }
}

// Helper function to create audit utility instance
export function createAuditUtil(prisma: PrismaClient): AuditUtil {
  return new AuditUtil(prisma);
}