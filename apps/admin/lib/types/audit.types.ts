import { z } from 'zod';

export const AuditActionSchema = z.enum(['CREATE', 'UPDATE', 'DELETE']);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditEntitySchema = z.enum(['USER', 'STORE', 'MENU_ITEM', 'ORDER', 'FEATURE_FLAG', 'MODIFIER_GROUP']);
export type AuditEntity = z.infer<typeof AuditEntitySchema>;

export const AuditEntrySchema = z.object({
  id: z.string(),
  actor: z.string(),
  entity: AuditEntitySchema,
  entityId: z.string(),
  action: AuditActionSchema,
  diff: z.string().nullable(),
  timestamp: z.string().datetime(),
});

export const AuditQuerySchema = z.object({
  search: z.string().optional(),
  entity: AuditEntitySchema.optional(),
  action: AuditActionSchema.optional(),
  actor: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;
export type AuditQuery = z.infer<typeof AuditQuerySchema>;

export interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditDiff {
  field: string;
  oldValue: any;
  newValue: any;
}