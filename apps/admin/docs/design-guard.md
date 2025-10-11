# Design Guard System

The Design Guard system enforces consistent use of Subway UI classes across the Admin application. It automatically validates that interactive elements use the proper design system classes.

## How It Works

The Design Guard system consists of:

1. **DesignGuardProvider** - React provider component that wraps the app
2. **useDesignGuard** - Hook that monitors DOM changes and validates elements
3. **Subway UI Classes** - Standardized CSS classes for consistent styling

## Subway UI Classes

The system enforces the following class requirements:

- **Buttons**: Must include `.s-btn` (with optional variants like `.s-btn--primary`, `.s-btn--ghost`, `.s-btn--sm`, `.s-btn--md`, `.s-btn--lg`)
- **Inputs**: Must include `.s-input`
- **Select elements**: Must include `.s-select`
- **Textareas**: Must include `.s-textarea`
- **Button links**: Links with `role="button"` must include `.s-btn`

## Configuration

The Design Guard is automatically enabled in development mode via the layout:

```tsx
<DesignGuardProvider enabled={config.isDevelopment}>
  <App />
</DesignGuardProvider>
```

## Muting Warnings

### Per Element

Add attributes to specific elements to opt out of validation:

```tsx
// Allow element without Subway classes
<button data-allow-unstyled="true">Legacy Button</button>

// Completely disable checking for element
<input data-design-guard="off" />
```

### Globally

Use the helper function to disable all warnings:

```javascript
// In browser console or code
import { markDesignGuardSilenced } from '@/app/hooks/useDesignGuard';
markDesignGuardSilenced();

// Re-enable warnings
import { unmarkDesignGuardSilenced } from '@/app/hooks/useDesignGuard';
unmarkDesignGuardSilenced();
```

## Example Warnings

When the Design Guard detects non-compliant elements, it logs warnings like:

```
🎨 Design Guard: Button missing Subway UI class
{
  element: <button class="custom-btn">Click me</button>,
  suggestion: 'Add .s-btn class (variants: .s-btn--primary, .s-btn--ghost, .s-btn--sm, .s-btn--md, .s-btn--lg)',
  muteWith: 'data-allow-unstyled="true" or data-design-guard="off"'
}
```

## Migration Guide

To fix Design Guard warnings:

1. **Replace custom button classes** with `.s-btn`:
   ```tsx
   // Before
   <button className="custom-button">Click me</button>
   
   // After
   <button className="s-btn">Click me</button>
   ```

2. **Use Subway input classes**:
   ```tsx
   // Before
   <input className="form-input" />
   
   // After
   <input className="s-input" />
   ```

3. **For legacy components**, add opt-out attributes:
   ```tsx
   <button className="legacy-btn" data-allow-unstyled="true">
     Legacy Button
   </button>
   ```

## Performance

- Only runs in development mode (`NODE_ENV !== 'production'`)
- Uses MutationObserver for efficient DOM monitoring
- De-duplicates warnings using WeakSet
- Debounces validation to avoid excessive checks
- Guards against SSR with `typeof window !== 'undefined'`

## Troubleshooting

### Design Guard not working

1. Check that you're in development mode
2. Verify `config.isDevelopment` is true
3. Check browser console for initialization message: "🎨 Design Guard: Monitoring DOM for design consistency"

### Too many warnings

1. Use `markDesignGuardSilenced()` to temporarily disable
2. Add `data-allow-unstyled="true"` to legacy components
3. Migrate components to use Subway UI classes

### SSR issues

The Design Guard automatically guards against SSR with:
- `typeof window !== 'undefined'` checks
- `process.env.NODE_ENV` checks
- Safe DOM access patterns