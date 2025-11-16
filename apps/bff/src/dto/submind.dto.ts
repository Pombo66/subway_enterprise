export interface SubMindQueryDto {
  prompt: string;
  context?: {
    screen?: string;
    selection?: any;
    data?: any; // Real page data from context manager
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
  };
}

export interface SubMindResponseDto {
  message: string;
  sources?: Array<{
    type: 'api' | 'sql' | 'note';
    ref: string;
  }>;
  meta?: {
    tokens?: number;
    latencyMs?: number;
  };
}

export interface SubMindErrorDto {
  error: string;
  code?: string;
  details?: any;
  retryAfter?: number;
}