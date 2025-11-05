import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LocationIntelligenceService } from './location-intelligence.service';
import { DemographicAnalysisService } from './demographic-analysis.service';
import { AIDemographicInferenceService } from './ai-demographic-inference.service';
import { ViabilityAssessmentService } from './viability-assessment.service';
import { GeographicAnalysisService } from './geographic-analysis.service';
import { CompetitiveAnalysisService } from './competitive-analysis.service';
import { StrategicRationaleService } from './strategic-rationale.service';
import { PatternDetectionService } from './pattern-detection.service';
import { GeographicValidationService } from './geographic-validation.service';
import { IntelligenceCacheService } from './cache/intelligence-cache.service';
import { RedisCacheService } from './cache/redis-cache.service';
import { CacheManagerService } from './cache/cache-manager.service';
import { PerformanceOptimizerService } from './performance/performance-optimizer.service';
import { PerformanceMonitorService } from './performance/performance-monitor.service';
import { OptimizedLocationIntelligenceService } from './optimized-location-intelligence.service';

@Module({
  providers: [
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
    LocationIntelligenceService,
    DemographicAnalysisService,
    AIDemographicInferenceService,
    ViabilityAssessmentService,
    GeographicAnalysisService,
    CompetitiveAnalysisService,
    StrategicRationaleService,
    PatternDetectionService,
    GeographicValidationService,
    IntelligenceCacheService,
    RedisCacheService,
    CacheManagerService,
    PerformanceOptimizerService,
    PerformanceMonitorService,
    OptimizedLocationIntelligenceService,
  ],
  exports: [
    LocationIntelligenceService, 
    DemographicAnalysisService, 
    AIDemographicInferenceService,
    ViabilityAssessmentService,
    GeographicAnalysisService,
    CompetitiveAnalysisService,
    StrategicRationaleService,
    PatternDetectionService,
    GeographicValidationService,
    CacheManagerService,
    PerformanceOptimizerService,
    PerformanceMonitorService,
    OptimizedLocationIntelligenceService,
  ],
})
export class IntelligenceModule {}

// Export all intelligence services for easy importing
export { LocationIntelligenceService } from './location-intelligence.service';
export { DemographicAnalysisService } from './demographic-analysis.service';
export { AIDemographicInferenceService } from './ai-demographic-inference.service';
export { ViabilityAssessmentService } from './viability-assessment.service';
export { GeographicAnalysisService } from './geographic-analysis.service';
export { CompetitiveAnalysisService } from './competitive-analysis.service';
export { StrategicRationaleService } from './strategic-rationale.service';
export { PatternDetectionService } from './pattern-detection.service';
export { GeographicValidationService } from './geographic-validation.service';
export { CacheManagerService } from './cache/cache-manager.service';
export { IntelligenceCacheService } from './cache/intelligence-cache.service';
export { RedisCacheService } from './cache/redis-cache.service';
export * from '../../types/intelligence.types';
export * from '../../config/intelligence.config';