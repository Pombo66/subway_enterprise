# Implementation Plan

- [x] 1. Set up workspace analysis infrastructure
  - Create TypeScript interfaces for workspace analysis and file content handling
  - Implement dual workspace reader that can access both oldRoot and newRoot directories
  - Add error handling for missing files and path resolution issues
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement component structure extraction
  - [x] 2.1 Create React component parser for KPI grid analysis
    - Write parser to extract KPI tile count, layout, and configuration from TSX files
    - Implement CSS grid template extraction from className and style attributes
    - Add icon SVG and styling token extraction from component markup
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Build styling token extractor for CSS analysis
    - Parse CSS custom properties from theme.css and component styles
    - Extract spacing, color, shadow, and radius tokens with their values
    - Identify missing or modified styling tokens between versions
    - _Requirements: 2.2, 2.3_

  - [x] 2.3 Implement feature panel detection system
    - Parse React components to identify feature panels and their structures
    - Extract panel titles, content types, and data binding patterns
    - Map component hierarchy and layout relationships
    - _Requirements: 1.1, 2.5_

- [x] 3. Build regression detection engine
  - [x] 3.1 Create KPI grid comparison logic
    - Compare tile counts between old baseline (expected 9) and current (5)
    - Identify missing KPI tiles by analyzing component structures and data bindings
    - Detect grid layout changes and responsive breakpoint modifications
    - _Requirements: 1.4, 2.4_

  - [x] 3.2 Implement styling regression detector
    - Compare CSS custom properties and styling tokens between versions
    - Identify removed className tokens and missing styling applications
    - Detect icon alignment issues and spacing problems in component markup
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Build feature panel regression analyzer
    - Compare feature panel structures and identify lost components
    - Detect degraded component functionality and missing empty states
    - Analyze data layer compatibility for restored components
    - _Requirements: 2.5_

- [x] 4. Create codemod generation system
  - [x] 4.1 Implement KPI tile restoration codemod
    - Generate code to add missing KPI tiles with proper structure and styling
    - Create data wiring logic that connects to existing kpis object or provides safe mocks
    - Update CSS grid layout from 4-column to 3x3 grid for 9 tiles
    - _Requirements: 3.2, 3.3_

  - [x] 4.2 Build styling restoration codemod
    - Generate code to restore missing CSS custom properties and styling tokens
    - Create className additions to fix icon alignment and spacing issues
    - Apply proper radius, shadow, and gap tokens to eliminate visual overlaps
    - _Requirements: 3.3_

  - [x] 4.3 Create feature panel restoration codemod
    - Generate code to restore lost feature panels with graceful empty states
    - Ensure compatibility with current data layer or provide safe fallbacks
    - Maintain integration with existing component hierarchy
    - _Requirements: 3.4_

- [x] 5. Implement safety validation system
  - [x] 5.1 Create TypeScript validation checker
    - Validate that all generated code maintains proper TypeScript types
    - Ensure imports are correctly added and component props are valid
    - Check that restored components integrate with existing interfaces
    - _Requirements: 5.4_

  - [x] 5.2 Build new feature preservation validator
    - Identify and preserve all Kiro-era telemetry hooks and new components
    - Ensure restored code doesn't interfere with existing functionality
    - Validate that data flows and API calls remain unchanged
    - _Requirements: 3.5, 5.3_

  - [x] 5.3 Implement database and routing safety checks
    - Verify no database schema modifications are attempted
    - Ensure no API route changes or navigation modifications occur
    - Validate that only frontend styling and component changes are made
    - _Requirements: 4.4, 4.5, 5.1, 5.2_

- [x] 6. Build PR generation and reporting system
  - [x] 6.1 Create violations report generator
    - Generate detailed report with file:line → issue → proposed fix format
    - Include confidence scores for each proposed change
    - Separate high-confidence changes from needs-human-review items
    - _Requirements: 2.1, 4.3_

  - [x] 6.2 Implement preview PR builder
    - Create branch "chore/admin-regressions-restore" with all changes
    - Generate tight diffs with explanatory comments for each modification
    - Include comprehensive PR description with change summary and safety notes
    - _Requirements: 4.1, 4.2_

  - [x] 6.3 Add change validation and rollback capability
    - Implement atomic change operations that can be cleanly reverted
    - Create detailed change tracking for easy rollback if needed
    - Validate that current state is preserved before applying changes
    - _Requirements: 4.4_

- [x] 7. Create comprehensive test suite
  - [x] 7.1 Write unit tests for component structure extraction
    - Test KPI grid parsing with various component structures
    - Validate styling token extraction from different CSS formats
    - Test feature panel detection with complex component hierarchies
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 7.2 Build integration tests for regression detection
    - Test end-to-end workflow from workspace analysis to codemod generation
    - Validate that safety checks properly preserve new features
    - Test error handling for missing files and invalid component structures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 7.3 Create validation tests for generated codemods
    - Test that generated code compiles and maintains TypeScript safety
    - Validate that restored components integrate properly with existing data layer
    - Test that styling improvements are correctly applied without breaking existing styles
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_