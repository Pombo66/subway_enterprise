# Implementation Plan

- [x] 1. Create UI components for country inference display
  - Create `CountryInferenceDisplay` component with country selector and confidence badge
  - Create `ConfidenceBadge` component with tooltip support
  - Add styling for inference section with confidence colors
  - _Requirements: 2.1, 2.5, 3.1, 3.2, 5.1_

- [x] 2. Integrate country inference into PreviewModal
  - [x] 2.1 Add filename prop to PreviewModalProps interface
    - Update PreviewModalProps type definition
    - Pass filename from UploadStoreData to PreviewModal
    - _Requirements: 1.1, 1.5_

  - [x] 2.2 Add country inference state management
    - Add countryInference and manualCountryOverride state
    - Implement useEffect to run inference on modal open
    - Add country change handler for manual override
    - _Requirements: 1.1, 3.3, 3.4_

  - [x] 2.3 Update validation logic for optional country
    - Modify validateRequiredFields to check inference confidence
    - Make country optional when confidence is high or medium
    - Show error when confidence is low and no column/override
    - _Requirements: 2.2, 2.3, 2.4, 4.1, 4.2_

  - [x] 2.4 Integrate CountryInferenceDisplay into modal UI
    - Add country inference section above column mapping grid
    - Position between file summary and mapping section
    - Wire up country change handler
    - _Requirements: 1.5, 3.1, 5.1_

  - [x] 2.5 Update import handler to pass country
    - Modify handleImport to determine final country value
    - Pass country parameter to onImport callback
    - Update onImport prop signature
    - _Requirements: 3.3, 4.3, 4.4_

- [x] 3. Update UploadStoreData component
  - [x] 3.1 Pass filename to PreviewModal
    - Extract filename from file object
    - Add filename to previewData state
    - Pass filename prop to PreviewModal
    - _Requirements: 1.1_

  - [x] 3.2 Update handleImport callback signature
    - Accept country parameter in handleImport
    - Pass country to ingest API request
    - _Requirements: 4.4_

- [x] 4. Update backend ingest API
  - [x] 4.1 Add country parameter to IngestRequest interface
    - Update IngestRequest type in BFF
    - Make country optional parameter
    - _Requirements: 4.4_

  - [x] 4.2 Apply inferred country to rows without country data
    - Check each normalized store for country field
    - Apply inferred country if missing
    - Preserve country from data if present
    - _Requirements: 4.4, 4.5_

- [x] 5. Update upload API response
  - [x] 5.1 Include filename in upload response
    - Add filename to upload API response data
    - Extract from multer file.originalname
    - _Requirements: 1.1_

- [x] 6. Add telemetry events
  - Emit country_inference_result event with method and confidence
  - Emit country_validation_failed event for low confidence cases
  - Emit import_with_inferred_country event on successful import
  - _Requirements: 5.5_

- [x] 7. Update type definitions
  - Add filename to PreviewModalProps
  - Add country parameter to onImport callback
  - Add country to IngestRequest interface
  - Export CountryInference type from import module
  - _Requirements: 1.1, 4.4_

- [x] 8. Add unit tests for country inference integration
  - [x] 8.1 Test CountryInferenceDisplay component
    - Test rendering with different confidence levels
    - Test manual country override
    - Test disabled state during import
    - _Requirements: 2.1, 3.1, 3.3_

  - [x] 8.2 Test PreviewModal country validation
    - Test validation with high confidence (country optional)
    - Test validation with low confidence (country required)
    - Test validation with manual override
    - Test validation with country column mapped
    - _Requirements: 2.2, 2.3, 4.1, 4.2_

  - [x] 8.3 Test country inference state management
    - Test inference runs on modal open
    - Test manual override updates state
    - Test final country determination logic
    - _Requirements: 1.1, 3.3, 3.4_

- [ ] 9. Add integration tests
  - [ ] 9.1 Test complete import flow with inferred country
    - Upload file with German postcodes
    - Verify country inference displays correctly
    - Complete import and verify country applied to stores
    - _Requirements: 1.1, 1.2, 1.3, 4.3, 4.4_

  - [ ] 9.2 Test manual country override flow
    - Upload ambiguous file
    - Manually select country
    - Verify override is applied to all rows
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 9.3 Test backward compatibility with country columns
    - Upload file with country column
    - Verify column mapping still works
    - Verify inferred country doesn't override column data
    - _Requirements: 4.5_

- [x] 10. Add documentation
  - Update user guide with country inference feature
  - Document confidence levels and what they mean
  - Add examples of filenames that trigger inference
  - Document manual override process
  - _Requirements: 5.1, 5.2, 5.3_
