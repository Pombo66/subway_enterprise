# Requirements Document

## Introduction

The Store Data Upload feature enables administrators to bulk import store location data via Excel (.xlsx) or CSV files directly within the admin dashboard's List View. The feature provides a complete workflow from file upload through data validation, geocoding, and database ingestion, with real-time preview and feedback capabilities.

## Glossary

- **Admin_Dashboard**: The Next.js 14 web application located in apps/admin that provides the administrative interface
- **List_View**: The tabular display of stores within the Store Management section of the Admin_Dashboard
- **Upload_Modal**: A modal dialog component that handles file selection, column mapping, data preview, and import confirmation
- **Geocoding_Service**: A service that converts address strings to latitude/longitude coordinates using multiple provider fallbacks
- **BFF_Database**: The SQLite database managed by Prisma that stores all store data and is shared between admin and BFF applications
- **Feature_Flag**: Environment variables that control feature availability (NEXT_PUBLIC_ALLOW_UPLOAD, ADMIN_ALLOW_UPLOAD)
- **Column_Mapping**: The process of associating spreadsheet columns with database fields through dropdown selections
- **Deduplication**: The process of identifying and handling duplicate store records based on normalized name and address or external ID
- **Living_Map**: The interactive map component that displays store locations with markers and overlays

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to upload store data files from the List View, so that I can efficiently import multiple store locations without manual entry.

#### Acceptance Criteria

1. WHEN NEXT_PUBLIC_ALLOW_UPLOAD equals true, THE Admin_Dashboard SHALL display an "Upload Store Data (.xlsx, .csv)" button in the List_View header
2. WHEN the administrator clicks the upload button, THE Admin_Dashboard SHALL open a file selection dialog that accepts only .xlsx and .csv files
3. WHEN a valid file is selected, THE Admin_Dashboard SHALL parse the file and open the Upload_Modal with detected data
4. WHERE drag-and-drop functionality is available, THE Admin_Dashboard SHALL accept files dropped onto the upload area
5. IF the file format is unsupported or corrupted, THEN THE Admin_Dashboard SHALL display an error message without opening the Upload_Modal

### Requirement 2

**User Story:** As an administrator, I want to preview and map spreadsheet columns to database fields, so that I can ensure data is imported correctly before processing.

#### Acceptance Criteria

1. WHEN the Upload_Modal opens, THE Admin_Dashboard SHALL display the first 10 rows of parsed data in a preview table
2. THE Admin_Dashboard SHALL auto-detect column mappings using header name heuristics for name, address, city, country, latitude, longitude, and external_id fields
3. THE Admin_Dashboard SHALL provide dropdown selectors above each column allowing manual mapping correction
4. THE Admin_Dashboard SHALL accept flexible header variations including "name/restaurant/store", "address/street/line1", "city/town", "postcode/postal_code/zip", "country/country_code", "lat/latitude", "lng/lon/longitude", "external_id/store_id"
5. THE Admin_Dashboard SHALL display validation status indicators for each row showing valid, invalid, or duplicate status

### Requirement 3

**User Story:** As an administrator, I want the system to validate and deduplicate store data before import, so that I can maintain data quality and avoid duplicate entries.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL validate that each row contains at minimum name, address, city, and country OR latitude and longitude coordinates
2. THE Admin_Dashboard SHALL identify potential duplicates by matching normalized name combined with address, city, postcode, and country
3. WHERE external_id is provided, THE Admin_Dashboard SHALL use external_id as the primary deduplication key
4. THE Admin_Dashboard SHALL display duplicate detection results in the preview with clear indicators for new, update, and duplicate records
5. THE Admin_Dashboard SHALL normalize data by trimming whitespace, applying title case to names and cities, and standardizing country codes

### Requirement 4

**User Story:** As an administrator, I want the system to geocode addresses during import, so that stores appear correctly on the Living_Map without manual coordinate entry.

#### Acceptance Criteria

1. WHEN latitude and longitude are provided in the data, THE Admin_Dashboard SHALL use the provided coordinates without geocoding
2. WHEN coordinates are missing, THE Geocoding_Service SHALL attempt to geocode using the address, city, postcode, and country fields
3. THE Geocoding_Service SHALL try providers in order: Mapbox (if MAPBOX_TOKEN available), Google Maps (if GOOGLE_MAPS_API_KEY available), then Nominatim as fallback
4. THE Geocoding_Service SHALL throttle requests with 250ms delays between calls to respect rate limits
5. IF geocoding fails for a row, THEN THE Admin_Dashboard SHALL insert the store with null coordinates and geocode_status set to "pending"

### Requirement 5

**User Story:** As an administrator, I want to process imports in manageable batches with progress feedback, so that I can monitor large uploads without system overload.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL process geocoding in batches of 20 rows with Promise.allSettled for parallel processing
2. WHEN processing batches larger than 100 rows, THE Admin_Dashboard SHALL add 1-second delays between batches
3. THE Admin_Dashboard SHALL enforce a maximum upload limit of 2,000 rows per file
4. THE Admin_Dashboard SHALL display a progress indicator showing current step: Parse → Validate → Geocode → Upsert → Refresh
5. THE Admin_Dashboard SHALL provide real-time feedback during each processing phase

### Requirement 6

**User Story:** As an administrator, I want the import process to be secured by feature flags, so that the functionality can be controlled in different environments.

#### Acceptance Criteria

1. WHEN NEXT_PUBLIC_ALLOW_UPLOAD is false, THE Admin_Dashboard SHALL hide the upload button completely
2. WHEN ADMIN_ALLOW_UPLOAD is false, THE Admin_Dashboard SHALL reject all upload API requests with a clear error message
3. THE Admin_Dashboard SHALL check server-side feature flags before processing any upload or ingest operations
4. THE Admin_Dashboard SHALL display appropriate error messages when feature flags prevent access
5. THE Admin_Dashboard SHALL document required environment variables for proper feature operation

### Requirement 7

**User Story:** As an administrator, I want imported stores to appear immediately in both List View and Living_Map, so that I can verify the import results without page refreshes.

#### Acceptance Criteria

1. WHEN import completes successfully, THE Admin_Dashboard SHALL display a success toast with summary statistics showing inserted, updated, and pending geocode counts
2. THE Admin_Dashboard SHALL refresh the List_View data to display newly imported stores without full page reload
3. THE Admin_Dashboard SHALL trigger Living_Map data refresh to show new store markers immediately
4. THE Admin_Dashboard SHALL maintain existing map state including zoom level, center position, and selected filters during refresh
5. THE Admin_Dashboard SHALL ensure no performance degradation, infinite loops, or marker drift occurs during the refresh process

### Requirement 8

**User Story:** As an administrator, I want the system to handle errors gracefully during import, so that I receive clear feedback about any issues without system crashes.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL wrap all server operations in try-catch blocks to prevent crashes
2. THE Admin_Dashboard SHALL return structured JSON error responses with appropriate HTTP status codes
3. THE Admin_Dashboard SHALL display user-friendly error messages in toast notifications for all failure scenarios
4. THE Admin_Dashboard SHALL log detailed error information to server console for debugging purposes
5. THE Admin_Dashboard SHALL maintain system stability even when processing malformed or invalid data files

### Requirement 9

**User Story:** As an administrator, I want the upload feature to integrate seamlessly with existing database operations, so that BFF endpoints immediately reflect new data.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL write directly to the BFF_Database using the same Prisma client and DATABASE_URL
2. THE Admin_Dashboard SHALL use upsert operations to handle both new store creation and existing store updates
3. THE Admin_Dashboard SHALL maintain referential integrity and follow existing database constraints
4. THE Admin_Dashboard SHALL ensure all database operations are transactional to prevent partial imports
5. THE Admin_Dashboard SHALL preserve existing store relationships and associated data during updates

### Requirement 10

**User Story:** As an administrator, I want comprehensive type safety and validation throughout the upload process, so that the system maintains reliability and prevents runtime errors.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL define Zod schemas for all upload data validation with proper TypeScript types
2. THE Admin_Dashboard SHALL validate API request and response payloads using type-safe schemas
3. THE Admin_Dashboard SHALL provide TypeScript interfaces for all component props and data structures
4. THE Admin_Dashboard SHALL ensure no TypeScript compilation errors in the upload feature implementation
5. THE Admin_Dashboard SHALL use proper error boundaries to handle unexpected runtime errors gracefully