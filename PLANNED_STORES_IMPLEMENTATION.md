# Planned Stores Implementation Plan

## Overview
Allow users to save expansion suggestions as "Planned" stores in the database, which will then be considered in future expansion analysis to fill white space intelligently.

## Key Distinction

### Scenarios (Existing)
- Temporary "what-if" analysis
- Stored in `ExpansionScenario` table
- Can be saved/loaded/deleted
- Suggestions exist only in scenario context

### Planned Stores (New Feature)
- Permanent commitment to a location
- Stored as actual `Store` records with `status: "Planned"`
- Appear on map with purple ring (🟣)
- Included in future expansion runs
- Can be promoted to "Open" when built
- Can be deleted if plans change

## Implementation Steps

### 1. UI Changes ✅ (In Progress)
- [x] Add "Save as Planned Store" button to SuggestionInfoCard
- [ ] Wire up button to call API
- [ ] Add purple ring styling for planned stores on map
- [ ] Show planned stores in store list with purple indicator
- [ ] Add "Delete" option for planned stores

### 2. API Endpoints (To Do)
```typescript
POST /api/stores/planned
- Create a planned store from expansion suggestion
- Body: { suggestion: ExpansionSuggestion, scenarioId?: string }
- Returns: { store: Store }

DELETE /api/stores/{id}
- Delete a planned store (already exists, just need to allow for planned status)

PATCH /api/stores/{id}/status
- Change store status (Planned → Open, etc.)
```

### 3. Database Schema

**Current Store Colors:**
- 🟢 Green = Open stores
- ⚫ Grey = Closed stores  
- 🟡 Yellow = Planned stores (manually added)
- 🟡 with 🟣 Purple ring = AI-suggested planned stores

**Need to Add Field:**
```prisma
model Store {
  id                  String          @id @default(uuid())
  name                String
  address             String?
  postcode            String?
  country             String?
  region              String?
  city                String?
  status              String?         // "Open", "Closed", "Planned"
  ownerName           String?
  latitude            Float?
  longitude           Float?
  annualTurnover      Float?
  openedAt            DateTime?
  cityPopulationBand  String?
  isAISuggested       Boolean?        // NEW: TRUE if saved from expansion suggestion
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
}
```

**Optional Enhancement Fields** (can add later):
- `expansionScenarioId` - Link to scenario that created it
- `expansionConfidence` - AI confidence score
- `expansionRationale` - Why this location
- `plannedOpenDate` - Target opening date

### 4. Expansion Algorithm Update (To Do)
Update `SimpleExpansionService` to:
```typescript
// Current: Only fetches "Open" stores
const existingStores = await prisma.store.findMany({
  where: { status: 'Open' }
});

// New: Fetch both "Open" AND "Planned" stores
const existingStores = await prisma.store.findMany({
  where: { 
    status: { in: ['Open', 'Planned'] }
  }
});
```

This ensures:
- AI sees planned stores as existing locations
- Won't suggest locations too close to planned stores
- Systematically fills white space

### 5. Map Visualization (To Do)
```typescript
// Store marker styling
const getStoreMarkerStyle = (store) => {
  if (store.status === 'Planned') {
    return {
      color: '#8b5cf6', // Purple
      ring: '3px solid #a78bfa', // Purple ring
      icon: '🟣'
    };
  }
  // ... existing logic for Open/Closed
};
```

## User Workflow

1. **Generate Expansion Suggestions**
   - User runs expansion analysis
   - AI generates 25-150 suggestions

2. **Review & Save**
   - User clicks on suggestion marker
   - Reviews AI analysis and confidence
   - Clicks "Save as Planned Store"
   - Suggestion becomes a Store with `status: "Planned"`

3. **Iterative Planning**
   - User runs expansion again
   - AI now sees planned stores
   - Generates new suggestions that avoid planned locations
   - Fills remaining white space

4. **Execution**
   - When store is built, change status: Planned → Open
   - If plans change, delete the planned store

## Benefits

✅ **Iterative Planning**: Each expansion run builds on previous decisions
✅ **Avoid Cannibalization**: Won't suggest stores near planned locations  
✅ **Strategic Coverage**: Systematically fills geographic gaps
✅ **Scenario Independence**: Planned stores persist beyond scenarios
✅ **Audit Trail**: Track which suggestions were committed to
✅ **Flexibility**: Can delete or modify planned stores

## Next Steps

1. Complete UI wiring (connect button to API)
2. Create API endpoint to save planned stores
3. Update expansion algorithm to include planned stores
4. Add purple ring styling to map
5. Test full workflow
6. (Optional) Add metadata fields for richer tracking

## Files to Modify

- [x] `SuggestionInfoCard.tsx` - Add save button
- [ ] `ExpansionIntegratedMapPage.tsx` - Wire up save handler
- [ ] `apps/admin/app/api/stores/planned/route.ts` - Create API endpoint
- [ ] `apps/bff/src/services/ai/simple-expansion.service.ts` - Include planned stores
- [ ] `WorkingMapView.tsx` - Add purple ring styling
- [ ] `StorePerformanceTable.tsx` - Show planned stores with indicator

---

**Status**: UI button added, ready to wire up backend! 🚀
