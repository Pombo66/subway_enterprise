import { z } from 'zod';
import { bff, bffWithErrorHandling } from './api';

// Request/Response schemas
export const SubMindQuerySchema = z.object({
  prompt: z.string().min(1).max(4000),
  context: z.object({
    screen: z.string().optional(),
    selection: z.any().optional(),
    scope: z.object({
      region: z.string().optional(),
      country: z.string().optional(),
      storeId: z.string().optional(),
      franchiseeId: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const SubMindResponseSchema = z.object({
  message: z.string(),
  sources: z.array(z.object({
    type: z.enum(['api', 'sql', 'note']),
    ref: z.string(),
  })).optional(),
  meta: z.object({
    tokens: z.number().optional(),
    latencyMs: z.number().optional(),
  }).optional(),
});

export type SubMindQuery = z.infer<typeof SubMindQuerySchema>;
export type SubMindResponse = z.infer<typeof SubMindResponseSchema>;

export interface SubMindError {
  error: string;
  code?: string;
  details?: any;
  retryAfter?: number;
}

/**
 * Submit a query to SubMind AI service
 */
export async function querySubMind(query: SubMindQuery): Promise<{
  success: true;
  data: SubMindResponse;
} | {
  success: false;
  error: string;
  code?: string;
  retryAfter?: number;
}> {
  try {
    // Validate input
    const validatedQuery = SubMindQuerySchema.parse(query);
    
    const result = await bffWithErrorHandling<SubMindResponse>(
      '/ai/submind/query',
      SubMindResponseSchema,
      {
        method: 'POST',
        body: JSON.stringify(validatedQuery),
      }
    );

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      // Parse error details for specific error types
      let code: string | undefined;
      let retryAfter: number | undefined;

      if (result.error.includes('rate_limited')) {
        code = 'RATE_LIMITED';
        // Try to extract retry-after from error details
        if (result.details?.retryAfter) {
          retryAfter = result.details.retryAfter;
        }
      } else if (result.error.includes('AI disabled') || result.error.includes('missing API key')) {
        code = 'AI_DISABLED';
      } else if (result.error.includes('service unavailable') || result.error.includes('temporarily unavailable')) {
        code = 'SERVICE_UNAVAILABLE';
      } else if (result.error.includes('validation')) {
        code = 'VALIDATION_ERROR';
      }

      return {
        success: false,
        error: result.error,
        code,
        retryAfter,
      };
    }
  } catch (error) {
    console.error('SubMind query error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid query format',
        code: 'VALIDATION_ERROR',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Get current page context for SubMind queries
 * Now uses the SubMind context manager for real page data
 */
export function getCurrentPageContext(): {
  screen?: string;
  data?: any;
  scope?: {
    region?: string;
    country?: string;
    storeId?: string;
    franchiseeId?: string;
  };
  metadata?: {
    lastUpdated?: string;
    dataSource?: string;
  };
} {
  if (typeof window === 'undefined') {
    return {};
  }

  // Try to get context from the context manager first (real page data)
  try {
    const { subMindContext } = require('./submind-context');
    const registeredContext = subMindContext.getContext();
    
    if (registeredContext) {
      // Page has registered its context - use it!
      return registeredContext;
    }
  } catch (error) {
    // Context manager not available, fall back to pathname detection
    console.warn('SubMind context manager not available:', error);
  }

  // Fallback: Extract basic context from pathname (legacy behavior)
  const pathname = window.location.pathname;
  
  let screen: string | undefined;
  if (pathname === '/dashboard') {
    screen = 'dashboard';
  } else if (pathname.startsWith('/stores/map')) {
    screen = 'stores_map';
  } else if (pathname.startsWith('/stores')) {
    screen = 'stores';
  } else if (pathname.startsWith('/orders')) {
    screen = 'orders';
  } else if (pathname.startsWith('/menu')) {
    screen = 'menu';
  } else if (pathname.startsWith('/analytics')) {
    screen = 'analytics';
  } else if (pathname.startsWith('/settings')) {
    screen = 'settings';
  }

  // Try to extract scope from localStorage
  const scope: any = {};
  
  try {
    const storedFilters = localStorage.getItem('subway_filters');
    if (storedFilters) {
      const filters = JSON.parse(storedFilters);
      if (filters.region) scope.region = filters.region;
      if (filters.country) scope.country = filters.country;
      if (filters.storeId) scope.storeId = filters.storeId;
      if (filters.franchiseeId) scope.franchiseeId = filters.franchiseeId;
    }
  } catch (error) {
    // Ignore localStorage errors
  }

  return {
    screen,
    scope: Object.keys(scope).length > 0 ? scope : undefined,
  };
}

/**
 * Format markdown text for display
 */
export function formatMarkdown(text: string): string {
  // Simple markdown formatting - in a real app, you might use a proper markdown library
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-gray-900 mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-base font-semibold text-gray-900 mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h1>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/\n/g, '<br>');
}