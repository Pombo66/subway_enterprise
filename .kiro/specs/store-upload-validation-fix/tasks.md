# Implementation Plan

- [x] 1. Fix validation schema to handle undefined values
  - Update StoreUploadSchema in `apps/admin/lib/validation/store-upload.ts` to include null and undefined in union types for all fields
  - Modify transform functions to properly handle null, undefined, and empty string values
  - Ensure required field (name) rejects empty values after transformation
  - Ensure optional fields return undefined for empty values after transformation
  - _Requirements: 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

- [x] 2. Enhance validation service error logging
  - Add detailed console logging in `validateStoreData` method in `apps/admin/lib/services/validation.ts`
  - Log original data, mapped data, and mapping configuration before validation
  - Log validation errors with full context when validation fails
  - Ensure column mapping doesn't set undefined explicitly for unmapped fields
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Improve ingest API error reporting
  - Update error logging in `apps/admin/app/api/stores/ingest/route.ts` to include more context
  - Log first few rows of data when all validation fails
  - Include sample of validation errors in error response
  - Ensure error messages are user-friendly and actionable
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Verify country inference integration
  - Test that inferred country is properly injected into validation in `validateBatch` method
  - Verify that mapped country column takes precedence over inferred country
  - Ensure country codes and full names are both accepted
  - Test with CSV files that have and don't have country columns
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Test with sample data
  - Test upload with `apps/admin/test-data/sample-stores-10.csv`
  - Verify all 10 rows are validated successfully
  - Verify geocoding is triggered for stores without coordinates
  - Verify stores are saved to database with correct data
  - Check that stores appear on the map after upload
  - _Requirements: 1.1, 1.2, 1.3, 2.4_
