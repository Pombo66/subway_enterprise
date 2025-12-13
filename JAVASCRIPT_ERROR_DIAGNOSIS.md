# JavaScript Error Diagnosis: ReferenceError Before Initialization

## Error Pattern Analysis

### Current Error
```
ReferenceError: Cannot access 'eP' before initialization
at I (4514-3c02e48359d974b8.js:1:54005)
```

### Previous Errors
1. `ReferenceError: Cannot access 'eF' before initialization`
2. `ReferenceError: Cannot access 'eR' before initialization`
3. `ReferenceError: handleRefreshCompetitors is not defined`

### Pattern Recognition
- Error persists across multiple fixes
- Minified variable names change: eF → eR → eP
- Same file pattern: 4514-[hash].js
- Same approximate line position: ~54000-55000
- Suggests the same underlying issue with different variable names

## Root Cause Analysis

### 1. Minified Variable Names
- `eF`, `eR` are minified variable names in production build
- These suggest React component or hook variables
- The error occurs during component initialization/rendering

### 2. Error Location Pattern
- Always occurs in the same file pattern: `4514-[hash].js`
- Always at similar line positions (~55000 range)
- Suggests the same component is causing the issue

### 3. Timing Analysis
- Error occurs during component mount/render cycle
- Happens before component is fully initialized
- Related to React's reconciliation process

## Potential Root Causes

### A. Circular Dependencies
**Symptoms**: Variables referenced before they're defined
**Evidence**: 
- Error persists across different fix attempts
- Occurs during initialization phase
- Affects minified variables (React internals)

### B. useCallback/useEffect Dependency Issues
**Symptoms**: Functions referenced in dependency arrays before definition
**Evidence**:
- Started when we added `handleRefreshCompetitors` with useCallback
- Dependency array includes the function itself
- React can't resolve the dependency chain

### C. Import/Export Order Issues
**Symptoms**: Modules imported before they're fully initialized
**Evidence**:
- Error in minified code suggests bundler optimization issues
- Could be related to dynamic imports or code splitting

### D. React Strict Mode Issues
**Symptoms**: Double-rendering causing initialization problems
**Evidence**:
- Development vs production behavior differences
- Timing-sensitive initialization code

## Component Analysis

### ExpansionIntegratedMapPage Structure Issues

1. **Complex useEffect Chain**:
   ```typescript
   useEffect(() => {
     // Multiple event listeners
     // Complex dependency array
     // Nested function definitions
   }, [refetch, handleRefreshCompetitors]);
   ```

2. **useCallback Dependency Loops**:
   ```typescript
   const handleRefreshCompetitors = useCallback(async () => {
     // Uses: competitorsLoading, viewport, loadCompetitors
   }, [competitorsLoading, viewport.zoom, viewport.latitude, viewport.longitude, loadCompetitors]);
   ```

3. **State Update Chains**:
   - Multiple useState hooks with interdependencies
   - State updates triggering re-renders during initialization

## Specific Problem Areas

### 1. Event Listener Management
```typescript
// PROBLEMATIC: Function defined in useEffect but used in dependency
useEffect(() => {
  const handleRefreshCompetitors = useCallback(/* ... */);
  window.addEventListener('refreshCompetitors', handleRefreshCompetitors);
}, [handleRefreshCompetitors]); // Circular dependency
```

### 2. loadCompetitors Function
```typescript
// POTENTIAL ISSUE: Complex async function in useCallback dependency
const loadCompetitors = useCallback(async () => {
  // Complex async logic
  // Multiple state updates
  // Conditional execution
}, [showCompetitors, viewport.zoom]);
```

### 3. Viewport State Dependencies
```typescript
// POTENTIAL ISSUE: Rapid state changes during initialization
const { viewport, setViewport } = useMapState();
// Used in multiple useCallback dependencies
```

## Diagnostic Steps

### Step 1: Identify the Exact Component
- Error occurs in `ExpansionIntegratedMapPage`
- Specifically around competitor functionality
- Related to recent changes

### Step 2: Trace Dependency Chain
```
handleRefreshCompetitors (useCallback)
  ↓ depends on
loadCompetitors (useCallback)
  ↓ depends on
viewport state + competitors state
  ↓ triggers
useEffect with event listeners
  ↓ depends on
handleRefreshCompetitors (CIRCULAR)
```

### Step 3: Build Process Analysis
- Next.js is minifying the code
- React components are being optimized
- Dependency resolution happens at build time
- Runtime error suggests build-time dependency issue

## Solution Strategy

### Immediate Fix (Non-Compromising)
1. **Break Circular Dependencies**: Remove function from its own dependency array
2. **Simplify useCallback Dependencies**: Use refs for stable references
3. **Separate Concerns**: Move event handling outside component lifecycle

### Long-term Fix
1. **Refactor Component Structure**: Split into smaller, focused components
2. **Use Context for Shared State**: Reduce prop drilling and dependency complexity
3. **Implement Proper Error Boundaries**: Catch and handle initialization errors

## Recommended Fix Implementation

### Phase 1: Break Circular Dependency
```typescript
// Move handleRefreshCompetitors outside useEffect
// Use useRef for stable references
// Remove from dependency array
```

### Phase 2: Simplify State Management
```typescript
// Use useRef for viewport references
// Reduce useCallback complexity
// Separate event handling logic
```

### Phase 3: Component Restructure
```typescript
// Split ExpansionIntegratedMapPage into smaller components
// Use React.memo for performance
// Implement proper error boundaries
```

## Testing Strategy

1. **Local Development**: Test with React Strict Mode enabled
2. **Build Analysis**: Check webpack bundle analyzer for circular dependencies
3. **Production Testing**: Deploy incremental fixes
4. **Error Monitoring**: Add error boundaries and logging

## Conclusion

The error is caused by a circular dependency in the React component's hook system, specifically around the `handleRefreshCompetitors` function and its dependencies. The minified error names (`eF`, `eR`) are React's internal variables that can't resolve due to the circular reference during component initialization.

The fix requires breaking the circular dependency without compromising functionality by restructuring the component's hook dependencies and event handling system.