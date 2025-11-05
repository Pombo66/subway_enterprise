import { Injectable, Logger } from '@nestjs/common';
import { CacheManagerService } from '../cache/cache-manager.service';
import { 
  DemographicProfile, 
  LocationIntelligence, 
  ViabilityAssessment, 
  CompetitiveAnalysis,
  LocationAnalysis,
  EnhancedSuggestion 
} from '../../../types/intelligence.types';
import { ExpansionSuggestion } from '../../expansion.service';

export interface BatchProcessingOptions {
  batchSize: number;
  concurrency: number;
  delayBetweenBatches: number;
  enableCaching: boolean;
  prioritizeByScore: boolean;
}

export interface PerformanceMetrics {
  totalProcessingTime: number;
  averageTimePerLocation: number;
  cacheHitRate: number;
  parallelEfficiency: number;
  batchesProcessed: number;
  locationsProcessed: number;
  errorsEncountered: number;
}

@Injectable()
export class PerformanceOptimizerService {
  private readonly logger = new Logger(PerformanceOptimizerService.name);
  
  private readonly defaultBatchOptions: BatchProcessingOptions = {
    batchSize: 5,
    concurrency: 3,
    delayBetweenBatches: 100,
    enableCaching: true,
    prioritizeByScore: true
  };

  private metrics: PerformanceMetrics = {
    totalProcessingTime: 0,
    averageTimePerLocation: 0,
    cacheHitRate: 0,
    parallelEfficiency: 0,
    batchesProcessed: 0,
    locationsProcessed: 0,
    errorsEncountered: 0
  };

  constructor(
    private readonly cacheManager: CacheManagerService
  ) {}

  // Parallel processing for multiple location analysis
  async processLocationsInParallel<T>(
    locations: Array<{ lat: number; lng: number }>,
    processor: (lat: number, lng: number) => Promise<T>,
    options: Partial<BatchProcessingOptions> = {}
  ): Promise<Array<{ location: { lat: number; lng: number }; result: T | null; error?: string }>> {
    const opts = { ...this.defaultBatchOptions, ...options };
    const startTime = Date.now();
    
    this.logger.log(`Processing ${locations.length} locations in parallel with batch size ${opts.batchSize}`);

    // Sort by priority if enabled
    const sortedLocations = opts.prioritizeByScore 
      ? this.sortLocationsByPriority(locations)
      : locations;

    const results: Array<{ location: { lat: number; lng: number }; result: T | null; error?: string }> = [];
    let cacheHits = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < sortedLocations.length; i += opts.batchSize) {
      const batch = sortedLocations.slice(i, i + opts.batchSize);
      const batchStartTime = Date.now();

      try {
        // Process batch with controlled concurrency
        const batchPromises = batch.map(async (location) => {
          try {
            // Check cache first if enabled
            if (opts.enableCaching) {
              const cached = await this.checkCache<T>(location.lat, location.lng, processor.name);
              if (cached !== null) {
                cacheHits++;
                return { location, result: cached };
              }
            }

            // Process location
            const result = await processor(location.lat, location.lng);
            
            // Cache result if enabled
            if (opts.enableCaching && result !== null) {
              await this.cacheResult(location.lat, location.lng, result, processor.name);
            }

            return { location, result };
          } catch (error) {
            errors++;
            this.logger.error(`Error processing location ${location.lat},${location.lng}:`, error);
            return { location, result: null, error: error instanceof Error ? error.message : String(error) };
          }
        });

        // Wait for batch completion with concurrency control
        const batchResults = await this.processConcurrently(batchPromises, opts.concurrency);
        results.push(...batchResults);

        const batchTime = Date.now() - batchStartTime;
        this.logger.debug(`Batch ${Math.floor(i / opts.batchSize) + 1} completed in ${batchTime}ms`);

        // Delay between batches to avoid overwhelming external APIs
        if (i + opts.batchSize < sortedLocations.length && opts.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, opts.delayBetweenBatches));
        }

        this.metrics.batchesProcessed++;
      } catch (error) {
        this.logger.error(`Batch processing failed:`, error);
        errors++;
      }
    }

    // Update metrics
    const totalTime = Date.now() - startTime;
    this.updateMetrics(totalTime, locations.length, cacheHits, errors);

    this.logger.log(`Parallel processing completed: ${results.length} locations in ${totalTime}ms`);
    
    return results;
  }

  // Optimized batch processing for demographic profiles
  async batchProcessDemographicProfiles(
    locations: Array<{ lat: number; lng: number }>,
    processor: (lat: number, lng: number) => Promise<DemographicProfile>,
    options: Partial<BatchProcessingOptions> = {}
  ): Promise<Map<string, DemographicProfile>> {
    const results = new Map<string, DemographicProfile>();
    
    // Check cache for all locations first
    if (options.enableCaching !== false) {
      const cachedProfiles = await this.cacheManager.getMultipleDemographicProfiles(locations);
      
      // Add cached results
      for (const [key, profile] of cachedProfiles.entries()) {
        results.set(key, profile);
      }
      
      // Filter out cached locations
      const uncachedLocations = locations.filter(loc => 
        !cachedProfiles.has(`${loc.lat},${loc.lng}`)
      );
      
      if (uncachedLocations.length === 0) {
        this.logger.log(`All ${locations.length} demographic profiles found in cache`);
        return results;
      }
      
      this.logger.log(`Processing ${uncachedLocations.length} uncached demographic profiles`);
      
      // Process uncached locations
      const processedResults = await this.processLocationsInParallel(
        uncachedLocations,
        processor,
        options
      );
      
      // Add processed results and cache them
      const profilesToCache: Array<{ lat: number; lng: number; profile: DemographicProfile }> = [];
      
      for (const { location, result } of processedResults) {
        if (result) {
          const key = `${location.lat},${location.lng}`;
          results.set(key, result);
          profilesToCache.push({ lat: location.lat, lng: location.lng, profile: result });
        }
      }
      
      // Batch cache the new profiles
      if (profilesToCache.length > 0) {
        await this.cacheManager.setMultipleDemographicProfiles(profilesToCache);
      }
    } else {
      // Process all locations without caching
      const processedResults = await this.processLocationsInParallel(locations, processor, options);
      
      for (const { location, result } of processedResults) {
        if (result) {
          const key = `${location.lat},${location.lng}`;
          results.set(key, result);
        }
      }
    }
    
    return results;
  }

  // Request batching for external API calls
  async batchExternalAPIRequests<TRequest, TResponse>(
    requests: TRequest[],
    apiCall: (batch: TRequest[]) => Promise<TResponse[]>,
    batchSize: number = 10,
    delayBetweenBatches: number = 200
  ): Promise<TResponse[]> {
    const results: TResponse[] = [];
    
    this.logger.log(`Batching ${requests.length} API requests with batch size ${batchSize}`);
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      try {
        const batchResults = await apiCall(batch);
        results.push(...batchResults);
        
        this.logger.debug(`API batch ${Math.floor(i / batchSize) + 1} completed: ${batchResults.length} results`);
        
        // Delay between batches to respect rate limits
        if (i + batchSize < requests.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      } catch (error) {
        this.logger.error(`API batch request failed:`, error);
        // Continue with next batch rather than failing entirely
      }
    }
    
    return results;
  }

  // Intelligent caching strategy
  async optimizeWithIntelligentCaching<T>(
    locations: Array<{ lat: number; lng: number; priority?: number }>,
    processor: (lat: number, lng: number) => Promise<T>,
    cacheKey: string
  ): Promise<Array<{ location: { lat: number; lng: number }; result: T | null }>> {
    // Sort by priority (higher priority first)
    const sortedLocations = locations.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Check cache for all locations
    const cacheResults = await Promise.all(
      sortedLocations.map(async (loc) => ({
        location: loc,
        cached: await this.checkCache<T>(loc.lat, loc.lng, cacheKey)
      }))
    );
    
    // Separate cached and uncached
    const cached = cacheResults.filter(r => r.cached !== null);
    const uncached = cacheResults.filter(r => r.cached === null);
    
    this.logger.log(`Cache status: ${cached.length} cached, ${uncached.length} uncached`);
    
    // Process uncached locations with optimized batching
    const uncachedResults = await this.processLocationsInParallel(
      uncached.map(r => r.location),
      processor,
      {
        batchSize: Math.min(5, uncached.length),
        concurrency: 3,
        enableCaching: true,
        prioritizeByScore: true
      }
    );
    
    // Combine results
    const allResults = [
      ...cached.map(r => ({ location: r.location, result: r.cached })),
      ...uncachedResults
    ];
    
    return allResults;
  }

  // Performance monitoring and metrics
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalProcessingTime: 0,
      averageTimePerLocation: 0,
      cacheHitRate: 0,
      parallelEfficiency: 0,
      batchesProcessed: 0,
      locationsProcessed: 0,
      errorsEncountered: 0
    };
  }

  // Adaptive batch sizing based on performance
  calculateOptimalBatchSize(
    totalLocations: number,
    averageProcessingTime: number,
    targetLatency: number = 10000
  ): number {
    // Calculate optimal batch size based on target latency and processing time
    const maxConcurrentBatches = 3;
    const optimalBatchSize = Math.floor(targetLatency / (averageProcessingTime * maxConcurrentBatches));
    
    // Ensure batch size is within reasonable bounds
    return Math.max(1, Math.min(10, optimalBatchSize));
  }

  // Memory usage optimization
  async processWithMemoryOptimization<T>(
    locations: Array<{ lat: number; lng: number }>,
    processor: (lat: number, lng: number) => Promise<T>,
    maxMemoryUsage: number = 100 * 1024 * 1024 // 100MB
  ): Promise<Array<{ location: { lat: number; lng: number }; result: T | null }>> {
    const results: Array<{ location: { lat: number; lng: number }; result: T | null }> = [];
    let currentMemoryUsage = 0;
    
    // Process in smaller batches if memory usage is high
    const memoryAwareBatchSize = this.calculateMemoryAwareBatchSize(maxMemoryUsage);
    
    for (let i = 0; i < locations.length; i += memoryAwareBatchSize) {
      const batch = locations.slice(i, i + memoryAwareBatchSize);
      
      const batchResults = await this.processLocationsInParallel(
        batch,
        processor,
        { batchSize: memoryAwareBatchSize, concurrency: 2 }
      );
      
      results.push(...batchResults);
      
      // Monitor memory usage
      const memoryUsage = process.memoryUsage();
      currentMemoryUsage = memoryUsage.heapUsed;
      
      if (currentMemoryUsage > maxMemoryUsage) {
        this.logger.warn(`Memory usage high: ${Math.round(currentMemoryUsage / 1024 / 1024)}MB`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Add delay to allow memory cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  // Private helper methods
  private async processConcurrently<T>(
    promises: Promise<T>[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  private sortLocationsByPriority(
    locations: Array<{ lat: number; lng: number; priority?: number }>
  ): Array<{ lat: number; lng: number }> {
    return locations
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map(({ lat, lng }) => ({ lat, lng }));
  }

  private async checkCache<T>(lat: number, lng: number, cacheKey: string): Promise<T | null> {
    try {
      switch (cacheKey) {
        case 'getDemographicProfile':
          return await this.cacheManager.getDemographicProfile(lat, lng) as T | null;
        case 'getLocationIntelligence':
          return await this.cacheManager.getLocationIntelligence(lat, lng) as T | null;
        case 'getViabilityAssessment':
          return await this.cacheManager.getViabilityAssessment(lat, lng) as T | null;
        case 'getCompetitiveAnalysis':
          return await this.cacheManager.getCompetitiveAnalysis(lat, lng) as T | null;
        case 'getLocationAnalysis':
          return await this.cacheManager.getLocationAnalysis(lat, lng) as T | null;
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`Cache check failed for ${cacheKey}:`, error);
      return null;
    }
  }

  private async cacheResult<T>(lat: number, lng: number, result: T, cacheKey: string): Promise<void> {
    try {
      switch (cacheKey) {
        case 'getDemographicProfile':
          await this.cacheManager.setDemographicProfile(lat, lng, result as DemographicProfile);
          break;
        case 'getLocationIntelligence':
          await this.cacheManager.setLocationIntelligence(lat, lng, result as LocationIntelligence);
          break;
        case 'getViabilityAssessment':
          await this.cacheManager.setViabilityAssessment(lat, lng, result as ViabilityAssessment);
          break;
        case 'getCompetitiveAnalysis':
          await this.cacheManager.setCompetitiveAnalysis(lat, lng, result as CompetitiveAnalysis);
          break;
        case 'getLocationAnalysis':
          await this.cacheManager.setLocationAnalysis(lat, lng, result as LocationAnalysis);
          break;
      }
    } catch (error) {
      this.logger.error(`Cache set failed for ${cacheKey}:`, error);
    }
  }

  private updateMetrics(
    totalTime: number,
    locationsProcessed: number,
    cacheHits: number,
    errors: number
  ): void {
    this.metrics.totalProcessingTime += totalTime;
    this.metrics.locationsProcessed += locationsProcessed;
    this.metrics.errorsEncountered += errors;
    
    if (locationsProcessed > 0) {
      this.metrics.averageTimePerLocation = this.metrics.totalProcessingTime / this.metrics.locationsProcessed;
      this.metrics.cacheHitRate = cacheHits / locationsProcessed;
    }
    
    // Calculate parallel efficiency (simplified)
    const sequentialTime = this.metrics.averageTimePerLocation * locationsProcessed;
    this.metrics.parallelEfficiency = sequentialTime > 0 ? totalTime / sequentialTime : 1;
  }

  private calculateMemoryAwareBatchSize(maxMemoryUsage: number): number {
    const currentMemory = process.memoryUsage().heapUsed;
    const availableMemory = maxMemoryUsage - currentMemory;
    
    // Estimate memory per location (rough approximation)
    const estimatedMemoryPerLocation = 50 * 1024; // 50KB per location
    
    const maxBatchSize = Math.floor(availableMemory / estimatedMemoryPerLocation);
    
    // Ensure batch size is within reasonable bounds
    return Math.max(1, Math.min(10, maxBatchSize));
  }
}