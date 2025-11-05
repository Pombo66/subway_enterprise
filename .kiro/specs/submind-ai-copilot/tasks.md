# Implementation Plan

- [x] 1. Set up backend AI service infrastructure
  - Create SubMind controller with POST /ai/submind/query endpoint
  - Implement OpenAI integration service with prompt processing
  - Add rate limiting service with token bucket algorithm per IP
  - Register new services in BFF module configuration
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Implement backend security and validation
  - Add input validation with prompt length clamping (4000 chars max)
  - Implement HTML stripping and sanitization for user prompts
  - Create secure logging with prompt hashing (no PII storage)
  - Add comprehensive error handling for missing API keys and rate limits
  - _Requirements: 6.5, 7.3, 8.1, 8.2, 8.3, 10.1, 10.2, 10.3_

- [x] 3. Add backend telemetry and monitoring
  - Implement telemetry event emission for ai.submind.query events
  - Add performance metrics tracking (latency, tokens, model usage)
  - Create sampling mechanism for payload size statistics (1 in 5 requests)
  - Integrate with existing telemetry infrastructure
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4. Create frontend SubMind provider and context
  - Implement SubMindProvider with feature flag checking (NEXT_PUBLIC_FEATURE_SUBMIND)
  - Create context for global state management (drawer visibility, active tab)
  - Add portal rendering for floating components with z-index management
  - Integrate provider into existing layout without breaking current functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 11.4, 12.2_

- [x] 5. Build floating action button and drawer interface
  - Create floating "Ask SubMind" button with fixed bottom-right positioning
  - Implement right-side drawer with "SubMind Command Center" title
  - Add slide animation and overlay handling for drawer open/close
  - Use existing button classes and design tokens for consistent styling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

- [x] 6. Implement Ask tab with context pickers
  - Create freeform textarea with character limit display
  - Add context picker dropdowns for region, country, store, franchisee
  - Implement auto-population from current page filters and scope
  - Add loading spinner states during API calls
  - Create response rendering with basic markdown support (headings, lists, code blocks)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Build Explain tab with auto-prompt generation
  - Implement route-based prompt auto-composition for current screen
  - Add specific prompt templates for /dashboard (KPIs, trends) and /stores/map (distribution, anomalies)
  - Create editable prompt preview with user modification capability
  - Integrate with current page context and visible data
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Create Generate tab with artifact creation
  - Implement Executive Summary CSV generation with Metric/Value/Change/Note columns
  - Add client-side CSV download functionality without server storage
  - Create Action Checklist generation with numbered next actions
  - Base generated content on current screen and scope context
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Add frontend API integration and error handling
  - Create API client for SubMind queries using existing BFF patterns
  - Implement comprehensive error handling for 503, 429, and 500 responses
  - Add non-blocking toast notifications with friendly error messages
  - Create "Copy" and "Create Task" action buttons for successful responses
  - Handle network timeouts and connection failures gracefully
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10. Implement frontend telemetry tracking
  - Add UI event tracking for drawer opened, tab changed, and query asked
  - Emit telemetry events using existing telemetry infrastructure
  - Include minimal metadata (screen, scope) without sensitive data
  - Integrate with current session and user tracking patterns
  - _Requirements: 9.4, 9.5_

- [x] 11. Configure environment variables and feature flags
  - Add OPENAI_API_KEY and NEXT_PUBLIC_FEATURE_SUBMIND to .env.example
  - Create documentation for environment variable setup
  - Implement feature flag resilience when disabled (hide all UI elements)
  - Set appropriate defaults for development environment
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 12. Add comprehensive error boundaries and fallbacks
  - Implement React error boundaries for SubMind components
  - Add fallback UI for when AI services are unavailable
  - Create setup documentation links in error messages
  - Ensure graceful degradation when feature is disabled
  - _Requirements: 10.1, 10.2, 10.3, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 13. Create backend unit tests
  - Write tests for SubMind controller endpoint validation
  - Test rate limiting algorithm with various scenarios
  - Mock OpenAI integration for service testing
  - Validate error response formatting and status codes
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

- [x] 14. Add frontend component tests
  - Test component rendering with feature flags enabled/disabled
  - Validate context provider state management
  - Test API client error handling scenarios
  - Verify markdown rendering and CSV generation functionality
  - _Requirements: 1.5, 4.4, 5.2, 10.1, 10.2_

- [x] 15. Implement integration tests
  - Create end-to-end query processing tests with mocked OpenAI
  - Test rate limiting enforcement across multiple requests
  - Validate telemetry event emission and data structure
  - Test error propagation from backend to frontend
  - _Requirements: 7.3, 9.1, 9.2, 10.1_

- [x] 16. Add E2E tests for user workflows
  - Test complete user journey: FAB click → drawer open → successful query
  - Validate context picker auto-population from current page
  - Test CSV generation and download functionality
  - Verify error handling with toast notifications
  - _Requirements: 1.1, 1.2, 3.2, 5.3, 10.1_

- [x] 17. Create setup documentation
  - Write comprehensive setup guide for OpenAI API key configuration
  - Document feature flag usage and environment variable setup
  - Create troubleshooting guide for common issues
  - Add screenshots and usage examples for different modes
  - _Requirements: 11.2, 11.3_

- [x] 18. Final integration and validation
  - Integrate SubMindProvider into main layout with feature flag guards
  - Validate no regressions in existing functionality, especially Living Map
  - Ensure zero console errors in development mode
  - Verify lint cleanliness and type safety across all new code
  - Test performance impact and bundle size changes
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_