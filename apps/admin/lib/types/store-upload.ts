// Core data interfaces
export interface ParsedRow {
  index: number;
  data: Record<string, any>;
  validationStatus: 'valid' | 'invalid' | 'duplicate';
  validationErrors: string[];
  isDuplicate: boolean;
  duplicateOf?: string;
}

export interface ImportSummary {
  inserted: number;
  updated: number;
  pendingGeocode: number;
  failed: number;
}

export interface NormalizedStore {
  name: string;
  address: string;
  city: string;
  postcode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  externalId?: string;
  status?: string;
  ownerName?: string;
  region?: string; // Auto-assigned based on country
}

export interface DuplicateInfo {
  rowIndex: number;
  duplicateOf: string;
  matchType: 'external_id' | 'address_match';
  confidence: number;
}

// File parsing interfaces
export interface ParseResult {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

export interface HeaderMapping {
  detected: string;
  suggested: string;
  confidence: number;
}

// Component prop interfaces
export interface UploadStoreDataProps {
  onUploadSuccess: (summary: ImportSummary) => void;
  onRefreshData: () => void;
}

export interface PreviewModalProps {
  isOpen: boolean;
  detectedHeaders: string[];
  sampleRows: ParsedRow[];
  suggestedMapping: Record<string, string>;
  totalRows: number;
  filename: string;
  onClose: () => void;
  onImport: (mapping: Record<string, string>, country: string) => Promise<void>;
}

export interface ProgressIndicatorProps {
  currentStep: 'parse' | 'validate' | 'geocode' | 'upsert' | 'refresh';
  progress: number; // 0-100
  message: string;
  isVisible: boolean;
}

// Service interfaces
export interface FileParserService {
  parseExcel(buffer: Buffer): Promise<ParseResult>;
  parseCSV(buffer: Buffer): Promise<ParseResult>;
  detectHeaders(rows: any[][]): string[];
  suggestMapping(headers: string[]): Record<string, string>;
}

export interface GeocodingService {
  geocodeAddress(request: import('./store-upload').GeocodeRequest): Promise<import('./store-upload').GeocodeResult>;
  batchGeocode(requests: import('./store-upload').GeocodeRequest[]): Promise<import('./store-upload').GeocodeResult[]>;
}

export interface ValidationService {
  validateStoreData(data: any, mapping: Record<string, string>): import('./store-upload').ValidationResult;
  normalizeStoreData(data: any, mapping: Record<string, string>): NormalizedStore;
  detectDuplicates(stores: NormalizedStore[]): DuplicateInfo[];
}

// Error interfaces
export interface UploadError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Configuration interfaces
export interface UploadConfig {
  maxFileSizeMB: number;
  maxRowsPerUpload: number;
  geocodingBatchSize: number;
  geocodingDelayMs: number;
  supportedFileTypes: string[];
}

// Feature flag interfaces
export interface FeatureFlags {
  allowUpload: boolean;
  adminAllowUpload: boolean;
}

// Progress tracking interfaces
export interface ProgressUpdate {
  step: 'parse' | 'validate' | 'geocode' | 'upsert' | 'refresh';
  progress: number;
  message: string;
  currentItem?: number;
  totalItems?: number;
}

export interface BatchProgress {
  batchIndex: number;
  totalBatches: number;
  itemsInBatch: number;
  completedItems: number;
}

// Header detection constants
export const HEADER_SYNONYMS = {
  name: ['name', 'store', 'store_name', 'storename', 'location_name'],
  address: ['address', 'street', 'line1', 'addr', 'location', 'street_address'],
  city: ['city', 'town', 'locality', 'municipality', 'city, state zip', 'city state zip'],
  postcode: ['postcode', 'postal_code', 'zip', 'zipcode', 'zip_code', 'postal'],
  // Removed latitude and longitude - will be geocoded from address
  externalId: ['external_id', 'store_id', 'id', 'external_store_id', 'ref_id', 'restaurant'], // Restaurant ID goes here
  status: ['status', 'state', 'condition', 'store_status', 'restaurant_status', 'restaurant status'],
  ownerName: ['owner_name', 'owner', 'franchisee', 'primary_owner_name', 'primary owner name', 'primary owner', 'franchise_owner']
} as const;

export type HeaderSynonym = keyof typeof HEADER_SYNONYMS;