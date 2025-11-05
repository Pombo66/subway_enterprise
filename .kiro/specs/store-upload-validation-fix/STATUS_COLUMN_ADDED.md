# Status Column Added

## Summary

Added a Status column to the store list view that extracts data from the "Restaurant Status" column in uploaded CSV files.

## Changes Made

### 1. Database Schema (`packages/db/prisma/schema.prisma`)
- Added `status` field to the Store model
- Added index on `status` field for better query performance

```prisma
model Store {
  ...
  status         String?
  ...
  @@index([status])
}
```

### 2. Column Mapping (`apps/admin/lib/types/store-upload.ts`)
- Updated HEADER_SYNONYMS to recognize "Restaurant Status" column
- Added synonyms: `'restaurant_status'`, `'restaurant status'`

### 3. Data Ingestion (`apps/admin/app/api/stores/ingest/route.ts`)
- Updated storeData object to include `status` field
- Status is now saved to database during import

### 4. List View (`apps/admin/app/stores/page.tsx`)
- Added `status` field to Store interface
- Added Status column to the table header
- Added Status cell with badge styling
- Status badge uses dynamic CSS class based on status value

## How It Works

1. **CSV Upload**: When you upload a CSV with a "Restaurant Status" column, it's automatically detected
2. **Column Mapping**: The system maps "Restaurant Status" → `status` field
3. **Validation**: Status is validated and normalized
4. **Storage**: Status is saved to the database
5. **Display**: Status appears in the list view with badge styling

## Status Badge Styling

The status is displayed with a badge that has dynamic styling based on the status value:
- Class format: `status-{lowercase-status-with-dashes}`
- Examples:
  - "Open & Operating" → `status-open-&-operating`
  - "Closed" → `status-closed`
  - "Planned" → `status-planned`

You can add custom CSS for different status types in your stylesheet.

## Example CSV Format

```csv
name,address,city,postcode,country,Restaurant Status
Subway Berlin,Kurfurstendamm 180,Berlin,10707,Germany,Open & Operating
Subway Munich,Maximilianstr. 7,München,87700,Germany,Closed
Subway Hamburg,Gleisstr. 1,Hamburg,68766,Germany,Planned
```

## Database Migration

The Prisma client has been regenerated with the new schema. The status field is optional (nullable) so existing stores without status will show "—" in the list view.

## Testing

To test the Status column:
1. Upload a CSV file with a "Restaurant Status" column
2. Check that the status is displayed in the list view
3. Verify the status badge styling

## Next Steps

If you want to add custom styling for different status types, you can add CSS like:

```css
.badge.status-open-operating {
  background: #28a745;
  color: white;
}

.badge.status-closed {
  background: #dc3545;
  color: white;
}

.badge.status-planned {
  background: #ffc107;
  color: #000;
}
```
