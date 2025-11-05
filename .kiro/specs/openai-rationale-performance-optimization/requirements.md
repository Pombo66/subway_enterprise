# Requirements Document

## Introduction

The current OpenAI rationale service has performance and reliability issues causing ~5-minute execution times and inconsistent response parsing. The service needs optimization to use the Responses API correctly, implement proper output parsing, add deterministic controls, reduce token usage, and improve concurrency handling. This feature will optimize the rationale generation service to be faster, more reliable, and cost-effective while maintaining high-quality outputs.

## Glossary

- **Responses_API**: OpenAI's /v1/responses endpoint that provides reasoning.effort and text.verbosity controls for GPT-5-class models
- **OpenAI_Rationale_Service**: Service responsible for generating business rationales for expansion location candidates
- **Market_Analysis_Service**: Service that performs AI-driven market intelligence and competitive analysis
- **Output_Text_Parser**: Component that extracts text from OpenAI Responses API using the output_text field and fallback parsing
- **Deterministic_Controls**: Configuration using seed values instead of temperature for consistent outputs
- **Concurrency_Manager**: System that manages parallel rationale generation with appropriate rate limiting
- **Token_Optimizer**: Component that minimizes token usage through prompt optimization and response size limits
- **Response_Timeout_Handler**: System that implements hard timeouts and retry logic for API calls
- **JSON_Schema_Enforcer**: Component that uses response_format with strict JSON schemas to guarantee structured outputs
- **Data_Aggregator**: Component that pre-processes large datasets into summary statistics before AI API calls
- **Cache_Manager**: System that stores and retrieves AI analysis results with proper invalidation logic

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the rationale service to use robust output parsing, so that text extraction is reliable regardless of response format variations.

#### Acceptance Criteria

1. THE Output_Text_Parser SHALL use the output_text field as the primary method for extracting response content from the Responses API
2. WHEN output_text is empty or missing, THE Output_Text_Parser SHALL fall back to parsing message.content arrays for output_text chunks
3. THE Output_Text_Parser SHALL implement comprehensive error handling that provides detailed diagnostics when text extraction fails
4. WHEN response parsing fails, THE Output_Text_Parser SHALL throw descriptive errors including response status and output types
5. THE OpenAI_Rationale_Service SHALL validate that extracted text is non-empty before proceeding with rationale processing

### Requirement 2

**User Story:** As a developer, I want the service to use structured message inputs, so that the AI model receives properly formatted requests instead of concatenated strings.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL send structured message arrays with separate system and user roles instead of concatenated strings
2. WHEN building API requests, THE OpenAI_Rationale_Service SHALL use proper message format with role and content arrays
3. THE OpenAI_Rationale_Service SHALL include input_text type specifications in content arrays for proper API compliance
4. WHEN system prompts are provided, THE OpenAI_Rationale_Service SHALL send them as separate system role messages
5. THE OpenAI_Rationale_Service SHALL ensure all message content follows the Responses API specification format

### Requirement 3

**User Story:** As a business analyst, I want deterministic rationale generation, so that similar location contexts produce consistent explanations for decision-making.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL use seed values instead of temperature for controlling response determinism
2. WHEN generating rationales, THE OpenAI_Rationale_Service SHALL include seed parameters in API requests for reproducible outputs
3. THE OpenAI_Rationale_Service SHALL remove temperature parameters from API calls as they are not the primary control for GPT-5-class models
4. WHEN caching rationales, THE OpenAI_Rationale_Service SHALL include seed values in cache keys for proper cache invalidation
5. THE OpenAI_Rationale_Service SHALL store seed values alongside cached rationales for debugging and reproducibility

### Requirement 4

**User Story:** As a cost-conscious manager, I want optimized token usage, so that rationale generation is cost-effective without sacrificing quality.

#### Acceptance Criteria

1. THE Token_Optimizer SHALL reduce max_output_tokens from 1000 to 150-250 tokens for 2-3 sentence rationales
2. WHEN building prompts, THE Token_Optimizer SHALL use concise system instructions and minimize unnecessary context
3. THE Token_Optimizer SHALL send null values instead of "unknown" strings to reduce prompt length
4. WHEN context data is missing, THE Token_Optimizer SHALL use explicit sentinels like 'NA' instead of verbose placeholder text
5. THE OpenAI_Rationale_Service SHALL instruct the model to return plain text only with no formatting or lists

### Requirement 5

**User Story:** As a system administrator, I want reliable timeout and retry handling, so that rationale generation doesn't hang or fail due to network issues.

#### Acceptance Criteria

1. THE Response_Timeout_Handler SHALL implement hard timeouts of 25 seconds per API request using AbortController
2. WHEN API calls timeout or fail, THE Response_Timeout_Handler SHALL retry with jittered exponential backoff
3. THE Response_Timeout_Handler SHALL honor Retry-After headers from 429 rate limit responses
4. WHEN retries are exhausted, THE Response_Timeout_Handler SHALL provide clear error messages with failure context
5. THE OpenAI_Rationale_Service SHALL log timeout and retry events for monitoring and debugging

### Requirement 6

**User Story:** As a performance engineer, I want concurrent rationale generation, so that multiple rationales can be processed in parallel without overwhelming the API.

#### Acceptance Criteria

1. THE Concurrency_Manager SHALL process multiple rationale requests in parallel with a concurrency limit of 4 simultaneous requests
2. WHEN generating rationales for multiple candidates, THE Concurrency_Manager SHALL batch requests to maximize throughput
3. THE Concurrency_Manager SHALL implement rate limiting to stay within OpenAI API limits
4. WHEN API rate limits are hit, THE Concurrency_Manager SHALL queue requests and retry with appropriate delays
5. THE OpenAI_Rationale_Service SHALL complete 10 rationales in seconds rather than minutes through parallel processing

### Requirement 7

**User Story:** As a developer, I want improved cache key stability, so that rationale caching works reliably across different data scenarios.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL use explicit sentinels for null values in cache keys instead of collapsing them
2. WHEN building cache keys, THE OpenAI_Rationale_Service SHALL distinguish between real zeros and missing values using 'NA' markers
3. THE OpenAI_Rationale_Service SHALL ensure cache keys are stable across different null/undefined value combinations
4. WHEN context values are missing, THE OpenAI_Rationale_Service SHALL use consistent string representations in cache keys
5. THE OpenAI_Rationale_Service SHALL validate cache key uniqueness to prevent cache collisions

### Requirement 8

**User Story:** As a system administrator, I want comprehensive logging and monitoring, so that rationale service performance can be tracked and optimized.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL log response text length and first 80 characters instead of full response blobs
2. WHEN API calls complete, THE OpenAI_Rationale_Service SHALL log token usage, cost, and response time metrics
3. THE OpenAI_Rationale_Service SHALL track and report performance improvements from optimization changes
4. WHEN errors occur, THE OpenAI_Rationale_Service SHALL log detailed error context without exposing sensitive data
5. THE OpenAI_Rationale_Service SHALL provide monitoring metrics for timeout rates, retry counts, and success rates

### Requirement 9

**User Story:** As a quality assurance engineer, I want optimized reasoning controls, so that rationale quality is maintained while improving performance.

#### Acceptance Criteria

1. THE OpenAI_Rationale_Service SHALL use reasoning.effort: 'low' for rationale generation to balance quality and speed
2. WHEN configuring API requests, THE OpenAI_Rationale_Service SHALL use text.verbosity: 'low' for concise outputs
3. THE OpenAI_Rationale_Service SHALL validate that low-effort reasoning still produces acceptable rationale quality
4. WHEN quality metrics fall below thresholds, THE OpenAI_Rationale_Service SHALL escalate to higher effort levels
5. THE OpenAI_Rationale_Service SHALL monitor and report quality vs performance trade-offs for optimization tuning

### Requirement 10

**User Story:** As a developer, I want the MarketAnalysisService to use enforced JSON schemas, so that structured outputs are guaranteed without parsing failures.

#### Acceptance Criteria

1. THE Market_Analysis_Service SHALL use response_format with json_schema and strict: true to enforce structured JSON outputs
2. WHEN making API requests, THE Market_Analysis_Service SHALL define complete JSON schemas for MarketAnalysis responses
3. THE Market_Analysis_Service SHALL remove "Always respond with valid JSON" from prompts and rely on API-enforced schemas
4. WHEN JSON parsing fails, THE Market_Analysis_Service SHALL provide clear error messages indicating schema validation failure
5. THE Market_Analysis_Service SHALL validate that all required fields are present in the enforced schema

### Requirement 11

**User Story:** As a performance engineer, I want optimized token limits and reasoning settings, so that market analysis completes in seconds rather than minutes.

#### Acceptance Criteria

1. THE Market_Analysis_Service SHALL reduce max_output_tokens from 16000 to 3000-4000 for market analysis responses
2. WHEN configuring reasoning settings, THE Market_Analysis_Service SHALL use reasoning.effort: 'medium' instead of 'high'
3. THE Market_Analysis_Service SHALL use text.verbosity: 'medium' for balanced output detail
4. WHEN analysis takes longer than expected, THE Market_Analysis_Service SHALL provide fallback options with lower token limits
5. THE Market_Analysis_Service SHALL achieve 3-6x faster wall-time performance compared to current implementation

### Requirement 12

**User Story:** As a system administrator, I want proper timeout and retry handling for market analysis, so that long-running operations don't cause system hangs.

#### Acceptance Criteria

1. THE Market_Analysis_Service SHALL implement 90-second timeouts per API call using AbortController
2. WHEN timeouts occur, THE Market_Analysis_Service SHALL retry with reduced token limits or lower reasoning effort
3. THE Market_Analysis_Service SHALL handle AbortError exceptions and provide appropriate fallback behavior
4. WHEN retries are exhausted, THE Market_Analysis_Service SHALL fail gracefully with detailed error context
5. THE Market_Analysis_Service SHALL log timeout events and retry attempts for monitoring

### Requirement 13

**User Story:** As a cost optimization engineer, I want pre-aggregated input data, so that token usage is minimized without losing analytical value.

#### Acceptance Criteria

1. THE Market_Analysis_Service SHALL pre-aggregate store and competitor data before sending to the AI model
2. WHEN processing large datasets, THE Market_Analysis_Service SHALL provide summary statistics instead of raw coordinate arrays
3. THE Market_Analysis_Service SHALL include at most 10 representative coordinates per category in prompts
4. WHEN full data arrays are needed, THE Market_Analysis_Service SHALL send IDs only and reference them by ID
5. THE Market_Analysis_Service SHALL calculate store density, mean/median distances, and population per store before API calls

### Requirement 14

**User Story:** As a developer, I want proper caching implementation, so that market analysis results are reused instead of recomputed.

#### Acceptance Criteria

1. THE Market_Analysis_Service SHALL implement functional caching that actually stores and retrieves analysis results
2. WHEN building cache keys, THE Market_Analysis_Service SHALL include region bounds hash and dataset version
3. THE Market_Analysis_Service SHALL store complete AI JSON responses with model configuration metadata
4. WHEN model parameters change, THE Market_Analysis_Service SHALL invalidate cached results appropriately
5. THE Market_Analysis_Service SHALL use 7-day TTL for cached market analysis results

### Requirement 15

**User Story:** As a code maintainer, I want clean configuration management, so that unused parameters don't cause confusion.

#### Acceptance Criteria

1. THE Market_Analysis_Service SHALL remove unused TEMPERATURE constants from service files
2. WHEN configuring AI models, THE Market_Analysis_Service SHALL rely on reasoning.effort and text.verbosity instead of temperature
3. THE Market_Analysis_Service SHALL treat temperature as advisory only for GPT-5 reasoning models
4. WHEN temperature is used, THE Market_Analysis_Service SHALL document that it's not the primary control mechanism
5. THE Market_Analysis_Service SHALL maintain clean configuration interfaces without deprecated parameters