# Workspace Analyzer

The Workspace Analyzer is a TypeScript infrastructure for analyzing two workspace directories (old baseline and current state) to identify regressions and generate fixes. This is part of the Admin Regression Audit system.

## Overview

This module provides the core infrastructure for:
- Reading files from both old baseline and current workspace directories
- Extracting component information and styling tokens
- Handling errors gracefully with detailed error reporting
- Analyzing React components, CSS files, and TypeScript/JavaScript files

## Key Features

- **Dual Workspace Access**: Can read from both old baseline (`oldRoot`) and current workspace (`newRoot`)
- **Component Analysis**: Extracts React component information including exports, imports, and types
- **Style Token Extraction**: Identifies CSS custom properties, class names, and Tailwind classes
- **Error Handling**: Graceful handling of missing files, permission errors, and parse errors
- **Path Resolution**: Flexible path resolution with fallback options

## Usage

### Basic Setup

```typescript
import { WorkspaceAnalyzer, DEFAULT_WORKSPACE_CONFIG } from './workspace-analyzer';

// Create analyzer with default configuration
const analyzer = new WorkspaceAnalyzer(DEFAULT_WORKSPACE_CONFIG);

// Or create with custom configuration
const customConfig = {
  oldRoot: '/path/to/old/workspace',
  newRoot: '/path/to/current/workspace',
  targetScope: 'apps/admin'
};
const analyzer = new WorkspaceAnalyzer(customConfig);
```

### Reading Files

```typescript
// Read specific files from both workspaces
const oldFile = await analyzer.readOldBaseline('app/dashboard/page.tsx');
const currentFile = await analyzer.readCurrentState('app/dashboard/page.tsx');

if (oldFile && currentFile) {
  console.log('File size comparison:');
  console.log(`Old: ${oldFile.size} bytes`);
  console.log(`Current: ${currentFile.size} bytes`);
}
```

### Component Analysis

```typescript
// Get all components from both workspaces
const oldComponents = await analyzer.listComponents('old');
const currentComponents = await analyzer.listComponents('current');

// Find missing components
const oldNames = new Set(oldComponents.map(c => c.name));
const currentNames = new Set(currentComponents.map(c => c.name));
const missingComponents = oldComponents.filter(c => !currentNames.has(c.name));
```

### Style Token Extraction

```typescript
// Extract styling tokens
const oldTokens = await analyzer.extractStyleTokens('old');
const currentTokens = await analyzer.extractStyleTokens('current');

// Compare CSS custom properties
const oldProps = Object.keys(oldTokens.customProperties);
const currentProps = Object.keys(currentTokens.customProperties);
const missingProps = oldProps.filter(prop => !currentProps.includes(prop));
```

### Full Workspace Analysis

```typescript
// Perform comprehensive analysis
const oldAnalysis = await analyzer.analyzeWorkspace('old');
const currentAnalysis = await analyzer.analyzeWorkspace('current');

console.log(`Old workspace: ${oldAnalysis.files.length} files`);
console.log(`Current workspace: ${currentAnalysis.files.length} files`);

// Handle errors
if (oldAnalysis.errors.length > 0) {
  console.log('Errors encountered:', oldAnalysis.errors);
}
```

## Configuration

### Default Configuration

The default configuration is based on the requirements (6.1, 6.2, 6.3):

```typescript
export const DEFAULT_WORKSPACE_CONFIG = {
  oldRoot: '/Users/khalidgehlan/Documents/subway_enterprise',
  newRoot: '/Users/khalidgehlan/subway_enterprise-1',
  targetScope: 'apps/admin'
};
```

### Custom Configuration

```typescript
import { createWorkspaceConfig, validateWorkspaceConfig } from './config';

const config = createWorkspaceConfig(
  '/path/to/old/workspace',
  '/path/to/new/workspace',
  'apps/admin'
);

// Validate configuration
const errors = validateWorkspaceConfig(config);
if (errors.length > 0) {
  console.error('Configuration errors:', errors);
}
```

## Error Handling

The analyzer provides comprehensive error handling:

### Error Types

- `file_not_found`: File doesn't exist at the specified path
- `parse_error`: Error parsing file content
- `path_resolution`: Error resolving directory paths
- `permission_denied`: Insufficient permissions to access file

### Error Utilities

```typescript
import { formatAnalysisError, groupErrorsByType } from './utils';

// Format individual errors
const formattedError = formatAnalysisError(error);

// Group errors by type for reporting
const groupedErrors = groupErrorsByType(allErrors);
Object.entries(groupedErrors).forEach(([type, errors]) => {
  console.log(`${type}: ${errors.length} errors`);
});
```

## File Types Supported

- **React Components**: `.tsx`, `.jsx`
- **TypeScript/JavaScript**: `.ts`, `.js`
- **Stylesheets**: `.css`, `.scss`, `.sass`
- **Configuration**: `.json`

## Directory Skipping

The analyzer automatically skips common directories that shouldn't be analyzed:
- `node_modules`
- `.next`
- `.turbo`
- `dist`
- `build`
- `.git`
- `coverage`
- `.nyc_output`
- `.swc`

## Examples

See `example.ts` for comprehensive usage examples including:
- Basic workspace analysis
- File reading and comparison
- Component analysis and comparison
- Style token extraction and comparison

## Testing

Run the tests with:

```bash
npm test -- --testPathPattern=workspace-analyzer
```

The test suite covers:
- Configuration validation
- Utility functions
- Error handling
- File type detection
- Basic analyzer functionality

## Requirements Satisfied

This implementation satisfies the following requirements:

- **6.1**: Access to old baseline workspace at specified path
- **6.2**: Access to current workspace at specified path  
- **6.3**: Graceful error handling for missing files and path resolution issues

The infrastructure provides the foundation for the next tasks in the implementation plan, including component structure extraction and regression detection.