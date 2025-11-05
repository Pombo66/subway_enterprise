# Requirements Document

## Introduction

The store upload modal currently requires users to manually map a "country" column from their spreadsheet, even when the country can be automatically inferred from other data like postcodes, city names, addresses, and filenames. This creates friction in the import process, especially for regional data files where all stores belong to the same country. This enhancement integrates the existing country inference logic into the upload UI to make the country field optional when it can be reliably detected.

## Glossary

- **Upload_Modal**: The PreviewModal component that displays column mapping and data preview during store import
- **Country_Inferrer**: Existing service that automatically detects country from filename, postcodes, and address patterns
- **Column_Mapping**: User interface for mapping spreadsheet columns to database fields
- **Smart_Import_Service**: Existing orchestration service that coordinates auto-mapping, country inference, and geocoding
- **Confidence_Badge**: Visual indicator showing reliability of automatic detection (High 🟢, Medium 🟡, Low 🔴)
- **Inferred_Country_Display**: UI component showing detected country with flag emoji and edit capability

## Requirements

### Requirement 1

**User Story:** As an admin user, I want the system to automatically detect the country from my spreadsheet data so that I don't have to manually map a country column when uploading regional store data.

#### Acceptance Criteria

1. WHEN a user uploads a spreadsheet file, THE Upload_Modal SHALL invoke Country_Inferrer to analyze filename and sample data
2. THE Country_Inferrer SHALL examine postcode patterns matching country-specific formats (DE: 5 digits, US: 5 or 5+4 digits, UK: alphanumeric format)
3. THE Country_Inferrer SHALL analyze city names and state/region patterns to identify country
4. THE Country_Inferrer SHALL check filename for country indicators (e.g., "germany_stores.xlsx", "uk-locations.csv")
5. THE Upload_Modal SHALL display inferred country with format "Detected: Germany 🇩🇪 (from postcodes)" showing detection method

### Requirement 2

**User Story:** As an admin user, I want to see the confidence level of country detection so that I can decide whether to accept the automatic detection or manually specify the country.

#### Acceptance Criteria

1. THE Upload_Modal SHALL display confidence badges (High 🟢, Medium 🟡, Low 🔴) next to inferred country
2. WHEN confidence is high (≥80%), THE Upload_Modal SHALL mark country field as satisfied without requiring column mapping
3. WHEN confidence is medium (50-79%), THE Upload_Modal SHALL suggest inferred country but allow user override
4. WHEN confidence is low (<50%), THE Upload_Modal SHALL require manual country selection or column mapping
5. THE Upload_Modal SHALL provide tooltip explaining confidence rating when user hovers over badge

### Requirement 3

**User Story:** As an admin user, I want to manually override the detected country when the automatic detection is incorrect so that I can ensure data accuracy.

#### Acceptance Criteria

1. THE Upload_Modal SHALL display an editable country selector showing inferred country as default value
2. THE Upload_Modal SHALL provide dropdown with all supported countries (DE, US, UK, FR, CA, AU, NL, IT, ES, CH)
3. WHEN user changes country selection, THE Upload_Modal SHALL update all rows to use selected country
4. THE Upload_Modal SHALL preserve user's manual selection even if confidence was high
5. THE Upload_Modal SHALL show visual indicator distinguishing manual selection from automatic inference

### Requirement 4

**User Story:** As an admin user, I want the country field to remain optional when it can be reliably inferred so that I can import data faster without unnecessary manual mapping.

#### Acceptance Criteria

1. WHEN country confidence is high or medium, THE Upload_Modal SHALL not require country column mapping
2. WHEN country confidence is low AND no country column exists, THE Upload_Modal SHALL display error message requesting manual country selection
3. THE Upload_Modal SHALL allow import to proceed with inferred country without column mapping
4. THE Upload_Modal SHALL apply inferred country to all imported rows during database insertion
5. THE Upload_Modal SHALL maintain backward compatibility with spreadsheets that include country columns

### Requirement 5

**User Story:** As an admin user, I want to see which data signals were used for country detection so that I can understand and trust the automatic inference.

#### Acceptance Criteria

1. THE Upload_Modal SHALL display detection method in country display (e.g., "from postcodes", "from filename", "from city names")
2. WHEN multiple signals contribute to detection, THE Upload_Modal SHALL show primary detection method
3. THE Upload_Modal SHALL provide expandable details showing all evidence (e.g., "Found 15 German postcodes: 10115, 80331, 60311...")
4. THE Upload_Modal SHALL update detection explanation when user changes country manually
5. THE Upload_Modal SHALL emit telemetry event with detection method and confidence for analytics

### Requirement 6

**User Story:** As a system administrator, I want country inference to integrate seamlessly with existing auto-mapping and geocoding features so that the complete smart import workflow functions cohesively.

#### Acceptance Criteria

1. THE Upload_Modal SHALL invoke Smart_Import_Service to coordinate auto-mapping and country inference together
2. THE Upload_Modal SHALL pass inferred country to geocoding service for address resolution
3. THE Upload_Modal SHALL maintain existing column mapping UI for all other fields (name, address, city, postcode)
4. THE Upload_Modal SHALL preserve existing validation, preview, and progress indicator functionality
5. THE Upload_Modal SHALL not alter import performance or introduce additional latency beyond country inference computation

### Requirement 7

**User Story:** As an admin user, I want country inference to work with partial or incomplete address data so that I can import stores even when some address components are missing.

#### Acceptance Criteria

1. WHEN only postcodes are available, THE Country_Inferrer SHALL infer country from postcode patterns alone
2. WHEN only city names are available, THE Country_Inferrer SHALL infer country from city/region patterns
3. WHEN only filename contains country information, THE Country_Inferrer SHALL use filename as primary signal
4. THE Country_Inferrer SHALL combine multiple weak signals to achieve medium confidence when no single strong signal exists
5. THE Country_Inferrer SHALL fall back to user's current region setting when all inference methods fail
