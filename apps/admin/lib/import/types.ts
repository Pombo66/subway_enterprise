// Enhanced import types for Smart Store Importer v1
// Extends existing store-upload types with auto-mapping, country inference, and geocoding capabilities

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type InferenceMethod = 'column' | 'filename' | 'format' | 'fallback';
export type GeocodeStatus = 'pending' | 'success' | 'failed' | 'needs_review';
export type GeocodeProvider = 'nominatim' | 'google';

// Auto-mapping interfaces
export interface FieldMapping {
  field: string;
  confidence: ConfidenceLevel;
  reason: string;
  suggestedColumn?: string;
}

export interface AutoMapResult {
  mappings: Record<string, FieldMapping>;
  unmappedColumns: string[];
  confidenceSummary: {
    high: number;
    medium: number;
    low: number;
  };
}

// Country inference interfaces
export interface CountryInference {
  country: string;
  confidence: ConfidenceLevel;
  method: InferenceMethod;
  displayText: string;
  countryCode?: string;
  flagEmoji?: string;
}

// Enhanced import row with geocoding status
export interface ImportRow {
  id: string;
  name?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  externalId?: string;
  geocodeStatus?: GeocodeStatus;
  geocodeError?: string;
  geocodeProvider?: GeocodeProvider;
  geocodePrecision?: string;
}

// Import session tracking
export interface ImportSession {
  id: string;
  filename: string;
  totalRows: number;
  mappings: Record<string, string>;
  countryInference?: CountryInference;
  progress: {
    imported: number;
    geocoded: number;
    failed: number;
  };
  createdAt: Date;
  updatedAt?: Date;
}

// Geocoding interfaces
export interface GeocodeProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  errors: GeocodeError[];
  currentBatch?: number;
  totalBatches?: number;
}

export interface GeocodeError {
  rowId: string;
  address: string;
  reason: string;
  retryable: boolean;
  provider?: GeocodeProvider;
}

export interface GeocodeRequest {
  providerPreference?: GeocodeProvider;
  rows: Array<{
    id: string;
    address: string;
    city: string;
    postcode: string;
    country: string;
  }>;
}

export interface GeocodeResponse {
  results: Array<{
    id: string;
    lat?: number;
    lng?: number;
    precision?: string;
    provider?: GeocodeProvider;
    error?: string;
  }>;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  precision: string;
  provider: GeocodeProvider;
}

// Error handling interfaces
export interface ImportError extends Error {
  code: string;
  retryable: boolean;
  context?: Record<string, any>;
}

export interface GeocodeErrorDetails {
  error: string;
  retryable: boolean;
  statusCode?: number;
  provider?: GeocodeProvider;
}

// Configuration interfaces
export interface SmartImportConfig {
  // Auto-mapping configuration
  autoMapping: {
    enabled: boolean;
    confidenceThreshold: ConfidenceLevel;
    fuzzyMatchTolerance: number;
  };
  
  // Country inference configuration
  countryInference: {
    enabled: boolean;
    fallbackToUserRegion: boolean;
    confidenceThreshold: ConfidenceLevel;
  };
  
  // Geocoding configuration
  geocoding: {
    enabled: boolean;
    batchSize: number;
    rateLimit: number; // requests per second
    timeout: number; // milliseconds
    maxRetries: number;
    providers: {
      nominatim: {
        enabled: boolean;
        baseUrl: string;
        userAgent: string;
        rateLimit: number;
      };
      google: {
        enabled: boolean;
        apiKey?: string;
        rateLimit: number;
      };
    };
  };
  
  // Address normalization configuration
  addressNormalization: {
    enabled: boolean;
    provider: 'openai';
    apiKey?: string;
    timeout: number;
    fallbackOnError: boolean;
  };
}

// Telemetry event interfaces
export interface TelemetryEvent {
  event: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface AutoMapTelemetry extends TelemetryEvent {
  event: 'importer_automap_done';
  data: {
    confidenceCounts: {
      high: number;
      medium: number;
      low: number;
    };
    totalFields: number;
    unmappedFields: number;
  };
}

export interface CountryInferenceTelemetry extends TelemetryEvent {
  event: 'importer_country_inferred';
  data: {
    method: InferenceMethod;
    country: string;
    confidence: ConfidenceLevel;
  };
}

export interface GeocodeStartTelemetry extends TelemetryEvent {
  event: 'importer_geocode_started';
  data: {
    rows: number;
    provider: GeocodeProvider;
    batchSize: number;
  };
}

export interface GeocodeProgressTelemetry extends TelemetryEvent {
  event: 'importer_geocode_progress';
  data: {
    done: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
  };
}

export interface GeocodeCompleteTelemetry extends TelemetryEvent {
  event: 'importer_geocode_complete';
  data: {
    success: number;
    failed: number;
    total: number;
    duration: number; // milliseconds
    provider: GeocodeProvider;
  };
}

// UI component interfaces
export interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  reason: string;
  className?: string;
}

export interface CountryInferenceDisplayProps {
  inference: CountryInference;
  editable?: boolean;
  onCountryChange?: (country: string) => void;
}

export interface GeocodeProgressDisplayProps {
  progress: GeocodeProgress;
  onCancel?: () => void;
  showDetails?: boolean;
}

// Field alias dictionary for auto-mapping
export const FIELD_ALIASES = {
  name: [
    'name', 'restaurant', 'store', 'store_name', 'storename', 
    'location_name', 'business_name', 'shop_name', 'outlet_name'
  ],
  address: [
    'address', 'street', 'line1', 'addr', 'location', 
    'street_address', 'full_address', 'address_line_1'
  ],
  city: [
    'city', 'town', 'locality', 'municipality', 'stadt', 
    'ville', 'ciudad', 'place'
  ],
  postcode: [
    'postcode', 'postal_code', 'zip', 'zipcode', 'zip_code', 
    'postal', 'plz', 'post_code', 'code_postal'
  ],
  country: [
    'country', 'country_code', 'nation', 'land', 'pays', 
    'pais', 'country_name'
  ],
  latitude: [
    'lat', 'latitude', 'y', 'coord_y', 'lat_coordinate', 
    'geo_lat', 'latitude_decimal'
  ],
  longitude: [
    'lng', 'lon', 'longitude', 'x', 'coord_x', 'lng_coordinate', 
    'geo_lng', 'longitude_decimal'
  ],
  status: [
    'status', 'state', 'condition', 'store_status', 'restaurant_status',
    'operational_status', 'business_status'
  ],
  externalId: [
    'external_id', 'store_id', 'id', 'external_store_id', 
    'ref_id', 'reference_id', 'unique_id'
  ]
} as const;

export type FieldAlias = keyof typeof FIELD_ALIASES;

// Postcode patterns for country inference
export const POSTCODE_PATTERNS = {
  DE: /^\d{5}$/, // Germany: 5 digits
  US: /^\d{5}(-\d{4})?$/, // USA: 5 digits or 5+4
  UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, // UK format
  FR: /^\d{5}$/, // France: 5 digits
  CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, // Canada: A1A 1A1
  AU: /^\d{4}$/, // Australia: 4 digits
  NL: /^\d{4}\s?[A-Z]{2}$/i, // Netherlands: 1234 AB
  IT: /^\d{5}$/, // Italy: 5 digits
  ES: /^\d{5}$/, // Spain: 5 digits
  CH: /^\d{4}$/, // Switzerland: 4 digits
} as const;

export type CountryCode = keyof typeof POSTCODE_PATTERNS;

// Country display names and flags
export const COUNTRY_INFO = {
  DE: { name: 'Germany', flag: '🇩🇪' },
  US: { name: 'United States', flag: '🇺🇸' },
  UK: { name: 'United Kingdom', flag: '🇬🇧' },
  FR: { name: 'France', flag: '🇫🇷' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
} as const;