import { bff, bffWithErrorHandling } from '../api';
import { 
  FeatureFlag, 
  CreateFeatureFlagRequest, 
  UpdateFeatureFlagRequest, 
  FeatureFlagQuery, 
  FeatureFlagsResponse,
  FeatureFlagEvent,
  FeatureFlagSchema
} from '../types/feature-flag.types';
import { z } from 'zod';

const FeatureFlagsResponseSchema = z.object({
  flags: z.array(FeatureFlagSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const FeatureFlagEventSchema = z.object({
  id: z.string(),
  flagKey: z.string(),
  action: z.enum(['ENABLED', 'DISABLED', 'CREATED', 'UPDATED', 'DELETED']),
  actor: z.string(),
  timestamp: z.string().datetime(),
  previousValue: z.boolean().optional(),
  newValue: z.boolean().optional(),
});

export class FeatureFlagService {
  static async getFeatureFlags(query: FeatureFlagQuery): Promise<FeatureFlagsResponse> {
    const searchParams = new URLSearchParams();
    
    if (query.search) searchParams.set('search', query.search);
    if (query.enabled !== undefined) searchParams.set('enabled', query.enabled.toString());
    searchParams.set('page', query.page.toString());
    searchParams.set('limit', query.limit.toString());

    return bff(`/settings/flags?${searchParams.toString()}`, FeatureFlagsResponseSchema);
  }

  static async getFeatureFlagById(id: string): Promise<FeatureFlag> {
    return bff(`/settings/flags/${id}`, FeatureFlagSchema);
  }

  static async createFeatureFlag(data: CreateFeatureFlagRequest): Promise<{ success: true; flag: FeatureFlag } | { success: false; error: string }> {
    const result = await bffWithErrorHandling<FeatureFlag>('/settings/flags', FeatureFlagSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      return { success: true, flag: result.data };
    } else {
      return { success: false, error: result.error };
    }
  }

  static async updateFeatureFlag(id: string, data: UpdateFeatureFlagRequest): Promise<{ success: true; flag: FeatureFlag } | { success: false; error: string }> {
    const result = await bffWithErrorHandling<FeatureFlag>(`/settings/flags/${id}`, FeatureFlagSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      return { success: true, flag: result.data };
    } else {
      return { success: false, error: result.error };
    }
  }

  static async toggleFeatureFlag(id: string, enabled: boolean): Promise<{ success: true; flag: FeatureFlag } | { success: false; error: string }> {
    return this.updateFeatureFlag(id, { enabled });
  }

  static async deleteFeatureFlag(id: string): Promise<{ success: true } | { success: false; error: string }> {
    return bffWithErrorHandling(`/settings/flags/${id}`, z.object({}), {
      method: 'DELETE',
    });
  }

  static async getRecentEvents(limit: number = 10): Promise<FeatureFlagEvent[]> {
    return bff(`/settings/flags/events?limit=${limit}`, z.array(FeatureFlagEventSchema));
  }
}