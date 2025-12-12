# Franchisee Regression Diagnosis & Fix

## Problem Summary
- **Issue**: Franchisees page shows "No franchisees found" with 0 counts
- **Root Cause**: Store upload system captures `ownerName` but doesn't create `Franchisee` records
- **User Confirmation**: Previously worked - `ownerName` was displayed as franchisee data

## Expected Flow
1. **Store Upload** → CSV contains `owner_name` column
2. **Ingest Process** → Creates `Franchisee` records from `ownerName` and links stores via `franchiseeId`
3. **Franchisee Page** → Pulls from `Franchisee` table and displays data

## Current State (Broken)
1. **Store Upload** → CSV `owner_name` captured ✅
2. **Ingest Process** → Saves `ownerName` to stores but NO franchisee processing ❌
3. **Franchisee Page** → Queries empty `Franchisee` table → "No franchisees found" ❌

## Implemented Solution

### 1. FranchiseeProcessor Service
**File**: `apps/admin/lib/services/franchisee-processor.ts`
- `processOwnerName()` - Creates/finds franchisee from ownerName
- `batchProcessOwnerNames()` - Handles multiple owners efficiently
- `updateFranchiseeMetrics()` - Calculates store counts and revenue
- `migrateExistingStores()` - Processes existing stores with ownerName

### 2. Updated Store Ingest Route
**File**: `apps/admin/app/api/stores/ingest/route.ts`
- Added franchisee processing step before database operations
- Creates franchisee map from unique ownerNames
- Links stores to franchisees via `franchiseeId`
- Updates franchisee metrics after processing

### 3. Migration API Endpoint
**File**: `apps/admin/app/api/migrate-franchisees/route.ts`
- POST endpoint to process existing stores
- Converts ownerName data to Franchisee records
- Links existing stores to franchisees

### 4. Diagnostic API Endpoint
**File**: `apps/admin/app/api/diagnose-franchisees/route.ts`
- GET endpoint to check current state
- Returns counts, sample data, and diagnosis

## Deployment Status
- ✅ Code committed and pushed to main
- 🔄 Waiting for Railway deployment (~4 minutes)
- ⏳ Will test diagnostic endpoint once deployed

## Next Steps (After Deployment)
1. **Test Diagnostic API**: Check if stores with ownerName exist in production
2. **Run Migration**: If data exists, run migration to create franchisees
3. **Verify Fix**: Check franchisees page shows data
4. **Test Future Uploads**: Ensure new uploads create franchisees automatically

## API Endpoints to Test
```bash
# Diagnostic (check current state)
GET https://subwayadmin-production.up.railway.app/api/diagnose-franchisees

# Migration (fix existing data)
POST https://subwayadmin-production.up.railway.app/api/migrate-franchisees
```

## Expected Results After Fix
- Franchisees page shows actual franchisee data
- Each unique `ownerName` becomes a `Franchisee` record
- Stores linked to franchisees via `franchiseeId`
- Future uploads automatically create/link franchisees