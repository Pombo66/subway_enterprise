// Environment configuration for Smart Store Importer v1
import { SmartImportConfig, GeocodeProvider } from './types';

// Environment variable validation and parsing
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value || defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Smart Import Configuration
export const smartImportConfig: SmartImportConfig = {
  // Auto-mapping configuration
  autoMapping: {
    enabled: getEnvBool('IMPORT_AUTO_MAPPING_ENABLED', true),
    confidenceThreshold: (getEnvVar('IMPORT_AUTO_MAPPING_THRESHOLD', 'medium') as any) || 'medium',
    fuzzyMatchTolerance: getEnvNumber('IMPORT_FUZZY_MATCH_TOLERANCE', 0.8),
  },

  // Country inference configuration
  countryInference: {
    enabled: getEnvBool('IMPORT_COUNTRY_INFERENCE_ENABLED', true),
    fallbackToUserRegion: getEnvBool('IMPORT_COUNTRY_FALLBACK_USER_REGION', true),
    confidenceThreshold: (getEnvVar('IMPORT_COUNTRY_THRESHOLD', 'medium') as any) || 'medium',
  },

  // Geocoding configuration
  geocoding: {
    enabled: getEnvBool('IMPORT_GEOCODING_ENABLED', true),
    batchSize: getEnvNumber('GEOCODE_BATCH_SIZE', 15),
    rateLimit: getEnvNumber('GEOCODE_RATE_LIMIT', 5),
    timeout: getEnvNumber('GEOCODE_TIMEOUT_MS', 10000),
    maxRetries: getEnvNumber('GEOCODE_MAX_RETRIES', 1),
    providers: {
      nominatim: {
        enabled: getEnvBool('NOMINATIM_ENABLED', true),
        baseUrl: getEnvVar('NOMINATIM_URL', 'https://nominatim.openstreetmap.org'),
        userAgent: getEnvVar('NOMINATIM_USER_AGENT', 'SubwayEnterprise/1.0 (admin@subway.com)'),
        rateLimit: getEnvNumber('NOMINATIM_RATE_LIMIT', 1),
      },
      google: {
        enabled: getEnvBool('GOOGLE_MAPS_ENABLED', !!getEnvVar('GOOGLE_MAPS_API_KEY')),
        apiKey: getEnvVar('GOOGLE_MAPS_API_KEY'),
        rateLimit: getEnvNumber('GOOGLE_MAPS_RATE_LIMIT', 10),
      },
    },
  },

  // Address normalization configuration
  addressNormalization: {
    enabled: getEnvBool('IMPORT_ADDRESS_NORMALIZE', false),
    provider: 'openai',
    apiKey: getEnvVar('OPENAI_API_KEY'),
    timeout: getEnvNumber('ADDRESS_NORMALIZE_TIMEOUT_MS', 5000),
    fallbackOnError: getEnvBool('ADDRESS_NORMALIZE_FALLBACK_ON_ERROR', true),
  },
};

// Provider selection logic
export function getPreferredGeocodeProvider(): GeocodeProvider {
  const { providers } = smartImportConfig.geocoding;
  
  // Prefer Google Maps if available and enabled
  if (providers.google.enabled && providers.google.apiKey) {
    return 'google';
  }
  
  // Fall back to Nominatim if enabled
  if (providers.nominatim.enabled) {
    return 'nominatim';
  }
  
  // Default to nominatim even if not explicitly enabled
  return 'nominatim';
}

// Validate configuration
export function validateSmartImportConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if geocoding is enabled but no providers are available
  if (smartImportConfig.geocoding.enabled) {
    const { providers } = smartImportConfig.geocoding;
    const hasValidProvider = 
      (providers.nominatim.enabled && providers.nominatim.baseUrl) ||
      (providers.google.enabled && providers.google.apiKey);
    
    if (!hasValidProvider) {
      errors.push('Geocoding is enabled but no valid providers are configured');
    }
  }
  
  // Check address normalization configuration
  if (smartImportConfig.addressNormalization.enabled && !smartImportConfig.addressNormalization.apiKey) {
    errors.push('Address normalization is enabled but OPENAI_API_KEY is not provided');
  }
  
  // Validate batch size
  if (smartImportConfig.geocoding.batchSize < 1 || smartImportConfig.geocoding.batchSize > 50) {
    errors.push('Geocoding batch size must be between 1 and 50');
  }
  
  // Validate rate limits
  if (smartImportConfig.geocoding.rateLimit < 1 || smartImportConfig.geocoding.rateLimit > 100) {
    errors.push('Geocoding rate limit must be between 1 and 100 requests per second');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Feature flag helpers
export const featureFlags = {
  isAutoMappingEnabled: () => smartImportConfig.autoMapping.enabled,
  isCountryInferenceEnabled: () => smartImportConfig.countryInference.enabled,
  isGeocodingEnabled: () => smartImportConfig.geocoding.enabled,
  isAddressNormalizationEnabled: () => 
    smartImportConfig.addressNormalization.enabled && 
    !!smartImportConfig.addressNormalization.apiKey,
  isGoogleMapsEnabled: () => 
    smartImportConfig.geocoding.providers.google.enabled && 
    !!smartImportConfig.geocoding.providers.google.apiKey,
  isNominatimEnabled: () => smartImportConfig.geocoding.providers.nominatim.enabled,
};

// Configuration logging (for debugging)
export function logConfiguration(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Smart Import Configuration:', {
      autoMapping: smartImportConfig.autoMapping.enabled,
      countryInference: smartImportConfig.countryInference.enabled,
      geocoding: smartImportConfig.geocoding.enabled,
      addressNormalization: smartImportConfig.addressNormalization.enabled,
      providers: {
        nominatim: smartImportConfig.geocoding.providers.nominatim.enabled,
        google: smartImportConfig.geocoding.providers.google.enabled,
      },
    });
  }
}

// Export configuration validation on module load
const configValidation = validateSmartImportConfig();
if (!configValidation.valid) {
  console.warn('Smart Import Configuration Issues:', configValidation.errors);
}

// Export the configuration
export default smartImportConfig;