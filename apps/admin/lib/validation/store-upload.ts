import { z } from 'zod';

// Core store upload data schema
// Matches the database schema where only 'name' is required
export const StoreUploadSchema = z.object({
  name: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return '';
      return String(val).trim();
    })
    .pipe(z.string().min(1, 'Store name is required').max(255, 'Store name too long')),
  address: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      return String(val).trim();
    })
    .pipe(z.string().max(500, 'Address too long').optional())
    .optional(),
  city: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      return String(val).trim();
    })
    .pipe(z.string().max(100, 'City name too long').optional())
    .optional(),
  postcode: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      return String(val).trim();
    })
    .pipe(z.string().max(20, 'Postcode too long').optional())
    .optional(),
  country: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      return String(val).trim();
    })
    .pipe(z.string().max(100, 'Country name too long').optional())
    .optional(),
  latitude: z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return isNaN(num) ? undefined : num;
    })
    .pipe(z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude').optional())
    .optional(),
  longitude: z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return isNaN(num) ? undefined : num;
    })
    .pipe(z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude').optional())
    .optional(),
  externalId: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      return String(val).trim();
    })
    .pipe(z.string().max(100, 'External ID too long').optional())
    .optional(),
  status: z.union([z.string(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      return typeof val === 'string' ? val.trim() : val;
    })
    .pipe(z.string().max(100, 'Status too long').optional())
    .optional(),
  ownerName: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return undefined;
      return String(val).trim();
    })
    .pipe(z.string().max(255, 'Owner name too long').optional())
    .optional()
});

// Column mapping schema
export const ColumnMappingSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  externalId: z.string().optional(),
  status: z.string().optional(),
  ownerName: z.string().optional()
});

// Upload API request schemas
export const UploadRequestSchema = z.object({
  file: z.any() // File object from multipart form
});

export const IngestRequestSchema = z.object({
  mapping: ColumnMappingSchema,
  rows: z.array(z.record(z.any())),
  country: z.string().min(2, 'Country code is required').max(10, 'Country code too long').optional()
});

// Response schemas
export const UploadResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    headers: z.array(z.string()),
    sampleRows: z.array(z.record(z.any())),
    suggestedMapping: ColumnMappingSchema,
    totalRows: z.number()
  }).optional(),
  error: z.string().optional()
});

export const IngestResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    inserted: z.number(),
    updated: z.number(),
    pendingGeocode: z.number(),
    failed: z.number()
  }).optional(),
  error: z.string().optional()
});

// Validation result schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string())
});

// Geocoding schemas
export const GeocodeRequestSchema = z.object({
  address: z.string(),
  city: z.string(),
  postcode: z.string().optional(),
  country: z.string()
});

export const GeocodeResultSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.string().optional(),
  provider: z.enum(['mapbox', 'google', 'nominatim']),
  status: z.enum(['success', 'failed', 'pending']),
  error: z.string().optional(),
  raw: z.any().optional()
});

// Type exports
export type StoreUploadData = z.infer<typeof StoreUploadSchema>;
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;
export type UploadRequest = z.infer<typeof UploadRequestSchema>;
export type IngestRequest = z.infer<typeof IngestRequestSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type GeocodeRequest = z.infer<typeof GeocodeRequestSchema>;
export type GeocodeResult = z.infer<typeof GeocodeResultSchema>;