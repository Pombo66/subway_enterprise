// Compatibility layer for Smart Store Importer v1
// Ensures backward compatibility with existing import functionality

import { 
  ParsedRow, 
  ImportSummary, 
  NormalizedStore,
  HeaderMapping 
} from '../types/store-upload';
import { 
  ImportRow, 
  AutoMapResult, 
  CountryInference,
  FieldAlias,
  FIELD_ALIASES 
} from './types';
import { autoMapper } from './autoMap';
import { countryInferrer } from './countryInference';

/**
 * Convert new ImportRow format to legacy NormalizedStore format
 */
export function convertImportRowToNormalizedStore(row: ImportRow): NormalizedStore {
  return {
    name: row.name || '',
    address: row.address || '',
    city: row.city || '',
    postcode: row.postcode,
    country: row.country || '',
    latitude: row.latitude,
    longitude: row.longitude,
    externalId: row.externalId,
    status: row.status,
    region: inferRegionFromCountry(row.country)
  };
}

/**
 * Convert legacy ParsedRow format to new ImportRow format
 */
export function convertParsedRowToImportRow(
  parsedRow: ParsedRow, 
  mapping: Record<string, string>,
  defaultCountry: string
): ImportRow {
  const importRow: ImportRow = {
    id: `row-${parsedRow.index}`,
    country: defaultCountry
  };

  // Apply field mapping
  Object.entries(mapping).forEach(([field, columnName]) => {
    const value = parsedRow.data[columnName];
    if (value != null) {
      assignFieldValue(importRow, field as FieldAlias, value);
    }
  });

  return importRow;
}

/**
 * Convert new AutoMapResult to legacy HeaderMapping format
 */
export function convertAutoMapResultToHeaderMapping(result: AutoMapResult): Record<string, HeaderMapping> {
  const headerMappings: Record<string, HeaderMapping> = {};

  Object.entries(result.mappings).forEach(([field, mapping]) => {
    if (mapping.suggestedColumn) {
      headerMappings[mapping.suggestedColumn] = {
        detected: mapping.suggestedColumn,
        suggested: field,
        confidence: getNumericConfidence(mapping.confidence)
      };
    }
  });

  return headerMappings;
}

/**
 * Create legacy-compatible suggested mapping from auto-map result
 */
export function createLegacySuggestedMapping(result: AutoMapResult): Record<string, string> {
  const mapping: Record<string, string> = {};

  Object.entries(result.mappings).forEach(([field, fieldMapping]) => {
    if (fieldMapping.suggestedColumn) {
      mapping[field] = fieldMapping.suggestedColumn;
    }
  });

  return mapping;
}

/**
 * Enhanced version of the legacy suggestMapping function
 * Uses the new auto-mapper but returns results in legacy format
 */
export function enhancedSuggestMapping(headers: string[], sampleRows?: any[][]): Record<string, string> {
  try {
    if (sampleRows && sampleRows.length > 0) {
      // Use new smart auto-mapper
      const result = autoMapper.generateMappings(headers, sampleRows);
      return createLegacySuggestedMapping(result);
    } else {
      // Fall back to simple header matching for backward compatibility
      return simpleSuggestMapping(headers);
    }
  } catch (error) {
    console.warn('Enhanced mapping failed, falling back to simple mapping:', error);
    return simpleSuggestMapping(headers);
  }
}

/**
 * Simple header-based mapping (legacy fallback)
 */
function simpleSuggestMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Find best match from field aliases
    for (const [fieldName, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        if (normalizedHeader === alias.toLowerCase() || 
            normalizedHeader.includes(alias.toLowerCase())) {
          mapping[fieldName] = header;
          break;
        }
      }
      if (mapping[fieldName]) break;
    }
  });

  return mapping;
}

/**
 * Enhanced country detection for legacy imports
 */
export function enhancedDetectCountry(
  filename: string,
  sampleRows?: any[][],
  userRegion?: string
): string {
  try {
    const inference = countryInferrer.inferCountry(filename, sampleRows || [], userRegion);
    return inference.country;
  } catch (error) {
    console.warn('Enhanced country detection failed, using fallback:', error);
    return 'DE'; // Default fallback
  }
}

/**
 * Convert confidence level to numeric value for legacy compatibility
 */
function getNumericConfidence(confidence: 'high' | 'medium' | 'low'): number {
  switch (confidence) {
    case 'high': return 0.9;
    case 'medium': return 0.6;
    case 'low': return 0.3;
    default: return 0.5;
  }
}

/**
 * Assign field value to import row (helper function)
 */
function assignFieldValue(importRow: ImportRow, field: FieldAlias, value: any): void {
  switch (field) {
    case 'name':
      importRow.name = String(value);
      break;
    case 'address':
      importRow.address = String(value);
      break;
    case 'city':
      importRow.city = String(value);
      break;
    case 'postcode':
      importRow.postcode = String(value);
      break;
    case 'country':
      importRow.country = String(value);
      break;
    case 'latitude':
      const lat = parseFloat(value);
      if (!isNaN(lat)) importRow.latitude = lat;
      break;
    case 'longitude':
      const lng = parseFloat(value);
      if (!isNaN(lng)) importRow.longitude = lng;
      break;
    case 'status':
      importRow.status = String(value);
      break;
    case 'externalId':
      importRow.externalId = String(value);
      break;
  }
}

/**
 * Infer region from country code
 */
function inferRegionFromCountry(country?: string): string | undefined {
  if (!country) return undefined;

  const regionMap: Record<string, string> = {
    'DE': 'EMEA',
    'UK': 'EMEA', 
    'FR': 'EMEA',
    'IT': 'EMEA',
    'ES': 'EMEA',
    'NL': 'EMEA',
    'CH': 'EMEA',
    'US': 'AMER',
    'CA': 'AMER',
    'AU': 'APAC'
  };

  return regionMap[country.toUpperCase()];
}

/**
 * Wrapper for legacy import summary creation
 */
export function createImportSummary(
  successful: number,
  failed: number,
  geocoded: number
): ImportSummary {
  return {
    inserted: successful,
    updated: 0, // Smart importer only inserts new records
    pendingGeocode: 0, // Geocoding is done during import
    failed
  };
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  private static debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Debounce function calls to prevent excessive re-renders
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key: string
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func(...args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    };
  }

  /**
   * Memoize expensive calculations
   */
  static memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = func(...args);
      cache.set(key, result);
      
      // Limit cache size to prevent memory leaks
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    }) as T;
  }

  /**
   * Clear all debounce timers
   */
  static clearAllDebounces(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  /**
   * Clean up large objects to prevent memory leaks
   */
  static cleanup(obj: any): void {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        delete obj[key];
      });
    }
  }

  /**
   * Process large arrays in chunks to prevent blocking
   */
  static async processInChunks<T, R>(
    items: T[],
    processor: (item: T) => R | Promise<R>,
    chunkSize: number = 100
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(processor));
      results.push(...chunkResults);
      
      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }
}