# GPT Model Selection Feature

## Overview
Added the ability to toggle between GPT-5 and GPT-5 Mini for the simple expansion system, allowing you to use the full GPT-5 model for demos while keeping GPT-5 Mini as the default for cost-effective operations.

## Implementation

### 1. Backend Changes

#### Simple Expansion Service (`apps/bff/src/services/ai/simple-expansion.service.ts`)
- Added optional `model` parameter to `SimpleExpansionRequest` interface
- Changed `MODEL` constant to `DEFAULT_MODEL` (defaults to `gpt-5-mini`)
- Service now uses the requested model or falls back to default
- Model name is included in response metadata

#### Expansion Controller (`apps/bff/src/routes/expansion.controller.ts`)
- Added optional `model` parameter to `/ai/pipeline/execute` endpoint
- Passes model selection through to SimpleExpansionService
- Logs which model is being used
- Includes model in telemetry events

### 2. Shared Package Changes

#### Expansion Interface (`packages/shared-expansion/src/interfaces/expansion.interface.ts`)
- Added optional `model?: 'gpt-5' | 'gpt-5-mini'` to `GenerationParams` interface

#### Expansion Service (`packages/shared-expansion/src/services/expansion.service.ts`)
- Passes model parameter through to BFF AI pipeline controller

### 3. Frontend Changes

#### Expansion Controls (`apps/admin/app/stores/map/components/ExpansionControls.tsx`)
- Added model selection dropdown above the Expansion Intensity slider
- Options:
  - **GPT-5 Mini (Fast & Cost-effective)** - Default
  - **GPT-5 (Premium Quality)** - For demos
- Shows helpful description based on selection
- Model selection is passed through to generation params

#### API Route (`apps/admin/app/api/expansion/generate/route.ts`)
- Accepts and passes through model parameter from request body

## Usage

### In the UI
1. Enable Expansion Mode
2. Select your desired model from the "AI Model" dropdown:
   - **GPT-5 Mini**: Fast, cost-effective (default)
   - **GPT-5**: Premium quality for demos
3. Configure other parameters (region, intensity)
4. Click "Generate Expansion Plan"

### Default Behavior
- If no model is specified, the system defaults to `gpt-5-mini`
- All existing code continues to work without changes
- Backward compatible with previous implementations

## Benefits

✅ **Zero Breaking Changes** - Existing calls work exactly as before
✅ **Backward Compatible** - Defaults to mini if not specified  
✅ **Demo-Ready** - Easy to switch to GPT-5 for presentations
✅ **Cost-Aware** - You control when to use the expensive model
✅ **No Code Duplication** - Same logic, just different model parameter

## Model Comparison

| Feature | GPT-5 Mini | GPT-5 |
|---------|-----------|-------|
| Speed | ⚡ Fast | 🐢 Slower |
| Cost | 💰 Low | 💎 High |
| Quality | ✅ Good | 🌟 Excellent |
| Use Case | Daily operations | Demos & presentations |

## Sparkle Badge for High Confidence Locations ✨

Added visual indicator for premium expansion opportunities:

### Map Visualization
- **Sparkle badge (✨)** appears on suggestions with confidence > 0.75
- Rendered as a symbol layer on top of the suggestion marker
- Gold color (#f59e0b) with white halo for visibility
- Positioned at top-right of the marker circle

### Confidence Tiers
- **HIGH CONFIDENCE (>0.75)**: Premium locations with sparkle ✨ badge
  - Major city centers or transportation hubs
  - Population >100k with low store density
  - >5km from nearest store
  - Strong demographic indicators

- **MEDIUM CONFIDENCE (0.51-0.75)**: Standard opportunities
  - Mid-sized cities or suburban centers
  - 3-5km from nearest store

- **LOW CONFIDENCE (≤0.50)**: Experimental locations
  - Smaller towns or emerging areas
  - Requires strong justification

### Implementation Details
- Added `expansion-suggestions-sparkle` symbol layer to WorkingMapView
- Filter: `['>', ['get', 'confidence'], 0.75]`
- Properly cleaned up when suggestions are cleared
- Works with both GPT-5 and GPT-5 Mini models

## Strategic Analysis Panel 📊

GPT now provides executive-level strategic analysis alongside individual suggestions:

### What's Included
- **Market Gaps**: Identifies underserved regions, commuter corridors, and white space opportunities
- **Strategic Recommendations**: Phased rollout strategy with prioritization (Conservative → Aggressive → Experimental)

### UI Display
- Appears as a collapsible panel in the bottom-left corner after generation
- Purple gradient header with expand/collapse controls
- Two sections:
  - 🎯 **Market Gaps Identified**: Geographic analysis of coverage gaps
  - 💡 **Strategic Recommendations**: Prioritized expansion phases and rollout strategy
- Can be closed and reopened as needed

### Example Analysis
```
Market Gaps: "Significant white space exists in: (1) Ruhr sub-centers 
without coverage (Bochum, Hagen), (2) Northern suburban Hamburg belt 
(Pinneberg, Elmshorn), (3) Brandenburg's commuter towns..."

Recommendations: "Prioritize Mode A (Conservative) city-center and 
station anchors in uncovered mid-sized cities. Next, pursue Mode B 
(Aggressive) high-growth commuter belts. Roll out in waves to monitor 
sales cannibalization..."
```

## Technical Notes

- Model selection flows through the entire stack: UI → API Route → Shared Service → BFF Controller → Simple Expansion Service
- The model parameter is optional at every level, ensuring backward compatibility
- Telemetry events track which model was used for cost analysis
- The implementation is clean and doesn't touch core expansion logic
- Confidence scoring is now more explicit in the prompt, leading to better differentiation between premium and standard locations
- Strategic analysis is captured from GPT response and displayed in a dedicated panel
