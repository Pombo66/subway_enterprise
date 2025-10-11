# Requirements Document

## Introduction

The Admin Regression Audit feature is designed to systematically compare two versions of the admin application codebase and restore UI/UX improvements from a previous "Cursor-era" version while preserving new features added in the current "Kiro" version. This involves analyzing dashboard layouts, KPI grids, styling tokens, component structures, and feature panels to identify regressions and generate targeted fixes.

The system will focus specifically on the `apps/admin/**` scope, comparing an old baseline workspace with the current workspace to restore visual improvements like proper spacing, icon alignment, 9-tile KPI grids, and enhanced styling while maintaining new functionality like telemetry and hooks.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to compare two admin app codebases to identify UI/UX regressions, so that I can restore previous improvements without losing new functionality.

#### Acceptance Criteria

1. WHEN the system analyzes the old baseline codebase THEN it SHALL identify dashboard layout structure, KPI grid configuration, card styling tokens, icon alignment patterns, empty/error states, and feature panels
2. WHEN the system analyzes the current codebase THEN it SHALL catalog existing components, styling patterns, new features like telemetry and hooks, and current UI state
3. WHEN comparing the two codebases THEN the system SHALL focus only on frontend code (JS/TS/TSX/CSS/Tailwind) and ignore backend or configuration changes
4. IF the old baseline contains 9 KPI tiles and current has 5 THEN the system SHALL flag this as a regression requiring restoration

### Requirement 2

**User Story:** As a developer, I want to generate a comprehensive violations report, so that I can understand exactly what regressions occurred and how to fix them.

#### Acceptance Criteria

1. WHEN the system detects regressions THEN it SHALL generate a violations report with file:line → issue → proposed fix format
2. WHEN className tokens are removed THEN the system SHALL identify the specific styling regressions and propose restoration
3. WHEN icon overlap or alignment issues are detected THEN the system SHALL propose spacing and layout fixes
4. WHEN KPI grid is reduced from 9 to 5 tiles THEN the system SHALL propose restoration with appropriate data wiring or safe mocks
5. WHEN lost components are identified THEN the system SHALL propose restoration with graceful empty states if data layer is incompatible

### Requirement 3

**User Story:** As a developer, I want to generate targeted codemods for the current codebase, so that I can automatically restore the improvements while preserving new features.

#### Acceptance Criteria

1. WHEN generating codemods THEN the system SHALL target only the newRoot/apps/admin directory
2. WHEN restoring KPI grid THEN the system SHALL wire to existing selectors or provide safe mocks when data is missing
3. WHEN applying spacing fixes THEN the system SHALL restore proper radius, shadow, and gap tokens to eliminate overlap
4. WHEN restoring feature sections THEN the system SHALL maintain compatibility with current data layer or provide graceful empty states
5. WHEN preserving new features THEN the system SHALL keep all Kiro telemetry and UI hooks intact

### Requirement 4

**User Story:** As a developer, I want to create a preview PR with all changes, so that I can review the modifications before applying them to the codebase.

#### Acceptance Criteria

1. WHEN generating the preview PR THEN the system SHALL create it on branch "chore/admin-regressions-restore"
2. WHEN creating the PR THEN the system SHALL include tight diffs with explanatory comments
3. WHEN confidence level is below 0.8 for any change THEN the system SHALL list it in "needs-human-review" section
4. WHEN the PR is ready THEN the system SHALL NOT auto-commit and SHALL wait for explicit approval
5. IF any changes affect database schema or routes THEN the system SHALL reject those changes as out of scope

### Requirement 5

**User Story:** As a developer, I want safety guardrails during the restoration process, so that I can ensure no critical functionality is broken.

#### Acceptance Criteria

1. WHEN making changes THEN the system SHALL NOT modify database schema files
2. WHEN making changes THEN the system SHALL NOT rename or modify API routes
3. WHEN making changes THEN the system SHALL preserve all existing functionality and only restore visual improvements
4. WHEN generating fixes THEN the system SHALL maintain TypeScript compatibility and proper imports
5. WHEN restoring components THEN the system SHALL ensure they integrate properly with existing data flows

### Requirement 6

**User Story:** As a developer, I want to access both workspace directories during the audit, so that the system can perform accurate comparisons.

#### Acceptance Criteria

1. WHEN accessing the old baseline THEN the system SHALL read from /Users/khalidgehlan/Documents/subway_enterprise/apps/admin
2. WHEN accessing the current codebase THEN the system SHALL read from /Users/khalidgehlan/subway_enterprise-1/apps/admin  
3. WHEN file paths don't exist THEN the system SHALL handle errors gracefully and report missing components
4. WHEN comparing files THEN the system SHALL focus on structural and styling differences rather than minor formatting changes
5. WHEN analyzing components THEN the system SHALL identify functional equivalents even if file names or locations have changed