# JSON Schema Format Fix for OpenAI API

## Problem
The OpenAI API was returning error: `Missing required parameter: 'text.format.name'`

This was happening because the structured output format was incorrectly nested in the API calls.

## Root Cause
The code was passing the JSON schema like this:
```typescript
text: { 
  format: {
    type: 'json_schema',
    json_schema: LocationDiscoveryJSONSchema  // This object already has 'name' and 'schema'
  }
}
```

But the OpenAI API expects:
```typescript
text: { 
  format: {
    type: 'json_schema',
    name: 'schema_name',      // ← name at this level
    schema: { /* schema */ }  // ← just the schema object (note: 'schema' not 'json_schema')
  }
}
```

## Files Fixed

### 1. Location Discovery Service
**File:** `apps/bff/src/services/ai/location-discovery.service.ts`

**Before:**
```typescript
json_schema: LocationDiscoveryJSONSchema
```

**After:**
```typescript
name: LocationDiscoveryJSONSchema.name,
schema: LocationDiscoveryJSONSchema.schema
```

### 2. Strategic Zone Identification Service
**File:** `apps/bff/src/services/ai/strategic-zone-identification.service.ts`

**Before:**
```typescript
json_schema: EnhancedZonesJSONSchema
```

**After:**
```typescript
name: EnhancedZonesJSONSchema.name,
schema: EnhancedZonesJSONSchema.schema
```

### 3. Viability Scoring Validation Service
**File:** `apps/bff/src/services/ai/viability-scoring-validation.service.ts`

**Fixed two instances:**

**Before:**
```typescript
json_schema: {
  name: 'basic_viability_assessment',
  strict: true,
  schema: basicViabilityJsonSchema
}
```

**After:**
```typescript
name: 'basic_viability_assessment',
schema: basicViabilityJsonSchema
```

## Verification
All services now correctly format the `text.format` parameter with:
- `type: 'json_schema'`
- `name: <schema_name>` (at the format level)
- `schema: <schema_object>` (just the schema, not wrapped - note the parameter name is `schema` not `json_schema`)

## Schema Strict Mode Compliance

When using `strict: true` in OpenAI structured outputs, ALL properties defined in an object MUST be listed in the `required` array. This applies recursively to nested objects.

### Fixed Schemas

**Location Discovery Schema:**
- Added `features` to required fields in candidate items
- Added all properties to required in `features` object: `population`, `nearestCompetitor`, `accessibility`, `demographics`
- Added all properties to required in `metadata` object: `generationMethod`, `confidence`
- Added `metadata` to top-level required fields

**Zone Identification Schema:**
- Added `bounds` to required fields in zone items
- Added all properties to required in top-level: `analysisConfidence`, `recommendations`

## Next Steps
The AI pipeline should now work correctly. The errors were preventing:
- Strategic zone identification
- Location discovery
- Viability scoring

All of these should now complete successfully with proper structured output validation.
