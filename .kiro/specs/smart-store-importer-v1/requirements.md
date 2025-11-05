# Requirements Document

## Introduction

The Smart Store Importer v1 enhances the existing "Import Store Data" modal in the admin dashboard to provide intelligent column mapping, automatic country inference, and background geocoding capabilities. This upgrade aims to streamline the store import process while maintaining compatibility with existing functionality and performance standards.

## Glossary

- **Admin_Dashboard**: The Next.js-based administrative interface for managing stores and data
- **Import_Modal**: The existing UI component for uploading and processing store data files
- **Auto_Mapper**: System component that automatically detects and maps spreadsheet columns to database fields
- **Country_Inferrer**: Component that automatically determines country information from various data signals
- **Background_Geocoder**: Service that converts addresses to latitude/longitude coordinates without blocking the UI
- **Confidence_Indicator**: Visual badge showing the reliability of automatic field mappings
- **BFF_Service**: Backend-for-frontend NestJS service handling API requests and business logic
- **Rate_Limiter**: Component that controls the frequency of geocoding API requests
- **Geocoding_Provider**: External service (Nominatim/Google Maps) that provides coordinate data

## Requirements

### Requirement 1

**User Story:** As an admin user, I want the system to automatically detect and map spreadsheet columns so that I don't have to manually configure field mappings for standard data formats.

#### Acceptance Criteria

1. WHEN a user uploads a spreadsheet file, THE Auto_Mapper SHALL analyze column headers and sample data to suggest field mappings
2. THE Auto_Mapper SHALL display confidence indicators (High 🟢, Medium 🟡, Low 🔴) for each suggested mapping
3. THE Auto_Mapper SHALL recognize common field aliases including name, address, city, postcode, country, latitude, longitude, status, and externalId
4. THE Auto_Mapper SHALL provide tooltip explanations for confidence ratings when users hover over indicators
5. THE Import_Modal SHALL allow users to review and modify suggested mappings before proceeding

### Requirement 2

**User Story:** As an admin user, I want the system to automatically infer country information when it's missing so that I don't have to manually specify countries for regional data imports.

#### Acceptance Criteria

1. WHEN a spreadsheet contains a country column, THE Country_Inferrer SHALL pre-select that column for mapping
2. WHEN no country column exists, THE Country_Inferrer SHALL analyze filename patterns to detect country references
3. WHEN filename analysis is inconclusive, THE Country_Inferrer SHALL examine data patterns such as postcode formats and state codes
4. THE Country_Inferrer SHALL fall back to the user's current region selection when other methods fail
5. THE Import_Modal SHALL display inferred country with format "Detected: Germany 🇩🇪 (editable)" and allow user modification

### Requirement 3

**User Story:** As an admin user, I want the system to automatically geocode addresses in the background so that stores without coordinates are properly positioned on the map without manual intervention.

#### Acceptance Criteria

1. THE Background_Geocoder SHALL skip rows that already contain latitude and longitude values
2. WHEN latitude/longitude is missing, THE Background_Geocoder SHALL construct address strings using available address components
3. THE Background_Geocoder SHALL process geocoding requests in batches of 10-20 rows with visible progress indication
4. THE Background_Geocoder SHALL respect rate limits of 5-10 requests per second with exponential backoff on failures
5. THE Background_Geocoder SHALL support multiple providers (Nominatim as default, Google Maps as optional)

### Requirement 4

**User Story:** As an admin user, I want to see real-time progress and confidence indicators during the import process so that I can monitor the operation and understand the quality of automatic processing.

#### Acceptance Criteria

1. THE Import_Modal SHALL display progress bars showing "x/y geocoded" during background processing
2. THE Import_Modal SHALL remain interactive and responsive while geocoding operations run in background
3. THE Admin_Dashboard SHALL emit telemetry events for auto-mapping completion, country inference, and geocoding progress
4. THE Import_Modal SHALL show toast notifications for key milestones like "Auto-mapped 9 fields (6 🟢, 2 🟡, 1 🔴)"
5. THE Import_Modal SHALL provide error summaries and downloadable CSV for failed geocoding attempts

### Requirement 5

**User Story:** As an admin user, I want the enhanced import functionality to work seamlessly with existing map features so that my current workflows and performance are not disrupted.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL maintain existing Living Map rendering, tiles, layers, and clustering without modification
2. THE Import_Modal SHALL preserve all current data preview and validation functionality
3. THE Background_Geocoder SHALL not alter database schema beyond minimal additions for geocoding job tracking
4. THE Import_Modal SHALL display newly imported stores on the map without requiring additional page reloads
5. THE Admin_Dashboard SHALL maintain current CPU performance levels without introducing tight re-render loops

### Requirement 6

**User Story:** As a system administrator, I want optional address normalization capabilities so that geocoding accuracy can be improved when AI services are available.

#### Acceptance Criteria

1. WHERE IMPORT_ADDRESS_NORMALIZE feature flag is enabled, THE Background_Geocoder SHALL normalize addresses before geocoding
2. WHERE OpenAI API key is configured, THE Background_Geocoder SHALL use AI-based address standardization
3. THE Background_Geocoder SHALL never block import operations when address normalization fails or errors
4. THE Background_Geocoder SHALL fall back to original addresses when normalization services are unavailable
5. THE Import_Modal SHALL function identically whether address normalization is enabled or disabled

### Requirement 7

**User Story:** As an admin user, I want robust error handling and recovery so that import operations complete successfully even when some geocoding requests fail.

#### Acceptance Criteria

1. WHEN geocoding fails for individual rows, THE Background_Geocoder SHALL mark those rows with "needs_review" status
2. THE Background_Geocoder SHALL retry failed requests once with exponential backoff and jitter
3. THE Background_Geocoder SHALL continue processing remaining rows when individual geocoding attempts fail
4. THE Import_Modal SHALL provide detailed error reasons in tooltips for failed geocoding attempts
5. THE Background_Geocoder SHALL respect provider-specific rate limits and include proper user-agent headers for Nominatim