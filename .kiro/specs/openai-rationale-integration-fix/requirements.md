# Requirements Document

## Introduction

The OpenAI rationale integration in the expansion generation system is currently malfunctioning. While the logs show "🤖 Using OpenAI rationale for location/settlement" messages, the final statistics indicate "OpenAI Strategy Layer: 0 API calls, 0 tokens, 1 fallbacks" and "AI vs Deterministic: -0.0% score improvement". This suggests that the system is claiming to use OpenAI rationales but is actually falling back to deterministic rationales without properly calling the OpenAI API. The issue prevents users from receiving genuine AI-generated location rationales, reducing the quality and credibility of expansion suggestions.

## Glossary

- **OpenAI_Rationale_Service**: The service responsible for generating AI-powered explanations for expansion location recommendations
- **Expansion_Generation_Service**: The main service that orchestrates the expansion suggestion generation process
- **Rationale_Text**: The explanatory text that describes why a specific location is suitable for expansion
- **Fallback_Logic**: The backup mechanism that provides generic rationale when OpenAI API is unavailable
- **API_Call_Statistics**: Metrics tracking the number of OpenAI API calls, tokens used, and fallback instances
- **Deterministic_Rationale**: Generic, template-based rationale text used when AI generation fails
- **OpenAI_Strategy_Layer**: The AI-powered component that should analyze location data and generate strategic rationales

## Requirements

### Requirement 1

**User Story:** As an expansion analyst, I want all expansion suggestions to have genuine AI-generated rationales, so that I receive high-quality, contextual explanations for each recommended location.

#### Acceptance Criteria

1. WHEN generating expansion suggestions, THE Expansion_Generation_Service SHALL call the OpenAI API for every accepted candidate location
2. THE OpenAI_Rationale_Service SHALL successfully make API calls and receive responses from OpenAI GPT-4o model
3. THE Expansion_Generation_Service SHALL log actual OpenAI API call count greater than zero in the final statistics
4. THE Expansion_Generation_Service SHALL log actual token usage greater than zero in the final statistics
5. THE Expansion_Generation_Service SHALL NOT use fallback logic unless OpenAI API returns an error or is unavailable

### Requirement 2

**User Story:** As a system administrator, I want accurate logging of OpenAI API usage, so that I can monitor costs and troubleshoot integration issues.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL increment API call counter for each successful OpenAI request
2. THE OpenAI_Rationale_Service SHALL track total tokens used across all API calls
3. THE OpenAI_Rationale_Service SHALL log fallback usage only when OpenAI API actually fails
4. THE Expansion_Generation_Service SHALL report accurate statistics in the final generation summary
5. THE OpenAI_Rationale_Service SHALL distinguish between cached responses and new API calls in the statistics

### Requirement 3

**User Story:** As a developer, I want clear error handling and logging when OpenAI integration fails, so that I can quickly identify and resolve API issues.

#### Acceptance Criteria

1. WHEN OpenAI API returns an error, THE OpenAI_Rationale_Service SHALL log the specific error message and status code
2. WHEN OpenAI API is unavailable, THE OpenAI_Rationale_Service SHALL log a warning and increment fallback counter
3. WHEN API key is missing or invalid, THE OpenAI_Rationale_Service SHALL log an authentication error
4. THE OpenAI_Rationale_Service SHALL NOT silently fail and use deterministic rationales without logging
5. THE OpenAI_Rationale_Service SHALL provide detailed error context for troubleshooting

### Requirement 4

**User Story:** As an expansion analyst, I want to see measurable improvement in rationale quality when OpenAI is enabled, so that I can trust the AI-generated explanations are better than generic templates.

#### Acceptance Criteria

1. WHEN OpenAI integration is working properly, THE Expansion_Generation_Service SHALL show positive score improvement compared to deterministic rationales
2. THE OpenAI_Rationale_Service SHALL generate unique, contextual rationales that differ from template text
3. THE Expansion_Generation_Service SHALL log "AI vs Deterministic" score improvement greater than 0%
4. THE OpenAI_Rationale_Service SHALL include location-specific details in generated rationales
5. THE Expansion_Generation_Service SHALL validate that OpenAI rationales contain relevant keywords and context

### Requirement 5

**User Story:** As a system administrator, I want the OpenAI integration to be properly configured and initialized, so that the service can successfully authenticate and make API calls.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL validate that OPENAI_API_KEY environment variable is set and non-empty
2. THE OpenAI_Rationale_Service SHALL test API connectivity during service initialization
3. THE OpenAI_Rationale_Service SHALL use the correct OpenAI model (gpt-4o or gpt-4o-mini) as configured
4. THE OpenAI_Rationale_Service SHALL set appropriate request parameters (temperature, max_tokens, etc.)
5. THE OpenAI_Rationale_Service SHALL handle API rate limiting gracefully with exponential backoff

### Requirement 6

**User Story:** As a developer, I want to verify that the OpenAI service is being properly injected and called by the expansion generation pipeline, so that integration issues are caught early.

#### Acceptance Criteria

1. THE Expansion_Generation_Service SHALL properly inject the OpenAI_Rationale_Service dependency
2. THE Expansion_Generation_Service SHALL call the rationale generation method for each candidate
3. THE Expansion_Generation_Service SHALL wait for OpenAI responses before finalizing suggestions
4. THE Expansion_Generation_Service SHALL handle async OpenAI calls without blocking the generation pipeline
5. THE Expansion_Generation_Service SHALL validate that rationale text is populated before returning suggestions

### Requirement 7

**User Story:** As an expansion analyst, I want consistent rationale generation across all suggestion types, so that both settlement-based and H3-based candidates receive AI-generated explanations.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL generate rationales for settlement-based candidates
2. THE OpenAI_Rationale_Service SHALL generate rationales for H3 grid-based candidates
3. THE OpenAI_Rationale_Service SHALL generate rationales for location coordinates with population data
4. THE OpenAI_Rationale_Service SHALL handle missing data gracefully by passing "unknown" flags to OpenAI
5. THE Expansion_Generation_Service SHALL ensure all suggestion types receive rationale generation calls

### Requirement 8

**User Story:** As a system administrator, I want OpenAI caching to work correctly without interfering with API call statistics, so that costs are controlled while maintaining accurate usage tracking.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL check cache before making API calls
2. THE OpenAI_Rationale_Service SHALL NOT increment API call counter for cache hits
3. THE OpenAI_Rationale_Service SHALL increment API call counter only for actual OpenAI requests
4. THE OpenAI_Rationale_Service SHALL store successful responses in cache with appropriate TTL
5. THE OpenAI_Rationale_Service SHALL log cache hit rate separately from API usage statistics