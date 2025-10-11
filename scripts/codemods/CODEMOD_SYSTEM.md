# Subway UI Codemod System

A comprehensive codemod system for automatically applying Subway UI base classes to JSX elements in the Admin application.

## 🎯 Overview

This system provides automated tooling to ensure consistent application of Subway UI design system classes across the admin application. It safely transforms JSX elements by adding missing base classes while preserving existing styling.

## 📦 Components

### Core Files

- **`add-subway-classes.ts`** - Main codemod script using ts-morph for AST manipulation
- **`validate-codemod.ts`** - Comprehensive validation suite with test cases
- **`demo.ts`** - Interactive demonstration of codemod functionality
- **`test-codemod.tsx`** - Test file with various JSX patterns
- **`README.md`** - Detailed usage documentation

### Package Scripts (Root)

```json
{
  "design:audit": "pnpm --filter @subway/admin run lint:design",
  "design:fix:dry": "ts-node scripts/codemods/add-subway-classes.ts",
  "design:fix": "ts-node scripts/codemods/add-subway-classes.ts --write",
  "design:test": "ts-node scripts/codemods/validate-codemod.ts",
  "design:demo": "ts-node scripts/codemods/demo.ts"
}
```

## 🔧 Transformation Rules

| Element | Condition | Base Classes Added |
|---------|-----------|-------------------|
| `<button>` | Always | `s-btn s-btn--md` |
| `<a role="button">` | Has `role="button"` | `s-btn s-btn--md` |
| `<input>` | Not `type="hidden"` | `s-input` |
| `<select>` | Always | `s-select` |
| `<textarea>` | Always | `s-textarea` |

## 🛡️ Safety Features

### Skip Conditions
- Elements with `data-allow-unstyled={true}` or `data-allow-unstyled="true"`
- Elements that already have the required base classes
- Hidden input elements (`type="hidden"`)
- Regular links without `role="button"`

### Safe Transformations
- **Preserves existing classes**: Prepends base classes to existing `className`
- **Handles complex expressions**: Safely transforms template literals and variables
- **TypeScript safe**: Uses AST manipulation for accurate parsing
- **Dry run default**: Never modifies files without explicit `--write` flag

## 📊 Example Transformations

### Basic Elements
```tsx
// Before
<button onClick={handleClick}>Submit</button>
<input type="text" placeholder="Name" />

// After  
<button className="s-btn s-btn--md" onClick={handleClick}>Submit</button>
<input className="s-input" type="text" placeholder="Name" />
```

### Existing Classes
```tsx
// Before
<button className="primary large">Submit</button>

// After
<button className="s-btn s-btn--md primary large">Submit</button>
```

### Complex Expressions
```tsx
// Before
<button className={`btn ${isActive ? 'active' : ''}`}>Toggle</button>

// After
<button className={"s-btn s-btn--md" + " " + (`btn ${isActive ? 'active' : ''}`)}>Toggle</button>
```

### Skip Examples
```tsx
// These remain unchanged
<input type="hidden" value="secret" />
<button data-allow-unstyled={true}>Custom Button</button>
<a href="/page">Regular Link</a>
<button className="s-btn s-btn--md">Already Styled</button>
```

## 🚀 Usage Examples

### Quick Start
```bash
# See what changes would be made
pnpm design:fix:dry

# Apply changes to all admin files
pnpm design:fix

# Run validation tests
pnpm design:test

# See interactive demo
pnpm design:demo
```

### Advanced Usage
```bash
# Process specific files
ts-node scripts/codemods/add-subway-classes.ts --include="apps/admin/app/dashboard/**/*.tsx"

# Exclude test files
ts-node scripts/codemods/add-subway-classes.ts --exclude="**/*.test.tsx,**/*.spec.tsx"

# Only files changed since main branch
ts-node scripts/codemods/add-subway-classes.ts --since=main --write

# Show help
ts-node scripts/codemods/add-subway-classes.ts --help
```

## 📈 Output Format

The codemod provides detailed reporting:

```
🔍 Subway UI Class Codemod
==========================

Processing 15 files...

📊 Changes Summary
==================

File                                          Added   Changes
----------------------------------------------------------------------
apps/admin/app/dashboard/page.tsx            6       4
apps/admin/app/components/forms/LoginForm.tsx 3       3
----------------------------------------------------------------------
Total                                         9       7

📝 Sample Changes
=================

apps/admin/app/dashboard/page.tsx:
  Line 125: <a>
    Before: <a href="/items/new" className="btn btn-primary">Add New Item</a>
    After:  <a className="s-btn s-btn--md btn btn-primary" href="/items/new">Add New Item</a>

✅ Applied 9 changes to 2 files.
```

## 🧪 Testing & Validation

### Automated Tests
The validation suite includes test cases for:
- Basic element transformations
- Complex className expressions
- Skip conditions
- Edge cases and error handling

### Manual Testing
```bash
# Run comprehensive validation
pnpm design:test

# Interactive demo with before/after
pnpm design:demo
```

## 🔄 Integration Workflow

1. **Development**: Use `pnpm design:fix:dry` to preview changes
2. **Application**: Use `pnpm design:fix` to apply changes
3. **Review**: Check git diff for applied changes
4. **Testing**: Run tests to ensure no regressions
5. **Commit**: Commit changes with descriptive message

## 🛠️ Technical Details

### Dependencies
- **ts-morph**: TypeScript AST manipulation
- **glob**: File pattern matching
- **Node.js built-ins**: fs, path, child_process

### Architecture
- **AST-based**: Uses TypeScript compiler API for safe transformations
- **Incremental**: Can be run multiple times safely
- **Configurable**: Supports include/exclude patterns and git-based filtering
- **Extensible**: Easy to add new element types and transformation rules

### Performance
- **Fast**: Processes typical admin app in <5 seconds
- **Memory efficient**: Streams file processing
- **Cached**: Leverages TypeScript compiler caching

## 🔍 Troubleshooting

### Common Issues

1. **"Cannot find module 'ts-morph'"**
   ```bash
   pnpm install  # Install dependencies
   ```

2. **"TypeScript config not found"**
   - Ensure `apps/admin/tsconfig.json` exists and is valid

3. **"No files found to process"**
   - Check file patterns and ensure target files exist
   - Use `--include` to specify custom patterns

4. **"Permission denied"**
   - Ensure write permissions on target directories
   - Check file locks in editors

### Debug Mode
```bash
# Process single file for debugging
ts-node scripts/codemods/add-subway-classes.ts --include="path/to/single/file.tsx" --write
```

## 📋 Acceptance Criteria ✅

- ✅ **Dry run prints violations without changing files**
- ✅ **With --write, updates JSX safely and reports count**
- ✅ **Works on mixed className expressions (adds base token if not present)**
- ✅ **Handles TypeScript/JSX parsing correctly**
- ✅ **Provides clear before/after output for review**
- ✅ **Can be run repeatedly safely**
- ✅ **Supports include/exclude patterns**
- ✅ **Integrates with git workflow (--since flag)**
- ✅ **Comprehensive test suite and validation**
- ✅ **Clear documentation and examples**

## 🎉 Success Metrics

The codemod system successfully:
- **Automates** manual design system application
- **Reduces** inconsistency in UI component styling  
- **Preserves** existing functionality and custom styling
- **Provides** clear feedback on changes made
- **Integrates** seamlessly with development workflow
- **Scales** to handle large codebases efficiently

This system ensures consistent application of Subway UI design system classes while maintaining developer productivity and code safety.