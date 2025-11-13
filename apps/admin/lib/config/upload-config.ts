import { FeatureFlagError, ERROR_CODES } from '../errors/upload-errors';

// Upload configuration interface
export interface UploadConfig {
  maxFileSizeMB: number;
  maxRowsPerUpload: number;
  geocodingBatchSize: number;
  geocodingDelayMs: number;
  supportedFileTypes: string[];
  allowedMimeTypes: string[];
}

// Feature flags interface
export interface FeatureFlags {
  allowUpload: boolean;
  adminAllowUpload: boolean;
}

// Geocoding provider configuration
export interface GeocodingConfig {
  mapboxToken?: string;
  googleMapsApiKey?: string;
  enableNominatim: boolean;
  userAgent: string;
}

// Default configuration
const DEFAULT_CONFIG: UploadConfig = {
  maxFileSizeMB: 10,
  maxRowsPerUpload: 2000,
  geocodingBatchSize: 20,
  geocodingDelayMs: 250,
  supportedFileTypes: ['.xlsx', '.csv'],
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv'
  ]
};

// Configuration class
export class UploadConfigManager {
  private static instance: UploadConfigManager;
  private config: UploadConfig;
  private featureFlags: FeatureFlags;
  private geocodingConfig: GeocodingConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.featureFlags = this.loadFeatureFlags();
    this.geocodingConfig = this.loadGeocodingConfig();
  }

  public static getInstance(): UploadConfigManager {
    if (!UploadConfigManager.instance) {
      UploadConfigManager.instance = new UploadConfigManager();
    }
    return UploadConfigManager.instance;
  }

  private loadConfig(): UploadConfig {
    return {
      maxFileSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10'),
      maxRowsPerUpload: parseInt(process.env.MAX_ROWS_PER_UPLOAD || '2000'),
      geocodingBatchSize: parseInt(process.env.GEOCODING_BATCH_SIZE || '20'),
      geocodingDelayMs: parseInt(process.env.GEOCODING_DELAY_MS || '250'),
      supportedFileTypes: DEFAULT_CONFIG.supportedFileTypes,
      allowedMimeTypes: DEFAULT_CONFIG.allowedMimeTypes
    };
  }

  private loadFeatureFlags(): FeatureFlags {
    return {
      allowUpload: process.env.NEXT_PUBLIC_ALLOW_UPLOAD === 'true',
      adminAllowUpload: process.env.ADMIN_ALLOW_UPLOAD === 'true'
    };
  }

  private loadGeocodingConfig(): GeocodingConfig {
    return {
      mapboxToken: process.env.MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      enableNominatim: process.env.ENABLE_NOMINATIM !== 'false',
      userAgent: 'Subway-Enterprise-Admin/1.0'
    };
  }

  // Getters
  public getConfig(): UploadConfig {
    return { ...this.config };
  }

  public getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags };
  }

  public getGeocodingConfig(): GeocodingConfig {
    return { ...this.geocodingConfig };
  }

  // Feature flag validation
  public validateClientFeatureFlags(): void {
    if (!this.featureFlags.allowUpload) {
      throw new FeatureFlagError(
        'Upload feature is disabled',
        ERROR_CODES.UPLOAD_DISABLED
      );
    }
  }

  public validateServerFeatureFlags(): void {
    if (!this.featureFlags.adminAllowUpload) {
      throw new FeatureFlagError(
        'Admin upload feature is disabled',
        ERROR_CODES.UPLOAD_DISABLED
      );
    }
  }

  // Configuration validation
  public validateFileSize(fileSizeBytes: number): void {
    const maxSizeBytes = this.config.maxFileSizeMB * 1024 * 1024;
    if (fileSizeBytes > maxSizeBytes) {
      throw new Error(`File size exceeds maximum limit of ${this.config.maxFileSizeMB}MB`);
    }
  }

  public validateRowCount(rowCount: number): void {
    if (rowCount > this.config.maxRowsPerUpload) {
      throw new Error(`Row count exceeds maximum limit of ${this.config.maxRowsPerUpload} rows`);
    }
  }

  public validateFileType(mimeType: string, fileName: string): void {
    const isValidMimeType = this.config.allowedMimeTypes.includes(mimeType);
    const hasValidExtension = this.config.supportedFileTypes.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );

    if (!isValidMimeType && !hasValidExtension) {
      throw new Error(`Unsupported file type. Please upload ${this.config.supportedFileTypes.join(' or ')} files.`);
    }
  }

  // Geocoding provider availability
  public getAvailableGeocodingProviders(): string[] {
    const providers: string[] = [];
    
    if (this.geocodingConfig.mapboxToken) {
      providers.push('mapbox');
    }
    
    if (this.geocodingConfig.googleMapsApiKey) {
      providers.push('google');
    }
    
    if (this.geocodingConfig.enableNominatim) {
      providers.push('nominatim');
    }
    
    return providers;
  }

  public hasGeocodingProviders(): boolean {
    return this.getAvailableGeocodingProviders().length > 0;
  }
}

// Convenience functions
export function getUploadConfig(): UploadConfig {
  return UploadConfigManager.getInstance().getConfig();
}

export function getFeatureFlags(): FeatureFlags {
  return UploadConfigManager.getInstance().getFeatureFlags();
}

export function getGeocodingConfig(): GeocodingConfig {
  return UploadConfigManager.getInstance().getGeocodingConfig();
}

export function validateClientAccess(): void {
  UploadConfigManager.getInstance().validateClientFeatureFlags();
}

export function validateServerAccess(): void {
  UploadConfigManager.getInstance().validateServerFeatureFlags();
}

// Environment variable documentation
export const ENV_VARS_DOCUMENTATION = {
  // Feature flags
  NEXT_PUBLIC_ALLOW_UPLOAD: {
    description: 'Enable/disable upload UI in client',
    default: 'false',
    required: false
  },
  ADMIN_ALLOW_UPLOAD: {
    description: 'Enable/disable upload API routes on server',
    default: 'false',
    required: false
  },
  
  // Database
  DATABASE_URL: {
    description: 'Database connection URL (same as BFF)',
    default: 'file:./dev.db',
    required: true
  },
  
  // Geocoding providers
  MAPBOX_TOKEN: {
    description: 'Mapbox API token for geocoding',
    default: undefined,
    required: false
  },
  GOOGLE_MAPS_API_KEY: {
    description: 'Google Maps API key for geocoding',
    default: undefined,
    required: false
  },
  
  // Configuration
  MAX_UPLOAD_SIZE_MB: {
    description: 'Maximum file size in MB',
    default: '10',
    required: false
  },
  MAX_ROWS_PER_UPLOAD: {
    description: 'Maximum number of rows per upload',
    default: '2000',
    required: false
  },
  GEOCODING_BATCH_SIZE: {
    description: 'Number of addresses to geocode in parallel',
    default: '20',
    required: false
  },
  GEOCODING_DELAY_MS: {
    description: 'Delay between geocoding requests in milliseconds',
    default: '250',
    required: false
  }
} as const;