# Subway UI Codemod System

This directory contains codemods for automatically applying Subway UI design system classes to JSX elements in the admin application.

## Overview

The `add-subway-classes.ts` codemod automatically adds base Subway UI classes to JSX elements that are missing them, ensuring consistent styling across the application.

## Supported Elements

| Element | Base Classes | Conditions |
|---------|-------------|------------|
| `button` | `s-btn s-btn--md` | Always |
| `a[role="button"]` | `s-btn s-btn--md` | Only when `role="button"` |
| `input` | `s-input` | Excludes `type="hidden"` |
| `select` | `s-select` | Always |
| `textarea` | `s-textarea` | Always |

## Usage

### From Repository Root

```bash
# Audit design violations (dry run)
pnpm design:audit

# Show what changes would be made (dry run)
pnpm design:fix:dry

# Apply changes to files
pnpm design:fix
```

### Direct Script Usage

```bash
# Dry run (shows changes without applying)
ts-node scripts/codemods/add-subway-classes.ts

# Apply changes
ts-node scripts/codemods/add-subway-classes.ts --write

# Process specific files
ts-node scripts/codemods/add-subway-classes.ts --include="apps/admin/app/**/*.tsx"

# Exclude certain files
ts-node scripts/codemods/add-subway-classes.ts --exclude="**/*.test.tsx"

# Only process files changed since a git ref
ts-node scripts/codemods/add-subway-classes.ts --since=main

# Show help
ts-node scripts/codemods/add-subway-classes.ts --help
```

## How It Works

1. **File Discovery**: Scans `apps/admin/app/**/*.tsx` and `apps/admin/components/**/*.tsx` by default
2. **Element Analysis**: Identifies JSX elements matching the supported element types
3. **Class Detection**: Checks existing `className` attributes for base classes
4. **Safe Merging**: Prepends missing base classes while preserving existing classes
5. **Skip Logic**: Respects `data-allow-unstyled={true}` attribute to skip elements

## Examples

### Before
```tsx
<button onClick={handleClick}>Submit</button>
<input type="text" placeholder="Name" />
<select className="large">
  <option>Option 1</option>
</select>
```

### After
```tsx
<button className="s-btn s-btn--md" onClick={handleClick}>Submit</button>
<input className="s-input" type="text" placeholder="Name" />
<select className="s-select large">
  <option>Option 1</option>
</select>
```

## Skipping Elements

To prevent the codemod from styling specific elements, add the `data-allow-unstyled` attribute:

```tsx
<button data-allow-unstyled={true}>Custom Styled Button</button>
```

## Complex className Handling

The codemod handles various `className` patterns:

```tsx
// String literals
<button className="custom-btn">Button</button>
// → <button className="s-btn s-btn--md custom-btn">Button</button>

// Template literals
<button className={`btn ${isActive ? 'active' : ''}`}>Button</button>
// → <button className={"s-btn s-btn--md" + " " + (`btn ${isActive ? 'active' : ''}`)}>Button</button>

// Variables
<button className={buttonClasses}>Button</button>
// → <button className={"s-btn s-btn--md" + " " + (buttonClasses)}>Button</button>
```

## Output

The codemod provides detailed output including:

- **Summary Table**: Files processed, changes made
- **Sample Changes**: Before/after snippets for review
- **Statistics**: Total changes across all files

Example output:
```
🔍 Subway UI Class Codemod
==========================

Processing 15 files...

📊 Changes Summary
==================

File                                          Added   Changes
----------------------------------------------------------------------
apps/admin/app/dashboard/page.tsx            4       3
apps/admin/app/components/forms/LoginForm.tsx 2       2
----------------------------------------------------------------------
Total                                         6       5

📝 Sample Changes
=================

apps/admin/app/dashboard/page.tsx:
  Line 25: <button>
    Before: <button onClick={handleSubmit}>
    After:  <button className="s-btn s-btn--md" onClick={handleSubmit}>

✅ Applied 6 changes to 2 files.
```

## Testing

Run the test script to validate the codemod:

```bash
node scripts/codemods/test-codemod.js
```

This will:
1. Run a dry run on test files
2. Apply changes and show diffs
3. Restore original files

## Safety Features

- **Dry Run Default**: Never modifies files unless `--write` is specified
- **TypeScript Parsing**: Uses ts-morph for safe AST manipulation
- **Preserve Existing**: Merges with existing classes rather than replacing
- **Skip Logic**: Respects opt-out attributes
- **Detailed Output**: Shows exactly what changes will be made

## Integration

The codemod integrates with the existing design system workflow:

1. **Design Audit**: `pnpm design:audit` runs ESLint design rules
2. **Fix Violations**: `pnpm design:fix` applies base classes automatically
3. **Manual Review**: Developers review changes before committing
4. **CI Integration**: Can be run in CI to catch violations

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure `apps/admin/tsconfig.json` is valid
2. **File Not Found**: Check that target files exist and patterns are correct
3. **Permission Errors**: Ensure write permissions on target directories

### Debug Mode

For debugging, you can modify the script to add more verbose logging or run on a single file:

```bash
ts-node scripts/codemods/add-subway-classes.ts --include="path/to/single/file.tsx"
```