# Implementation Plan

- [x] 1. Model Configuration Cleanup and Centralization
  - Create centralized Model Configuration Manager service
  - Remove all hardcoded GPT-4o model references from existing services
  - Update environment configuration to use only GPT-5 family models
  - Implement model validation and fallback logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 1.1 Create Model Configuration Manager
  - Implement IModelConfigurationManager interface with centralized model selection
  - Add AIOperationType enum for different operation types
  - Create ModelConfig interface for environment-based configuration
  - Add model validation and error handling for unsupported models
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 1.2 Remove GPT-4o references from existing services
  - Update OpenAIRationaleService to use Model Configuration Manager
  - Remove hardcoded 'gpt-4o-mini' references from BFF services
  - Update all cost estimation functions to use GPT-5 pricing
  - Replace GPT-4o fallback defaults with 'gpt-5-mini'
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.3 Update environment configuration files
  - Ensure all .env files use GPT-5 models consistently
  - Add new environment variables for model-specific configuration
  - Update configuration validation to reject GPT-4o models
  - Add environment-based model override support
  - _Requirements: 1.2, 1.4, 5.3_

- [x] 2. Market Intelligence Service Implementation
  - Create Market Analysis Service using GPT-5-mini
  - Implement strategic zone identification algorithms
  - Add competitive landscape assessment capabilities
  - Integrate market analysis into expansion generation pipeline
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1 Create Market Analysis Service
  - Implement IMarketAnalysisService interface with GPT-5-mini integration
  - Create MarketAnalysis and StrategicZone data models
  - Add market saturation analysis and growth opportunity identification
  - Implement competitive gap analysis and demographic insights
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 Implement strategic zone identification
  - Create algorithms to identify high-potential expansion zones
  - Add zone prioritization based on market analysis results
  - Implement zone boundary calculation and geographic clustering
  - Add reasoning and opportunity type classification for each zone
  - _Requirements: 2.2, 2.4_

- [x] 2.3 Add competitive landscape assessment
  - Implement competitor proximity analysis and market positioning
  - Add competitive advantage identification algorithms
  - Create competitive gap analysis for underserved areas
  - Integrate competitive data into strategic zone scoring
  - _Requirements: 2.3, 2.5_

- [x] 3. Location Discovery Service with GPT-5-nano
  - Create Location Discovery Service using GPT-5-nano for high-volume generation
  - Implement strategic zone-guided location candidate generation
  - Add basic viability scoring and validation
  - Integrate location discovery with market intelligence results
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3.1 Create Location Discovery Service
  - Implement ILocationDiscoveryService interface with GPT-5-nano
  - Create LocationCandidate data model with basic scoring
  - Add high-volume candidate generation capabilities (1000+ locations)
  - Implement batching logic to minimize API costs
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 Implement strategic zone-guided generation
  - Use strategic zones from market analysis to guide location selection
  - Add zone-specific candidate generation with appropriate density
  - Implement intelligent distribution across multiple strategic zones
  - Add reasoning capture for why candidates were selected in each zone
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3.3 Add basic viability scoring and validation
  - Implement basic viability checks using GPT-5-nano
  - Add location validation against known constraints and restrictions
  - Create viability factor identification and scoring
  - Add quality validation with escalation to GPT-5-mini if needed
  - _Requirements: 3.4, 3.5, 8.1, 8.2_

- [x] 4. Strategic Scoring Service Enhancement
  - Enhance Strategic Scoring Service to use GPT-5-mini for intelligent analysis
  - Implement market context-aware scoring algorithms
  - Add detailed rationale generation for final recommendations
  - Create intelligent ranking and prioritization logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.1 Enhance Strategic Scoring Service
  - Update existing service to use GPT-5-mini through Model Configuration Manager
  - Implement IStrategicScoringService interface with market context integration
  - Create ScoredCandidate data model with strategic scoring fields
  - Add strategic reasoning capture and analysis
  - _Requirements: 4.1, 4.2_

- [x] 4.2 Implement market context-aware scoring
  - Integrate market analysis results into location scoring algorithms
  - Add competitive positioning and demographic alignment scoring
  - Implement strategic value assessment based on market opportunities
  - Create multi-factor scoring with revenue projection and risk assessment
  - _Requirements: 4.2, 4.3_

- [x] 4.3 Add detailed rationale generation
  - Implement comprehensive rationale generation using GPT-5-mini
  - Add market context and strategic reasoning to rationale explanations
  - Create location-specific rationale with competitive and demographic insights
  - Ensure rationale quality meets business analyst requirements
  - _Requirements: 4.3, 4.4_

- [x] 5. AI Pipeline Controller Implementation
  - Create AI Pipeline Controller to orchestrate multi-stage processing
  - Implement phase-by-phase execution with proper error handling
  - Add pipeline monitoring and progress tracking
  - Integrate all AI services into cohesive expansion generation workflow
  - _Requirements: 2.4, 2.5, 6.4, 6.5_

- [x] 5.1 Create AI Pipeline Controller
  - Implement IAIPipelineController interface with multi-stage orchestration
  - Add phase execution methods for market analysis, location discovery, and scoring
  - Create pipeline state management and progress tracking
  - Implement error handling and recovery between pipeline stages
  - _Requirements: 2.4, 2.5_

- [x] 5.2 Integrate pipeline with existing expansion generation
  - Update ExpansionGenerationService to use new AI Pipeline Controller
  - Maintain backward compatibility with existing API interfaces
  - Add feature flags to enable/disable new pipeline functionality
  - Create migration path from old to new pipeline execution
  - _Requirements: 6.4, 6.5_

- [x] 6. Cost Optimization Engine Implementation
  - Create Cost Optimization Engine for tracking and optimization
  - Implement detailed cost tracking by model and operation type
  - Add cost projection and optimization recommendation algorithms
  - Create cost reporting and monitoring capabilities
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6.1 Create Cost Optimization Engine
  - Implement ICostOptimizationEngine interface with comprehensive tracking
  - Create CostReport data model with detailed cost breakdowns
  - Add token usage tracking by model and operation type
  - Implement cost estimation algorithms for different operation volumes
  - _Requirements: 7.1, 7.2_

- [x] 6.2 Add cost optimization recommendations
  - Implement algorithms to analyze cost patterns and suggest optimizations
  - Add model selection optimization based on volume and quality requirements
  - Create cost threshold monitoring with warning and alert capabilities
  - Add cost projection for different expansion scenarios
  - _Requirements: 7.3, 7.4_

- [x] 6.3 Create cost reporting and monitoring
  - Implement detailed cost reporting with savings calculations
  - Add real-time cost monitoring and budget tracking
  - Create cost optimization dashboards and alerts
  - Add historical cost analysis and trend reporting
  - _Requirements: 7.5_

- [x] 7. Quality Assurance and Validation
  - Implement quality validation for AI outputs across all models
  - Add automatic escalation from nano to mini when quality thresholds not met
  - Create quality metrics and monitoring for AI-generated content
  - Add validation that cost optimization doesn't compromise recommendation quality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7.1 Implement AI output quality validation
  - Create quality scoring algorithms for AI-generated content
  - Add validation rules for location discovery and strategic analysis outputs
  - Implement quality threshold checking with automatic escalation logic
  - Create quality metrics tracking and reporting
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 7.2 Add quality-cost balance optimization
  - Implement algorithms to balance cost efficiency with output quality
  - Add quality-based model selection with automatic adjustment capabilities
  - Create quality assurance workflows that maintain recommendation reliability
  - Add quality validation for expansion recommendations before final output
  - _Requirements: 8.4, 8.5_

- [x] 8. Testing and Validation
  - Create comprehensive unit tests for all new AI services and components
  - Add integration tests for end-to-end AI pipeline execution
  - Implement cost tracking accuracy tests and performance benchmarks
  - Create quality validation tests for AI outputs

- [x] 8.1 Unit testing for AI services
  - Write unit tests for Model Configuration Manager validation logic
  - Create tests for Market Analysis Service AI integration
  - Add unit tests for Location Discovery Service with GPT-5-nano
  - Test Strategic Scoring Service enhancements and cost optimization engine

- [x] 8.2 Integration testing for AI pipeline
  - Create end-to-end tests for complete AI pipeline execution
  - Add integration tests for model switching and fallback behavior
  - Test cost tracking accuracy across different operation scenarios
  - Validate quality assurance workflows and escalation logic

- [x] 8.3 Performance and cost validation testing
  - Create performance benchmarks for high-volume location discovery
  - Add cost optimization testing under various load scenarios
  - Test response time benchmarks for each AI operation type
  - Validate actual costs match estimates and savings calculations