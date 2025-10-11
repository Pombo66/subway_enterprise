# Requirements Document

## Introduction

The filter buttons in the Stores page are currently not working correctly due to a data mismatch between the filter values and the actual store data. The CascadingFilters component uses country codes (e.g., 'GB', 'US') while the store data contains full country names (e.g., 'United Kingdom', 'United States'). This prevents users from effectively filtering stores by region, country, and city.

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to filter stores by region so that I can view only stores in a specific geographic region (EMEA, AMER, APAC).

#### Acceptance Criteria

1. WHEN I select a region from the region dropdown THEN the system SHALL display only stores that belong to that region
2. WHEN I select "All Regions" THEN the system SHALL display all stores regardless of region
3. WHEN I change the region selection THEN the system SHALL reset country and city filters to "All"
4. WHEN I change the region selection THEN the system SHALL update the URL query parameters to reflect the selected region

### Requirement 2

**User Story:** As an admin user, I want to filter stores by country within a selected region so that I can view stores in a specific country.

#### Acceptance Criteria

1. WHEN I select a region THEN the country dropdown SHALL be enabled and populated with countries available in that region
2. WHEN no region is selected THEN the country dropdown SHALL be disabled
3. WHEN I select a country THEN the system SHALL display only stores that belong to that country within the selected region
4. WHEN I select "All Countries" THEN the system SHALL display all stores in the selected region
5. WHEN I change the country selection THEN the system SHALL reset the city filter to "All"
6. WHEN I change the country selection THEN the system SHALL update the URL query parameters to reflect the selected country

### Requirement 3

**User Story:** As an admin user, I want to filter stores by city within a selected country so that I can view stores in a specific city.

#### Acceptance Criteria

1. WHEN I select a country THEN the city dropdown SHALL be enabled and populated with cities available in that country
2. WHEN no country is selected THEN the city dropdown SHALL be disabled
3. WHEN I select a city THEN the system SHALL display only stores that belong to that city within the selected country
4. WHEN I select "All Cities" THEN the system SHALL display all stores in the selected country
5. WHEN I change the city selection THEN the system SHALL update the URL query parameters to reflect the selected city

### Requirement 4

**User Story:** As an admin user, I want the filter state to be preserved in the URL so that I can bookmark or share filtered views.

#### Acceptance Criteria

1. WHEN I apply filters THEN the system SHALL update the URL query parameters to reflect the current filter state
2. WHEN I navigate to a URL with filter parameters THEN the system SHALL apply those filters automatically
3. WHEN I refresh the page with filter parameters THEN the system SHALL maintain the filtered view
4. WHEN I clear all filters THEN the system SHALL remove filter parameters from the URL

### Requirement 5

**User Story:** As an admin user, I want the store count to update dynamically as I apply filters so that I can see how many stores match my criteria.

#### Acceptance Criteria

1. WHEN I apply any filter THEN the system SHALL update the store count display to show the number of filtered results
2. WHEN I combine multiple filters THEN the system SHALL show the count of stores that match all applied filters
3. WHEN no stores match the filter criteria THEN the system SHALL display "No stores found matching your criteria"
4. WHEN I clear all filters THEN the system SHALL display the total count of all stores