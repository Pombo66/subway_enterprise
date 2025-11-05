# Requirements Document

## Introduction

This spec addresses a critical issue where uploading stores with the Smart Store Importer results in only 1 pin appearing on the living map instead of all uploaded stores (e.g., 10 stores uploaded but only 1 pin visible). The system should geocode all stores during upload and display corresponding map pins at their exact addresses.

## Glossary

- **Smart Store Importer**: The system component that handles CSV/Excel file uploads, auto-mapping, country inference, and geocoding
- **Living Map**: The interactive map view at `/stores/map` that displays store locations as pins
- **Geocoding Service**: The service that converts addresses to latitude/longitude coordinates
- **Store Upload Flow**: The complete process from file upload → parsing → geocoding → database storage → map display
- **Map Pin**: A visual marker on the map representing a store location

## Requirements

### Requirement 1: Store Upload Geocoding Verification

**User Story:** As a store manager, I want all uploaded stores to be geocoded with accurate coordinates based on their addresses and postal codes, so that each store appears on the map at its correct location

#### Acceptance Criteria

1. WHEN a user uploads a CSV/Excel file with 10 stores containing addresses and postal codes, THE Smart Store Importer SHALL geocode all 10 stores that lack coordinates
2. WHEN geocoding a store, THE Geocoding Service SHALL use the complete address including street address, city, postal code, and country
3. WHEN geocoding completes successfully for a store, THE Smart Store Importer SHALL save the latitude and longitude values to the database
4. WHEN geocoding fails for a store, THE Smart Store Importer SHALL log the failure reason and mark the store with pending geocode status
5. WHEN the upload process completes, THE Smart Store Importer SHALL return a summary showing the count of successfully geocoded stores
6. THE Smart Store Importer SHALL validate that latitude values are between -90 and 90 degrees
7. WHEN a store has a postal code, THE Geocoding Service SHALL include the postal code in the geocoding request to improve accuracy

### Requirement 2: Database Coordinate Persistence

**User Story:** As a system administrator, I want geocoded coordinates to be reliably saved to the database, so that stores appear on the map after upload

#### Acceptance Criteria

1. WHEN a store is created with valid latitude and longitude values, THE Database SHALL persist both coordinate values
2. WHEN a store is updated with new coordinates, THE Database SHALL update both latitude and longitude fields
3. WHEN querying stores for the map view, THE API SHALL return all stores that have non-null latitude and longitude values
4. THE Database SHALL maintain an index on latitude and longitude fields for efficient spatial queries
5. WHEN coordinates are saved, THE Database SHALL validate that longitude values are between -180 and 180 degrees

### Requirement 3: Map Display Synchronization

**User Story:** As a store manager, I want the living map to display all stores with valid coordinates immediately after upload, so that I can verify the upload was successful and that pins match the store addresses

#### Acceptance Criteria

1. WHEN stores are successfully imported, THE Living Map SHALL refresh its data to include newly uploaded stores
2. WHEN the map loads, THE Living Map SHALL fetch all stores with valid latitude and longitude coordinates
3. WHEN a store has valid coordinates derived from its address and postal code, THE Living Map SHALL render a pin at the exact latitude and longitude position
4. WHEN multiple stores are uploaded with different addresses, THE Living Map SHALL display one pin per store at the geocoded location matching each address
5. THE Living Map SHALL handle stores with identical coordinates by displaying clustered pins or offset markers
6. WHEN a user hovers over a map pin, THE Living Map SHALL display the store name, address, and postal code in a tooltip

### Requirement 4: Geocoding Service Reliability

**User Story:** As a developer, I want the geocoding service to handle batch requests reliably, so that all stores in an upload are processed

#### Acceptance Criteria

1. WHEN the geocoding service receives a batch of addresses, THE Geocoding Service SHALL process each address independently
2. WHEN a geocoding request fails, THE Geocoding Service SHALL retry up to 3 times with exponential backoff
3. WHEN all retry attempts fail, THE Geocoding Service SHALL return a failed status with error details
4. THE Geocoding Service SHALL log each geocoding attempt with request details and response status
5. WHEN geocoding completes, THE Geocoding Service SHALL return results in the same order as the input requests

### Requirement 5: Upload Flow Debugging and Logging

**User Story:** As a developer, I want comprehensive logging throughout the upload flow, so that I can diagnose why stores aren't appearing on the map

#### Acceptance Criteria

1. WHEN a file is uploaded, THE System SHALL log the total number of rows parsed
2. WHEN geocoding starts, THE System SHALL log the number of stores requiring geocoding
3. WHEN each store is geocoded, THE System SHALL log the store name, address, and resulting coordinates
4. WHEN stores are saved to the database, THE System SHALL log the number of inserts and updates
5. WHEN the upload completes, THE System SHALL log a summary including geocoding success rate and database operation counts

### Requirement 6: Map Data Refresh

**User Story:** As a store manager, I want the map to automatically refresh after I upload stores, so that I don't need to manually reload the page

#### Acceptance Criteria

1. WHEN stores are successfully imported, THE System SHALL emit a stores-imported event
2. WHEN the Living Map component receives a stores-imported event, THE Living Map SHALL refetch store data from the API
3. WHEN new store data is fetched, THE Living Map SHALL update the displayed pins without requiring a page reload
4. THE Living Map SHALL display a loading indicator while refreshing data
5. WHEN the refresh completes, THE Living Map SHALL show a notification indicating the number of new stores added
