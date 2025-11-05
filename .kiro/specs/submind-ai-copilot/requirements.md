# Requirements Document

## Introduction

SubMind is a branded AI copilot system that will be integrated across the Subway Enterprise monorepo as an additive, opt-in layer. The system provides intelligent assistance through a floating interface that offers three modes: Ask (freeform chat), Explain (contextual screen explanations), and Generate (artifact creation). The implementation must preserve all existing functionality, particularly the Living Map implementation, while adding AI-powered capabilities through a clean, non-intrusive interface.

## Glossary

- **SubMind**: The branded AI copilot system for Subway Enterprise
- **Admin_App**: The Next.js 14 frontend application located at apps/admin
- **BFF_Service**: The NestJS backend-for-frontend service located at apps/bff
- **FAB**: Floating Action Button that provides global access to SubMind
- **Command_Center**: The right-side drawer interface containing SubMind functionality
- **Context_Scope**: User's current location context including region, country, store, and franchisee
- **Living_Map**: Existing map implementation that must remain unchanged
- **Rate_Limiter**: Token bucket system limiting AI requests per IP address

## Requirements

### Requirement 1

**User Story:** As a Subway Enterprise user, I want to access AI assistance through a floating button, so that I can get help without disrupting my current workflow.

#### Acceptance Criteria

1. WHEN the NEXT_PUBLIC_FEATURE_SUBMIND flag is enabled, THE Admin_App SHALL display a floating "Ask SubMind" button in the bottom-right corner
2. WHEN a user clicks the floating button, THE Admin_App SHALL open a right-side drawer titled "SubMind Command Center"
3. THE Admin_App SHALL position the floating button with z-index 50 and fixed positioning
4. THE Admin_App SHALL use existing button classes for consistent styling
5. WHERE the feature flag is disabled, THE Admin_App SHALL hide all SubMind UI elements

### Requirement 2

**User Story:** As a user, I want three distinct modes of AI interaction, so that I can choose the most appropriate type of assistance for my current task.

#### Acceptance Criteria

1. THE Command_Center SHALL provide three tabbed modes: "Ask", "Explain", and "Generate"
2. WHEN a user selects the "Ask" tab, THE Command_Center SHALL display a freeform chat interface with context pickers
3. WHEN a user selects the "Explain" tab, THE Command_Center SHALL auto-compose prompts explaining the current screen's KPIs and metrics
4. WHEN a user selects the "Generate" tab, THE Command_Center SHALL offer Executive Summary CSV and Action Checklist generation options
5. THE Command_Center SHALL maintain tab state during the user session

### Requirement 3

**User Story:** As a user, I want to ask questions with relevant context, so that SubMind can provide accurate and contextual responses.

#### Acceptance Criteria

1. THE Ask_Tab SHALL provide a textarea for freeform prompt input
2. THE Ask_Tab SHALL include optional context pickers for region, country, store, and franchisee selection
3. WHEN context pickers are available, THE Ask_Tab SHALL prefill them with current scope from existing filters
4. WHEN a user submits a query, THE Ask_Tab SHALL display a loading spinner during processing
5. THE Ask_Tab SHALL render responses with basic markdown support including headings, lists, and code blocks

### Requirement 4

**User Story:** As a user, I want automatic explanations of my current screen, so that I can quickly understand key metrics and trends without manual prompting.

#### Acceptance Criteria

1. WHEN a user opens the Explain tab, THE Command_Center SHALL auto-compose a prompt based on the current page route
2. WHERE the current page is "/dashboard", THE Explain_Tab SHALL generate prompts about KPIs and weekly trends
3. WHERE the current page is "/stores/map", THE Explain_Tab SHALL generate prompts about geographic distribution and anomalies
4. THE Explain_Tab SHALL display the composed prompt in an editable preview before submission
5. THE Explain_Tab SHALL allow users to modify the auto-generated prompt before asking SubMind

### Requirement 5

**User Story:** As a user, I want to generate actionable artifacts, so that I can export data and create task lists based on current context.

#### Acceptance Criteria

1. THE Generate_Tab SHALL offer an "Executive Summary (CSV)" action that produces bullet-point KPIs
2. THE Generate_Tab SHALL format CSV data with columns: Metric, Value, Change, Note
3. THE Generate_Tab SHALL provide client-side CSV download functionality without server storage
4. THE Generate_Tab SHALL offer an "Action Checklist" that produces numbered next actions
5. THE Generate_Tab SHALL base generated content on current screen and scope context

### Requirement 6

**User Story:** As a system administrator, I want a secure AI API endpoint, so that user queries are processed safely with proper rate limiting and error handling.

#### Acceptance Criteria

1. THE BFF_Service SHALL provide a POST /ai/submind/query endpoint
2. THE BFF_Service SHALL accept input with prompt, context screen, selection, and scope parameters
3. THE BFF_Service SHALL return responses with message, sources array, and metadata
4. THE BFF_Service SHALL read OpenAI API key from process.env.OPENAI_API_KEY only
5. WHERE the API key is missing, THE BFF_Service SHALL return 503 status with "AI disabled - missing API key" message

### Requirement 7

**User Story:** As a system administrator, I want rate limiting protection, so that the AI service cannot be abused or overwhelmed.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL implement token bucket algorithm per IP address
2. THE Rate_Limiter SHALL allow maximum 10 requests per 60-second window
3. WHEN rate limit is exceeded, THE BFF_Service SHALL return 429 status with "rate_limited" error
4. THE Rate_Limiter SHALL use in-memory storage for request tracking
5. THE Rate_Limiter SHALL reset token buckets after the time window expires

### Requirement 8

**User Story:** As a security-conscious administrator, I want safe prompt handling, so that user data is protected and system integrity is maintained.

#### Acceptance Criteria

1. THE BFF_Service SHALL clamp prompt length to maximum 4000 characters
2. THE BFF_Service SHALL strip HTML content from user prompts
3. THE BFF_Service SHALL log only hashed versions of prompts without PII
4. THE BFF_Service SHALL validate all input parameters before processing
5. THE BFF_Service SHALL sanitize context data to prevent injection attacks

### Requirement 9

**User Story:** As a system administrator, I want comprehensive telemetry, so that I can monitor AI usage patterns and system performance.

#### Acceptance Criteria

1. THE BFF_Service SHALL emit "ai.submind.query" telemetry events
2. THE BFF_Service SHALL include screen, scope, latencyMs, model, and token count in telemetry
3. THE BFF_Service SHALL exclude raw prompts and responses from telemetry data
4. THE Admin_App SHALL emit "ui.submind.opened", "ui.submind.tab_changed", and "ui.submind.asked" events
5. THE telemetry system SHALL sample 1 in 5 requests for payload size statistics

### Requirement 10

**User Story:** As a user, I want graceful error handling, so that AI failures don't disrupt my workflow or cause confusion.

#### Acceptance Criteria

1. WHEN the BFF_Service returns 503, 429, or 500 errors, THE Admin_App SHALL display non-blocking toast messages
2. THE Admin_App SHALL provide friendly error messages with links to setup documentation
3. THE Admin_App SHALL maintain UI functionality even when AI services are unavailable
4. THE Admin_App SHALL provide "Copy" and "Create Task" buttons for successful responses
5. THE Admin_App SHALL handle network timeouts gracefully with appropriate user feedback

### Requirement 11

**User Story:** As a developer, I want feature flag configuration, so that SubMind can be enabled or disabled without code changes.

#### Acceptance Criteria

1. THE system SHALL use NEXT_PUBLIC_FEATURE_SUBMIND environment variable for frontend feature control
2. THE system SHALL use OPENAI_API_KEY environment variable for backend AI functionality
3. THE system SHALL provide .env.example with documented configuration options
4. THE system SHALL default NEXT_PUBLIC_FEATURE_SUBMIND to true in development environments
5. THE system SHALL maintain code resilience when feature flags are disabled

### Requirement 12

**User Story:** As a developer, I want non-regressive implementation, so that existing functionality remains intact while adding AI capabilities.

#### Acceptance Criteria

1. THE implementation SHALL NOT modify Living_Map rendering, clustering, or tile functionality
2. THE SubMindProvider SHALL be lightweight and avoid triggering whole-app re-renders
3. THE system SHALL make AI calls only on user-triggered actions, never automatically
4. THE implementation SHALL maintain lint cleanliness and type safety
5. THE implementation SHALL produce zero console errors in development mode