import { z } from 'zod';
import { config } from './config';
import { NetworkError, ApiError } from './errors/base.error';
import { ErrorHandler } from './types/error.types';

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  ok?: boolean;
  timestamp?: string;
}

// Hardcoded fallback BFF URL - guaranteed to work in browser
const FALLBACK_BFF_URL = 'https://subwaybff-production.up.railway.app';

export async function bff<T>(
  path: string,
  schema?: z.ZodSchema<T>,
  init?: RequestInit
): Promise<T> {
  // Normalize path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Get base URL with fallback
  const baseUrl = config.bffBaseUrl && config.bffBaseUrl !== 'undefined' 
    ? config.bffBaseUrl 
    : FALLBACK_BFF_URL;
  
  const url = `${baseUrl.replace(/\/$/, '')}${normalizedPath}`;
  
  console.log('🌐 Making BFF request:', {
    url,
    method: init?.method || 'GET',
    bffBaseUrl: baseUrl,
    configValue: config.bffBaseUrl,
    usingFallback: baseUrl === FALLBACK_BFF_URL,
    path: normalizedPath
  });
  
  try {
    const res = await fetch(url, { 
      ...init, 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    console.log('📡 BFF Response:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      url: res.url
    });

    const responseData = await res.json();
    
    console.log('📦 Response Data:', {
      hasData: !!responseData,
      isObject: typeof responseData === 'object',
      keys: typeof responseData === 'object' ? Object.keys(responseData) : [],
      sample: typeof responseData === 'object' ? JSON.stringify(responseData).substring(0, 200) + '...' : responseData
    });

    if (!res.ok) {
      // Handle structured error responses from BFF
      if (responseData && typeof responseData === 'object' && 'error' in responseData) {
        throw new ApiError(responseData.error, 'BFF_ERROR', res.status);
      }
      
      throw new NetworkError(`Request failed with status ${res.status}`, res.status, url);
    }

    // Handle BFF's success/error response pattern
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      if (!responseData.success && responseData.error) {
        throw new ApiError(responseData.error, 'BFF_ERROR');
      }
      
      // Extract data from successful response
      const actualData = responseData.data ?? responseData;
      
      // Validate response if schema provided
      if (schema) {
        try {
          return schema.parse(actualData);
        } catch (error) {
          throw new ApiError(
            `Invalid response format from ${path}`,
            'INVALID_RESPONSE_FORMAT'
          );
        }
      }
      
      return actualData as T;
    }
    
    // Handle direct data responses
    if (schema) {
      try {
        return schema.parse(responseData);
      } catch (error) {
        throw new ApiError(
          `Invalid response format from ${path}`,
          'INVALID_RESPONSE_FORMAT'
        );
      }
    }
    
    return responseData as T;
  } catch (error) {
    if (error instanceof NetworkError || error instanceof ApiError) {
      throw error;
    }
    
    // Handle network/fetch errors
    throw new NetworkError(
      `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
      url
    );
  }
}

// Enhanced error handling function with validation error support
export async function bffWithErrorHandling<T>(
  path: string,
  schema?: z.ZodSchema<T>,
  init?: RequestInit
): Promise<{ success: true; data: T } | { success: false; error: string; details?: any }> {
  try {
    const data = await bff<T>(path, schema, init);
    return { success: true, data };
  } catch (error) {
    console.error(`API Error for ${path}:`, error);
    
    if (error instanceof ApiError) {
      // Try to parse structured error response
      const { message, details } = ErrorHandler.parseError(error.message);
      return { 
        success: false, 
        error: message,
        details: details
      };
    }
    
    if (error instanceof NetworkError) {
      return { 
        success: false, 
        error: `Network error: ${error.message}` 
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

// Utility function for handling form submissions with validation errors
export async function submitForm<T>(
  path: string,
  data: Record<string, any>,
  schema?: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; validationErrors?: any[] }> {
  const result = await bffWithErrorHandling<T>(path, schema, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!result.success && result.details) {
    return {
      success: false,
      error: result.error,
      validationErrors: result.details,
    };
  }
  
  return result;
}

