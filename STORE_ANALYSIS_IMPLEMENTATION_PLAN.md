# Store Performance Analysis System - Implementation Plan

## Status: IN PROGRESS

### ✅ Completed
1. Database schema created (StoreAnalysisJob, StoreAnalysis tables)
2. Prisma migration applied

### 🚧 Next Steps

#### Phase 1: Backend Services (BFF)
1. Create `store-analysis.service.ts` - AI analysis logic
2. Add analysis endpoint to `expansion.controller.ts`
3. Integrate with background worker
4. Add job status endpoint

#### Phase 2: Frontend Components
1. Create `StoreAnalysisControls.tsx` - Trigger analysis
2. Create `StoreAnalysisResults.tsx` - Display results
3. Update `StoreDrawer.tsx` - Show analysis in store details
4. Add color coding to map markers

#### Phase 3: Integration
1. Add "Analyze Stores" mode toggle
2. Wire up API calls
3. Add loading states
4. Add result visualization

## Architecture

```
User clicks "Analyze Stores"
  ↓
Next.js API creates StoreAnalysisJob
  ↓
BFF Background Worker picks up job
  ↓
Calls GPT-5 with store + franchisee data
  ↓
Saves StoreAnalysis records
  ↓
Frontend polls for completion
  ↓
Displays color-coded results on map
```

## Files to Create/Modify

### New Files
- `apps/bff/src/services/ai/store-analysis.service.ts`
- `apps/admin/app/stores/map/components/StoreAnalysisControls.tsx`
- `apps/admin/app/stores/map/components/StoreAnalysisResults.tsx`
- `apps/admin/app/api/store-analysis/generate/route.ts`
- `apps/admin/app/api/store-analysis/jobs/[jobId]/route.ts`

### Modified Files
- `apps/bff/src/services/expansion-job-worker.service.ts` (add analysis job processing)
- `apps/bff/src/routes/expansion.controller.ts` (add analysis endpoints)
- `apps/admin/app/stores/map/components/StoreDrawer.tsx` (show analysis)
- `apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx` (add analysis mode)

## Data Flow

### Input Data
```typescript
{
  storeId: string;
  location: { lat, lng, city };
  revenue: number;
  franchisee: {
    name: string;
    experienceYears: number;
    storeCount: number;
  };
}
```

### GPT Analysis
- Location quality assessment
- Expected vs actual performance
- Root cause identification
- Actionable recommendations

### Output Data
```typescript
{
  locationQualityScore: 0-100;
  performanceGap: number;
  primaryFactor: "LOCATION" | "FRANCHISEE" | "MARKET";
  recommendations: string[];
  estimatedImpact: number;
}
```

## Visual Design

### Map Markers
- 🟢 GREEN: Optimal (good location + good performance)
- 🟡 YELLOW: Location issue (underperforming location)
- 🟠 ORANGE: Franchisee issue (good location, underperforming)
- 🔴 RED: Critical (poor location + poor performance)
- 🔵 BLUE: Exceptional (overperforming)

### Store Drawer Enhancement
Add "Performance Analysis" tab showing:
- Location quality score with breakdown
- Performance gap visualization
- Root cause analysis
- Prioritized recommendations
- Estimated impact

## Implementation Time Estimate
- Phase 1 (Backend): 2-3 hours
- Phase 2 (Frontend): 2-3 hours  
- Phase 3 (Integration): 1-2 hours
- **Total**: 5-8 hours

## Next Action
Continue with Phase 1: Create store-analysis.service.ts
