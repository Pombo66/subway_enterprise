# Design Document

## Overview

This design addresses the validation bug in the store upload system where the Zod schema fails to properly handle undefined values during column mapping. The root cause is that the schema's union types don't include `undefined` as a valid input, causing validation to fail when optional fields are not mapped or are empty.

## Architecture

The fix involves three main components:

1. **Validation Schema** (`apps/admin/lib/validation/store-upload.ts`)
   - Update Zod schema to handle undefined/null values properly
   - Ensure proper type coercion for all field types
   - Maintain backward compatibility with existing data

2. **Validation Service** (`apps/admin/lib/services/validation.ts`)
   - Ensure column mapping handles missing fields correctly
   - Improve error logging for debugging
   - Maintain country inference integration

3. **Ingest API** (`apps/admin/app/api/stores/ingest/route.ts`)
   - Add better error logging to identify validation failures
   - Ensure proper error messages are returned to the client

## Components and Interfaces

### 1. Updated Validation Schema

The core issue is in the field definitions. Current schema:

```typescript
name: z.union([z.string(), z.number()])
  .transform(val => String(val))
  .pipe(z.string().min(1, 'Store name is required'))
```

Problem: When `val` is `undefined`, `String(undefined)` becomes `"undefined"` which passes min(1) check but is semantically wrong.

**Solution**: Include undefined/null in the union and handle them explicitly:

```typescript
name: z.union([z.string(), z.number(), z.null(), z.undefined()])
  .transform(val => {
    if (val === null || val === undefined || val === '') return '';
    return String(val).trim();
  })
  .pipe(z.string().min(1, 'Store name is required').max(255, 'Store name too long'))
```

For optional fields:

```typescript
address: z.union([z.string(), z.number(), z.null(), z.undefined()])
  .transform(val => {
    if (val === null || val === undefined || val === '') return undefined;
    return String(val).trim();
  })
  .pipe(z.string().max(500, 'Address too long').optional())
  .optional()
```

### 2. Validation Service Improvements

**Column Mapping Enhancement**:

```typescript
private applyColumnMapping(data: any, mapping: Record<string, string>): any {
  const mappedData: any = {};
  
  for (const [field, column] of Object.entries(mapping)) {
    // Only include field if column is mapped AND data exists
    if (column && column in data) {
      mappedData[field] = data[column];
    }
    // Don't set undefined explicitly - let schema handle missing fields
  }
  
  return mappedData;
}
```

**Enhanced Error Logging**:

```typescript
validateStoreData(data: any, mapping: Record<string, string>): ValidationResult {
  try {
    const mappedData = this.applyColumnMapping(data, mapping);
    
    console.log('Validating mapped data:', {
      original: data,
      mapped: mappedData,
      mapping
    });
    
    const result = StoreUploadSchema.safeParse(mappedData);
    
    if (!result.success) {
      console.error('Validation failed:', {
        errors: result.error.errors,
        data: mappedData
      });
    }
    
    // ... rest of validation logic
  }
}
```

### 3. Schema Field Definitions

**Required Fields** (name only):
- Must handle: string, number, null, undefined
- Transform: Convert to string, trim, handle empty
- Validate: min(1), max(255)

**Optional Text Fields** (address, city, postcode, country, externalId):
- Must handle: string, number, null, undefined
- Transform: Convert to string or undefined
- Validate: max length only

**Optional Coordinate Fields** (latitude, longitude):
- Must handle: string, number, null, undefined
- Transform: Parse to number or undefined
- Validate: range check (-90 to 90 for lat, -180 to 180 for lng)

**Optional Enum Fields** (status):
- Must handle: string, null, undefined
- Transform: Lowercase and trim
- Validate: enum values

## Data Models

### Input Data Flow

```
CSV Row → Column Mapping → Mapped Data → Validation → Normalized Store
```

Example:

```typescript
// CSV Row
{
  "name": "Subway London Bridge",
  "address": "2 London Bridge Street",
  "city": "London",
  "postcode": "SE1 9RA",
  "country": "United Kingdom"
}

// After Column Mapping
{
  name: "Subway London Bridge",
  address: "2 London Bridge Street",
  city: "London",
  postcode: "SE1 9RA",
  country: "United Kingdom"
  // latitude, longitude, externalId, status are NOT present (undefined)
}

// After Validation (should pass)
{
  name: "Subway London Bridge",
  address: "2 London Bridge Street",
  city: "London",
  postcode: "SE1 9RA",
  country: "United Kingdom",
  latitude: undefined,
  longitude: undefined,
  externalId: undefined,
  status: undefined
}

// After Normalization
{
  name: "Subway London Bridge",
  address: "2 London Bridge Street",
  city: "London",
  postcode: "SE1 9RA",
  country: "United Kingdom",
  region: "EMEA",
  latitude: undefined,  // Will be geocoded
  longitude: undefined,
  externalId: undefined,
  status: undefined
}
```

## Error Handling

### Validation Error Types

1. **Missing Required Field**
   - Error: "name: Store name is required"
   - Cause: Name field is empty, null, or undefined after mapping
   - Resolution: Ensure CSV has name column and it's properly mapped

2. **Invalid Field Type**
   - Error: "name: Invalid input"
   - Cause: Schema can't handle the input type (current bug)
   - Resolution: Update schema to handle all input types

3. **Field Too Long**
   - Error: "name: Store name too long"
   - Cause: Field exceeds maximum length
   - Resolution: Truncate or reject based on business rules

4. **Invalid Coordinate Range**
   - Error: "latitude: Invalid latitude"
   - Cause: Coordinate outside valid range
   - Resolution: Clear coordinate or reject row

### Error Response Format

```typescript
{
  success: false,
  error: "No valid rows found in the uploaded data. First error: name: Store name is required",
  details: {
    totalRows: 10,
    validRows: 0,
    invalidRows: 10,
    firstError: {
      row: 1,
      field: "name",
      message: "Store name is required",
      value: undefined
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **Schema Validation Tests**
   - Test with valid string values
   - Test with numeric values
   - Test with null values
   - Test with undefined values
   - Test with empty strings
   - Test with whitespace-only strings

2. **Column Mapping Tests**
   - Test with all fields mapped
   - Test with only required fields mapped
   - Test with missing columns
   - Test with extra columns

3. **Normalization Tests**
   - Test text normalization
   - Test coordinate parsing
   - Test country inference integration

### Integration Tests

1. **Upload Flow Tests**
   - Upload CSV with all fields
   - Upload CSV with only required fields
   - Upload CSV with inferred country
   - Upload CSV with invalid data

2. **Error Handling Tests**
   - Test validation error messages
   - Test error response format
   - Test partial success scenarios

### Test Data

```csv
# Valid minimal data
name
Subway Test Store

# Valid full data
name,address,city,postcode,country,latitude,longitude
Subway Test,123 Main St,London,SW1A 1AA,United Kingdom,51.5074,-0.1278

# Invalid data (empty name)
name,address,city
,123 Main St,London

# Mixed valid/invalid
name,address
Subway Valid,123 Main St
,456 Oak Ave
Subway Also Valid,789 Elm St
```

## Implementation Notes

1. **Backward Compatibility**: The schema changes maintain backward compatibility with existing valid data
2. **Performance**: No performance impact - validation logic remains the same, just handles more input types
3. **Country Inference**: The fix doesn't affect country inference logic, which operates at a higher level
4. **Database Schema**: No database changes required - this is purely a validation layer fix

## Rollout Plan

1. Update validation schema with proper type handling
2. Add enhanced logging to validation service
3. Test with existing test data
4. Deploy to development environment
5. Verify with real-world CSV uploads
6. Deploy to production

## Success Criteria

- CSV uploads with valid data succeed without validation errors
- Error messages clearly indicate the actual problem
- Country inference continues to work correctly
- No regression in existing functionality
- All test cases pass
