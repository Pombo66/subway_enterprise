/**
 * Comprehensive store data validation system
 * Validates API responses and store data for map rendering
 */

import { StoreWithActivity } from '../types';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

export interface CoordinateValidation {
  isValid: boolean;
  reason?: string;
}

export interface ValidationSummary {
  totalStores: number;
  validStores: number;
  invalidStores: number;
  coordinateIssues: number;
  dataIssues: number;
  warnings: number;
}

export interface ProcessedStoreData {
  original: any;
  processed?: StoreWithActivity;
  validation: ValidationResult;
  coordinates: {
    latitude: number;
    longitude: number;
    source: 'api' | 'generated' | 'fallback';
    validated: boolean;
  };
}

export interface StoreValidationResults {
  valid: StoreWithActivity[];
  invalid: Array<{ store: any; reason: string; issues: string[] }>;
  processed: ProcessedStoreData[];
  summary: ValidationSummary;
}

export class RobustStoreValidator {
  private debugMode: boolean;

  constructor(debugMode: boolean = process.env.NODE_ENV === 'development') {
    this.debugMode = debugMode;
  }

  /**
   * Validates an array of store data from API response
   */
  validateStoreData(stores: any[]): StoreValidationResults {
    if (this.debugMode) {
      console.log('🔍 Starting store data validation...', {
        totalStores: stores.length,
        sampleStore: stores[0]
      });
    }

    const valid: StoreWithActivity[] = [];
    const invalid: Array<{ store: any; reason: string; issues: string[] }> = [];
    const processed: ProcessedStoreData[] = [];

    stores.forEach((store, index) => {
      const validation = this.validateSingleStore(store, index);
      processed.push(validation);

      if (validation.validation.isValid && validation.processed) {
        valid.push(validation.processed);
      } else {
        invalid.push({
          store: validation.original,
          reason: validation.validation.issues[0] || 'Unknown validation error',
          issues: validation.validation.issues
        });
      }
    });

    const summary: ValidationSummary = {
      totalStores: stores.length,
      validStores: valid.length,
      invalidStores: invalid.length,
      coordinateIssues: invalid.filter(i => 
        i.issues.some(issue => issue.toLowerCase().includes('coordinate'))
      ).length,
      dataIssues: invalid.filter(i => 
        i.issues.some(issue => issue.toLowerCase().includes('field') || issue.toLowerCase().includes('missing'))
      ).length,
      warnings: processed.reduce((sum, p) => sum + p.validation.warnings.length, 0)
    };

    const results: StoreValidationResults = {
      valid,
      invalid,
      processed,
      summary
    };

    this.logValidationResults(results);
    return results;
  }

  /**
   * Validates a single store object
   */
  private validateSingleStore(store: any, index: number): ProcessedStoreData {
    const validation: ValidationResult = {
      isValid: true,
      issues: [],
      warnings: []
    };

    // Check if store is an object
    if (!store || typeof store !== 'object') {
      validation.isValid = false;
      validation.issues.push(`Store at index ${index} is not a valid object`);
      return {
        original: store,
        validation,
        coordinates: {
          latitude: 0,
          longitude: 0,
          source: 'fallback',
          validated: false
        }
      };
    }

    // Validate required fields
    const requiredFields = ['id', 'name'];
    for (const field of requiredFields) {
      if (!store[field] || (typeof store[field] === 'string' && store[field].trim() === '')) {
        validation.isValid = false;
        validation.issues.push(`Missing or empty required field: ${field}`);
      }
    }

    // Validate optional but important fields
    const optionalFields = ['country', 'region', 'city'];
    for (const field of optionalFields) {
      if (!store[field]) {
        validation.warnings.push(`Missing optional field: ${field}`);
      }
    }

    // Validate coordinates
    const coordValidation = this.validateCoordinates(store.latitude, store.longitude);
    let coordinates: {
      latitude: number;
      longitude: number;
      source: 'api' | 'generated' | 'fallback';
      validated: boolean;
    } = {
      latitude: store.latitude || 0,
      longitude: store.longitude || 0,
      source: 'api',
      validated: coordValidation.isValid
    };

    if (!coordValidation.isValid) {
      validation.isValid = false;
      validation.issues.push(`Invalid coordinates: ${coordValidation.reason}`);
      
      // Try to use fallback coordinates if available
      if (store.city || store.country) {
        validation.warnings.push('Using fallback coordinates due to invalid API coordinates');
        coordinates.source = 'fallback';
      }
    }

    // Create processed store if validation passed
    let processed: StoreWithActivity | undefined;
    if (validation.isValid) {
      processed = {
        id: store.id,
        name: store.name.trim(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        region: store.region || 'AMER',
        country: store.country || 'Unknown',
        franchiseeId: store.franchiseeId,
        status: 'active' as const,
        recentActivity: Boolean(store.recentActivity),
        __mockActivity: Boolean(store.__mockActivity)
      };

      // Additional validation for processed store
      if (processed.name.length < 2) {
        validation.isValid = false;
        validation.issues.push('Store name must be at least 2 characters long');
        processed = undefined;
      }

      if (processed && processed.name.length > 100) {
        validation.warnings.push('Store name is very long (>100 characters)');
      }
    }

    return {
      original: store,
      processed,
      validation,
      coordinates
    };
  }

  /**
   * Validates latitude and longitude coordinates
   */
  validateCoordinates(lat: any, lng: any): CoordinateValidation {
    // Check if coordinates exist
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return { isValid: false, reason: 'Coordinates are missing (undefined or null)' };
    }

    // Convert to numbers if they're strings
    const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
    const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;

    // Check if they're valid numbers
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { isValid: false, reason: 'Coordinates must be numbers' };
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return { isValid: false, reason: 'Coordinates cannot be NaN' };
    }

    // Check latitude range
    if (latitude < -90 || latitude > 90) {
      return { 
        isValid: false, 
        reason: `Latitude ${latitude} out of valid range (-90 to 90)` 
      };
    }

    // Check longitude range
    if (longitude < -180 || longitude > 180) {
      return { 
        isValid: false, 
        reason: `Longitude ${longitude} out of valid range (-180 to 180)` 
      };
    }

    // Check for suspicious coordinates (0,0 might be invalid, but allow it for now)
    // Note: Removed strict (0,0) check since some stores might legitimately be at (0,0)
    // if (latitude === 0 && longitude === 0) {
    //   return { 
    //     isValid: false, 
    //     reason: 'Coordinates (0,0) are likely invalid - store may be missing location data' 
    //   };
    // }

    return { isValid: true };
  }

  /**
   * Logs validation results to console in debug mode
   */
  private logValidationResults(results: StoreValidationResults): void {
    if (!this.debugMode) return;

    console.log('📊 Store Data Validation Results:', {
      total: results.summary.totalStores,
      valid: results.summary.validStores,
      invalid: results.summary.invalidStores,
      coordinateIssues: results.summary.coordinateIssues,
      dataIssues: results.summary.dataIssues,
      warnings: results.summary.warnings
    });

    // Log invalid stores with details
    if (results.invalid.length > 0) {
      console.warn('❌ Invalid stores found:');
      results.invalid.forEach((invalid, index) => {
        console.warn(`  ${index + 1}. Store ID: ${invalid.store?.id || 'unknown'}`, {
          reason: invalid.reason,
          issues: invalid.issues,
          store: invalid.store
        });
      });
    }

    // Log sample valid stores
    if (results.valid.length > 0) {
      console.log('✅ Sample valid stores:');
      results.valid.slice(0, 3).forEach((store, index) => {
        console.log(`  ${index + 1}. ${store.name} (${store.id}):`, {
          coordinates: `${store.latitude.toFixed(4)}, ${store.longitude.toFixed(4)}`,
          region: store.region,
          country: store.country,
          active: store.recentActivity
        });
      });
    }

    // Log warnings if any
    const storesWithWarnings = results.processed.filter(p => p.validation.warnings.length > 0);
    if (storesWithWarnings.length > 0) {
      console.warn('⚠️ Stores with warnings:');
      storesWithWarnings.forEach((processed, index) => {
        console.warn(`  ${index + 1}. ${processed.original?.name || 'unknown'}:`, {
          warnings: processed.validation.warnings
        });
      });
    }

    // Summary statistics
    const successRate = results.summary.totalStores > 0 
      ? (results.summary.validStores / results.summary.totalStores * 100).toFixed(1)
      : '0';
    
    console.log(`📈 Validation Summary: ${successRate}% success rate (${results.summary.validStores}/${results.summary.totalStores} stores valid)`);
  }

  /**
   * Validates API response structure
   */
  validateAPIResponse(response: any): { isValid: boolean; error?: string } {
    if (!response) {
      return { isValid: false, error: 'API response is null or undefined' };
    }

    if (typeof response !== 'object') {
      return { isValid: false, error: 'API response is not an object' };
    }

    // Check for common API response patterns
    if (response.success !== undefined) {
      // BFF API format: { success: boolean, data: any[], error?: string }
      if (!response.success) {
        return { isValid: false, error: response.error || 'API returned success: false' };
      }
      
      if (!Array.isArray(response.data)) {
        return { isValid: false, error: 'API response data is not an array' };
      }

      return { isValid: true };
    }

    // Direct array format
    if (Array.isArray(response)) {
      return { isValid: true };
    }

    return { isValid: false, error: 'Unknown API response format' };
  }

  /**
   * Gets validation statistics for monitoring
   */
  getValidationStats(results: StoreValidationResults): Record<string, number> {
    return {
      totalStores: results.summary.totalStores,
      validStores: results.summary.validStores,
      invalidStores: results.summary.invalidStores,
      coordinateIssues: results.summary.coordinateIssues,
      dataIssues: results.summary.dataIssues,
      warnings: results.summary.warnings,
      successRate: results.summary.totalStores > 0 
        ? Math.round(results.summary.validStores / results.summary.totalStores * 100)
        : 0
    };
  }
}

// Export singleton instance
export const storeValidator = new RobustStoreValidator();