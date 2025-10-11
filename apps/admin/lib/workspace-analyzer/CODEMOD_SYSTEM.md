# Codemod Generation System

The codemod generation system is a comprehensive solution for automatically restoring UI/UX improvements from a previous "Cursor-era" version while preserving new "Kiro-era" features. This system generates targeted code transformations based on regression analysis.

## Architecture Overview

```
RegressionReport
       ↓
CodemodOrchestrator
       ↓
┌─────────────────┬─────────────────┬─────────────────┐
│  CodemodGenerator │ StylingCodemod  │ FeaturePanelCodemod │
│  (KPI Tiles)     │  Generator      │  Generator          │
└─────────────────┴─────────────────┴─────────────────┘
       ↓
ComprehensiveCodemodPlan
       ↓
ExecutionPlan + SafetyValidation + RollbackPlan
```

## Core Components

### 1. CodemodGenerator (`codemod-generator.ts`)

**Purpose**: Generates KPI tile restoration codemods

**Key Features**:
- Restores missing KPI tiles with proper structure and styling
- Creates data wiring logic with safe fallbacks
- Updates CSS grid layout from 4-column to 3x3 grid for 9 tiles
- Generates TypeScript-safe code with proper imports

**Example Output**:
```tsx
{/* Total Stores - Restored KPI Tile */}
<div className="s-card s-cardAccent">
  <div className="s-blob s-blobGreen">
    <svg className="s-icon" viewBox="0 0 24 24">...</svg>
  </div>
  <div className="s-cardContent">
    <div className="s-k">Total Stores</div>
    <div className="s-v">{kpis.totalStores ?? "—"}</div>
  </div>
</div>
```

### 2. StylingCodemodGenerator (`styling-codemod.ts`)

**Purpose**: Handles CSS custom properties and styling token restoration

**Key Features**:
- Restores missing CSS custom properties and styling tokens
- Fixes icon alignment and spacing issues
- Applies proper radius, shadow, and gap tokens
- Maintains responsive design compatibility

**Example Output**:
```css
/* Restored spacing tokens */
--s-gap: 12px;
--s-radius: 12px;
--s-shadow: 0 8px 24px rgba(0,0,0,.35);
```

### 3. FeaturePanelCodemodGenerator (`feature-panel-codemod.ts`)

**Purpose**: Restores lost feature panels with graceful empty states

**Key Features**:
- Generates complete feature panel components
- Ensures compatibility with current data layer
- Provides safe fallbacks for missing data
- Maintains integration with existing component hierarchy

**Example Output**:
```tsx
{/* Recent Orders - Restored Feature Panel */}
<div className="s-panelCard">
  <div className="s-panelT">Recent Orders</div>
  <div className="s-list">
    {recentOrders?.length > 0 ? (
      recentOrders.map((item, index) => (
        <div key={index} className="s-listItem">
          <div className="s-listLabel">{item.label}</div>
          <div className="s-listValue">{item.value}</div>
        </div>
      ))
    ) : (
      <div className="s-empty">No orders available</div>
    )}
  </div>
</div>
```

### 4. CodemodOrchestrator (`codemod-orchestrator.ts`)

**Purpose**: Integrates all codemod generators and provides unified interface

**Key Features**:
- Generates comprehensive codemod plans
- Performs safety validations
- Creates optimal execution order
- Provides rollback capabilities

## Usage

### Basic Usage

```typescript
import { CodemodOrchestrator } from './codemod-orchestrator';
import { RegressionReport } from './regression-detector';

const orchestrator = new CodemodOrchestrator();

// Generate comprehensive codemod plan
const plan = await orchestrator.generateComprehensiveCodemodPlan(regressionReport);

// Validate safety
const safetyResult = orchestrator.validateCodemodSafety(plan);

// Get optimal execution order
const executionPlan = orchestrator.generateOptimalExecutionOrder(plan);
```

### Individual Generators

```typescript
import { CodemodGenerator } from './codemod-generator';
import { StylingCodemodGenerator } from './styling-codemod';
import { FeaturePanelCodemodGenerator } from './feature-panel-codemod';

// KPI restoration
const kpiGenerator = new CodemodGenerator();
const kpiPlan = kpiGenerator.generateCodemodPlan(regressionReport);

// Styling restoration
const stylingGenerator = new StylingCodemodGenerator();
const stylingCodemods = stylingGenerator.generateStylingCodemods(stylingRegressions);

// Feature panel restoration
const panelGenerator = new FeaturePanelCodemodGenerator();
const panelCodemods = panelGenerator.generateFeaturePanelCodemods(featureRegressions);
```

## Safety Features

### 1. TypeScript Compatibility
- All generated code maintains proper TypeScript types
- Ensures imports are correctly added
- Validates component props and interfaces

### 2. Data Layer Safety
- Includes null checking and fallback values
- Provides safe data access patterns
- Maintains compatibility with existing data flows

### 3. New Feature Preservation
- Identifies and preserves Kiro-era telemetry hooks
- Ensures new components remain untouched
- Validates no interference with existing functionality

### 4. Rollback Capability
- Generates detailed rollback plans
- Maintains backup locations for all changes
- Provides atomic operations for clean reverts

## Confidence Scoring

Each generated change includes a confidence score (0-1):

- **High (0.9-1.0)**: Simple styling token restoration, straightforward component additions
- **Medium (0.7-0.8)**: KPI tile restoration with data wiring, layout modifications  
- **Low (0.5-0.6)**: Complex component restoration, data layer integration
- **Needs Review (<0.5)**: Ambiguous changes, potential breaking modifications

## Execution Order

The system generates an optimal execution order:

1. **CSS Tokens** - Restore foundation styling tokens
2. **KPI Grid** - Restore missing tiles and grid layout
3. **Feature Panels** - Restore lost panels with empty states
4. **Component Styling** - Apply final styling and alignment fixes

## File Targets

### Primary Target Files
- `app/styles/theme.css` - CSS custom properties and tokens
- `app/dashboard/page.tsx` - KPI tiles and feature panels
- Component files - Styling and alignment fixes

### Generated Changes
- **CSS Properties**: Custom properties in `:root` selector
- **Component Additions**: New KPI tiles and feature panels
- **Class Additions**: Icon alignment and spacing fixes
- **Data Wiring**: Safe data access with fallbacks

## Testing

The system includes comprehensive tests:

```bash
# Run all codemod generation tests
npx tsx apps/admin/lib/workspace-analyzer/codemod-generator-test.ts
```

### Test Coverage
- KPI tile restoration generation
- Data wiring with fallbacks
- CSS property restoration
- Icon alignment fixes
- Feature panel restoration
- Empty state generation
- Safety validation
- Execution order optimization

## Error Handling

### Graceful Degradation
- Continues processing when individual components fail
- Reports errors without stopping the entire process
- Provides detailed error messages with context

### Error Types
- `file_not_found` - Missing source files
- `parse_error` - Code parsing failures
- `path_resolution` - File path issues
- `permission_denied` - File access problems

## Integration Points

### With Regression Detector
```typescript
const regressionReport = regressionDetector.generateRegressionReport(
  oldGrid, currentGrid,
  oldStyleAnalysis, currentStyleAnalysis,
  oldPanelAnalysis, currentPanelAnalysis
);

const codemodPlan = await orchestrator.generateComprehensiveCodemodPlan(regressionReport);
```

### With Workspace Analyzer
```typescript
const oldStructure = await analyzer.extractComponentStructure('old');
const currentStructure = await analyzer.extractComponentStructure('current');

// Use structures to inform codemod generation
```

## Best Practices

### 1. Always Validate Safety
```typescript
const safetyResult = orchestrator.validateCodemodSafety(plan);
if (safetyResult.overallStatus === 'unsafe') {
  console.warn('Unsafe changes detected, manual review required');
}
```

### 2. Check Confidence Scores
```typescript
const lowConfidenceChanges = plan.executionPlan.filter(step => step.confidence < 0.8);
if (lowConfidenceChanges.length > 0) {
  console.log('Low confidence changes require review:', lowConfidenceChanges);
}
```

### 3. Use Execution Order
```typescript
const orderedSteps = orchestrator.generateOptimalExecutionOrder(plan);
// Execute steps in the provided order for best results
```

### 4. Maintain Rollback Plans
```typescript
// Always generate and preserve rollback plans
const rollbackPlan = plan.rollbackPlan;
// Store rollback plan for potential use
```

## Limitations

### Current Limitations
- Focuses on frontend code only (JS/TS/TSX/CSS)
- Does not modify database schemas or API routes
- Requires manual review for complex data layer changes
- Limited to specific styling system (s-* classes)

### Future Enhancements
- Support for additional styling systems
- Enhanced data layer compatibility detection
- Automated testing of generated code
- Integration with build systems for validation

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**
   - Review the specific changes flagged
   - Check data source availability
   - Validate component structure assumptions

2. **Safety Validation Failures**
   - Check TypeScript compatibility
   - Verify data layer assumptions
   - Ensure new features are preserved

3. **Execution Order Problems**
   - Follow the generated execution plan
   - Resolve dependencies before proceeding
   - Check file modification conflicts

### Debug Information

Enable detailed logging:
```typescript
const errors = orchestrator.getErrors();
console.log('Codemod generation errors:', errors);
```

## Contributing

When extending the codemod generation system:

1. **Add Tests**: Include comprehensive test coverage
2. **Maintain Safety**: Ensure all safety checks pass
3. **Document Changes**: Update this README and inline docs
4. **Follow Patterns**: Use existing interfaces and patterns
5. **Validate Output**: Test generated code compiles and runs

## Related Files

- `regression-detector.ts` - Provides input data
- `workspace-analyzer.ts` - Provides workspace analysis
- `component-extractor.ts` - Provides component structure data
- `style-extractor.ts` - Provides styling analysis
- `feature-panel-detector.ts` - Provides panel analysis
- `codemod-generator-test.ts` - Test suite