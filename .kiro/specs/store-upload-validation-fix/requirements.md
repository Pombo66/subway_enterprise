# Requirements Document

## Introduction

This spec addresses a critical validation bug in the store upload feature where valid CSV data is being rejected with "name: Invalid input" errors. The issue occurs when the Zod validation schema doesn't properly handle undefined values during the column mapping process, causing all uploads to fail even when the data is valid.

## Glossary

- **Upload System**: The store data import feature that allows users to upload CSV/Excel files
- **Validation Schema**: Zod schema that validates store data before database insertion
- **Column Mapping**: The process of mapping CSV columns to database fields
- **Normalized Store**: A store object that has been validated and transformed to match database requirements

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to upload valid CSV files with store data, so that I can bulk import stores into the system

#### Acceptance Criteria

1. WHEN a user uploads a CSV file with valid store data including name, address, city, postcode, and country columns, THE Upload System SHALL successfully parse and validate all rows
2. WHEN the column mapping process applies field mappings to raw CSV data, THE Validation Schema SHALL correctly handle undefined values for unmapped optional fields
3. WHEN a required field (name) is present in the CSV data and properly mapped, THE Validation Schema SHALL accept the value regardless of whether optional fields are undefined
4. WHEN the validation schema receives undefined for an optional field, THE Upload System SHALL treat it as a valid empty value rather than throwing a validation error

### Requirement 2

**User Story:** As a developer, I want clear validation error messages, so that I can quickly identify and fix data quality issues

#### Acceptance Criteria

1. WHEN validation fails for a specific field, THE Validation Schema SHALL provide an error message that includes the field name and the specific validation rule that failed
2. WHEN multiple validation errors occur, THE Upload System SHALL collect and return all errors rather than failing on the first error
3. WHEN a required field is missing or empty, THE Validation Schema SHALL return an error message stating "Store name is required"
4. WHEN validation succeeds, THE Upload System SHALL proceed to normalization and geocoding without errors

### Requirement 3

**User Story:** As a system administrator, I want the upload system to handle various data formats gracefully, so that I can import data from different sources

#### Acceptance Criteria

1. WHEN a field value is a string, THE Validation Schema SHALL accept and validate it according to field-specific rules
2. WHEN a field value is a number, THE Validation Schema SHALL convert it to a string and validate it
3. WHEN a field value is null, undefined, or empty string, THE Validation Schema SHALL treat optional fields as valid and required fields as invalid
4. WHEN coordinate fields contain valid numeric strings, THE Validation Schema SHALL parse them to numbers and validate the range

### Requirement 4

**User Story:** As a system administrator, I want the validation to work correctly with the country inference feature, so that I don't have to manually specify country for every upload

#### Acceptance Criteria

1. WHEN country is inferred from filename or data patterns, THE Upload System SHALL inject the inferred country into the validation process
2. WHEN a CSV file does not have a country column but country is inferred, THE Validation Schema SHALL accept the inferred country value
3. WHEN both a mapped country column and inferred country exist, THE Upload System SHALL prioritize the mapped column value
4. WHEN country inference provides a country code, THE Validation Schema SHALL accept both country codes and full country names
