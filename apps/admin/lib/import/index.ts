// Smart Store Importer v1 - Main integration file
// This file provides a unified interface for all smart import functionality

// Core functionality exports
export { autoMapper, AutoMapper } from './autoMap';
export { countryInferrer, CountryInferrer } from './countryInference';
export { batchGeocodeProcessor, BatchGeocodeProcessor, BatchProcessingUtils } from './batchProcessor';
export { addressNormalizer, AddressNormalizer } from './addressNormalizer';

// Provider system exports
export { 
  geocodeProviderManager,
  nominatimProvider,
  googleMapsProvider,
  geocodeAddress,
  batchGeocodeAddresses
} from './providers';

// Rate limiting exports
export { TokenBucketRateLimiter, rateLimiterManager } from './rateLimiter';

// Configuration exports
export { default as smartImportConfig, featureFlags, getPreferredGeocodeProvider } from './config';

// Error handling exports
export {
  SmartImportError,
  AutoMappingError,
  CountryInferenceError,
  GeocodeError,
  RateLimitError,
  NetworkError,
  AddressNormalizationError,
  ConfigurationError,
  ErrorHandler,
  ExponentialBackoff,
  ErrorAggregator
} from './errors';

// Telemetry exports
export {
  telemetryService,
  performanceMonitor,
  errorTracker,
  SmartImportTelemetry,
  SmartImportPerformanceMonitor,
  SmartImportErrorTracker
} from './telemetry';

// Type exports
export type {
  // Core types
  ConfidenceLevel,
  InferenceMethod,
  GeocodeStatus,
  GeocodeProvider,
  
  // Auto-mapping types
  FieldMapping,
  AutoMapResult,
  
  // Country inference types
  CountryInference,
  
  // Import types
  ImportRow,
  ImportSession,
  
  // Geocoding types
  GeocodeProgress,
  GeocodeError,
  GeocodeRequest,
  GeocodeResponse,
  GeocodeResult,
  
  // Configuration types
  SmartImportConfig,
  
  // Telemetry types
  TelemetryEvent,
  AutoMapTelemetry,
  CountryInferenceTelemetry,
  GeocodeStartTelemetry,
  GeocodeProgressTelemetry,
  GeocodeCompleteTelemetry,
  
  // UI component types
  ConfidenceBadgeProps,
  CountryInferenceDisplayProps,
  GeocodeProgressDisplayProps,
  
  // Constants
  FieldAlias,
  CountryCode
} from './types';

// Constants exports
export { FIELD_ALIASES, POSTCODE_PATTERNS, COUNTRY_INFO } from './types';

/**
 * Smart Import Service - Main orchestrator class
 * Provides a high-level interface for the entire smart import process
 */
export class SmartImportService {
  private static instance: SmartImportService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SmartImportService {
    if (!SmartImportService.instance) {
      SmartImportService.instance = new SmartImportService();
    }
    return SmartImportService.instance;
  }

  /**
   * Process a complete smart import workflow
   */
  async processImport(
    filename: string,
    headers: string[],
    sampleRows: any[][],
    options: {
      userRegion?: string;
      preferredProvider?: GeocodeProvider;
      enableAddressNormalization?: boolean;
      onProgress?: (step: string, progress: number) => void;
    } = {}
  ) {
    const { onProgress } = options;
    
    try {
      // Step 1: Auto-map columns
      onProgress?.('auto-mapping', 10);
      const autoMapResult = autoMapper.generateMappings(headers, sampleRows);
      telemetryService.emitAutoMapDone(autoMapResult);

      // Step 2: Infer country
      onProgress?.('country-inference', 30);
      const countryInference = countryInferrer.inferCountry(
        filename,
        sampleRows,
        options.userRegion
      );
      telemetryService.emitCountryInferred(countryInference);

      // Step 3: Prepare import rows
      onProgress?.('preparing-data', 50);
      const importRows = this.buildImportRows(headers, sampleRows, autoMapResult, countryInference);

      // Step 4: Geocode if needed
      const rowsNeedingGeocode = importRows.filter(row => 
        !row.latitude || !row.longitude || isNaN(row.latitude) || isNaN(row.longitude)
      );

      if (rowsNeedingGeocode.length > 0) {
        onProgress?.('geocoding', 70);
        telemetryService.emitGeocodeStarted(
          rowsNeedingGeocode.length,
          options.preferredProvider || 'nominatim',
          smartImportConfig.geocoding.batchSize
        );

        const geocodeResults = await batchGeocodeProcessor.processRows(
          rowsNeedingGeocode,
          options.preferredProvider,
          (progress) => {
            const progressPercent = 70 + (progress.completed / progress.total) * 20;
            onProgress?.('geocoding', progressPercent);
          }
        );

        telemetryService.emitGeocodeComplete(
          geocodeResults.summary.successful,
          geocodeResults.summary.failed,
          geocodeResults.summary.total,
          options.preferredProvider || 'nominatim',
          Date.now()
        );
      }

      onProgress?.('complete', 100);

      return {
        success: true,
        autoMapResult,
        countryInference,
        importRows,
        summary: {
          totalRows: importRows.length,
          geocoded: rowsNeedingGeocode.length,
          successful: importRows.filter(row => row.latitude && row.longitude).length
        }
      };

    } catch (error) {
      errorTracker.trackError(
        error instanceof Error ? error : new Error('Unknown error'),
        'SmartImportService.processImport'
      );
      throw error;
    }
  }

  /**
   * Build import rows from raw data and mapping results
   */
  private buildImportRows(
    headers: string[],
    sampleRows: any[][],
    autoMapResult: AutoMapResult,
    countryInference: CountryInference
  ): ImportRow[] {
    return sampleRows.map((row, index) => {
      const importRow: ImportRow = {
        id: `row-${index}`,
        country: countryInference.country
      };

      // Map data based on auto-mapping results
      Object.entries(autoMapResult.mappings).forEach(([field, mapping]) => {
        if (mapping.suggestedColumn) {
          const columnIndex = headers.indexOf(mapping.suggestedColumn);
          if (columnIndex >= 0 && row[columnIndex] != null) {
            const value = row[columnIndex];
            this.assignFieldValue(importRow, field as FieldAlias, value);
          }
        }
      });

      return importRow;
    });
  }

  /**
   * Assign field value to import row
   */
  private assignFieldValue(importRow: ImportRow, field: FieldAlias, value: any): void {
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
   * Get system status and health
   */
  async getSystemStatus() {
    const providerTests = await geocodeProviderManager.testAllProviders();
    const addressNormalizationStatus = addressNormalizer.getStatus();
    
    return {
      autoMapping: {
        enabled: featureFlags.isAutoMappingEnabled(),
        status: 'healthy'
      },
      countryInference: {
        enabled: featureFlags.isCountryInferenceEnabled(),
        status: 'healthy'
      },
      geocoding: {
        enabled: featureFlags.isGeocodingEnabled(),
        providers: providerTests,
        status: Object.values(providerTests).some(p => p.connectionTest?.success) ? 'healthy' : 'degraded'
      },
      addressNormalization: {
        ...addressNormalizationStatus,
        status: addressNormalizationStatus.configured ? 'healthy' : 'disabled'
      },
      performance: performanceMonitor.getAllMetrics(),
      errors: errorTracker.getErrorSummary()
    };
  }
}

// Export singleton instance
export const smartImportService = SmartImportService.getInstance();