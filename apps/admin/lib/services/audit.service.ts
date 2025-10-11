import { bff } from '../api';
import { 
  AuditEntry, 
  AuditQuery, 
  AuditResponse,
  AuditEntrySchema
} from '../types/audit.types';
import { z } from 'zod';

const AuditResponseSchema = z.object({
  entries: z.array(AuditEntrySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export class AuditService {
  static async getAuditEntries(query: AuditQuery): Promise<AuditResponse> {
    const searchParams = new URLSearchParams();
    
    if (query.search) searchParams.set('search', query.search);
    if (query.entity) searchParams.set('entity', query.entity);
    if (query.action) searchParams.set('action', query.action);
    if (query.actor) searchParams.set('actor', query.actor);
    if (query.startDate) searchParams.set('startDate', query.startDate);
    if (query.endDate) searchParams.set('endDate', query.endDate);
    searchParams.set('page', query.page.toString());
    searchParams.set('limit', query.limit.toString());

    return bff(`/settings/audit?${searchParams.toString()}`, AuditResponseSchema);
  }

  static async getAuditEntryById(id: string): Promise<AuditEntry> {
    return bff(`/settings/audit/${id}`, AuditEntrySchema);
  }

  static parseDiff(diffString: string | null): any {
    if (!diffString) return null;
    
    try {
      return JSON.parse(diffString);
    } catch {
      return diffString;
    }
  }

  static formatDiffForDisplay(diff: any): string {
    if (!diff) return 'No changes recorded';
    
    if (typeof diff === 'string') return diff;
    
    if (typeof diff === 'object') {
      return Object.entries(diff)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
    }
    
    return JSON.stringify(diff);
  }
}