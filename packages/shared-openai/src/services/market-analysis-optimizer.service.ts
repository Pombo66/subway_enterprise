/**
 * Market Analysis Optimizer Service
 * Optimizes market analysis performance through token limits and data pre-aggregation
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

export interface MarketAnalysisConfig {
  maxOutputTokens: number; // Reduced from 16000 to 3000-4000
  reasoningEffort: 'low' | 'medium' | 'high';
  textVerbosity: 'low' | 'medium' | 'high';
  enableDataAggregation: boolean;
  maxCoordinatesPerCategory: number;
  fallbackTokenLimit: number;
}

export interface DataAggregationConfig {
  maxStoreCoordinates: number;
  maxCompetitorCoordinates: number;
  includeSummaryStats: boolean;
  useRepresentativeSampling: boolean;
}

export interface OptimizedMarketData {
  stores: {
    count: number;
    coordinates?: Array<{ lat: number; lng: number; id?: string }>;
    summaryStats?: {
      avgLat: number;
      avgLng: number;
      density: number;
      coverage: number;
    };
    representativePoints?: Array<{ lat: number; lng: number; weight: number }>;
  };
  competitors: {
    count: number;
    coordinates?: Array<{ lat: number; lng: number; brand?: string }>;
    summaryStats?: {
      avgLat: number;
      avgLng: number;
      density: number;
      brandDistribution: Record<string, number>;
    };
    representativePoints?: Array<{ lat: number; lng: number; weight: number }>;
  };
  metadata: {
    originalDataSize: number;
    optimizedDataSize: number;
    compressionRatio: number;
    aggregationMethod: string;
  };
}

export class MarketAnalysisOptimizerService {
  private readonly config: MarketAnalysisConfig;
  private readonly aggregationConfig: DataAggregationConfig;
  private readonly logger: (message: string, data?: any) => void;

  constructor(
    config: Partial<MarketAnalysisConfig> = {},
    aggregationConfig: Partial<DataAggregationConfig> = {},
    logger?: (message: string, data?: any) => void
  ) {
    this.config = {
      maxOutputTokens: 3500, // Requirement 11.1: Reduced from 16000 to 3000-4000
      reasoningEffort: 'medium', // Requirement 11.2: Changed from 'high' to 'medium'
      textVerbosity: 'medium', // Requirement 11.3: Set to 'medium' for balanced output
      enableDataAggregation: true,
      maxCoordinatesPerCategory: 10, // Requirement 13.3: Maximum 10 representative coordinates
      fallbackTokenLimit: 2000, // Requirement 11.4: Fallback for timeout scenarios
      ...config
    };

    this.aggregationConfig = {
      maxStoreCoordinates: 10,
      maxCompetitorCoordinates: 10,
      includeSummaryStats: true,
      useRepresentativeSampling: true,
      ...aggregationConfig
    };

    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[MarketAnalysisOptimizer] ${message}`, data || '');
    });
  }

  /**
   * Optimize API request for market analysis
   * Requirements: 11.1, 11.2, 11.3, 11.4
   */
  optimizeAPIRequest(baseRequest: any, isTimeoutScenario: boolean = false): any {
    const optimizedRequest = { ...baseRequest };

    // Requirement 11.1: Reduce max_output_tokens from 16000 to 3000-4000
    optimizedRequest.max_output_tokens = isTimeoutScenario 
      ? this.config.fallbackTokenLimit 
      : this.config.maxOutputTokens;

    // Requirement 11.2: Change reasoning.effort from 'high' to 'medium'
    if (optimizedRequest.reasoning) {
      optimizedRequest.reasoning.effort = this.config.reasoningEffort;
    } else {
      optimizedRequest.reasoning = { effort: this.config.reasoningEffort };
    }

    // Requirement 11.3: Set text.verbosity to 'medium' for balanced detail and performance
    if (optimizedRequest.text) {
      optimizedRequest.text.verbosity = this.config.textVerbosity;
    } else {
      optimizedRequest.text = { verbosity: this.config.textVerbosity };
    }

    this.logger('Optimized API request for market analysis', {
      maxOutputTokens: optimizedRequest.max_output_tokens,
      reasoningEffort: this.config.reasoningEffort,
      textVerbosity: this.config.textVerbosity,
      isTimeoutScenario
    });

    return optimizedRequest;
  }

  /**
   * Pre-aggregate input data to minimize token usage
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  aggregateMarketData(rawData: {
    stores: Array<{ lat: number; lng: number; id?: string; [key: string]: any }>;
    competitors: Array<{ lat: number; lng: number; brand?: string; [key: string]: any }>;
  }): OptimizedMarketData {
    const originalSize = this.calculateDataSize(rawData);
    
    this.logger('Starting data aggregation', {
      originalStores: rawData.stores.length,
      originalCompetitors: rawData.competitors.length,
      originalSize
    });

    // Aggregate store data (Requirement 13.1, 13.2)
    const aggregatedStores = this.aggregateStoreData(rawData.stores);
    
    // Aggregate competitor data (Requirement 13.1, 13.2)
    const aggregatedCompetitors = this.aggregateCompetitorData(rawData.competitors);

    const optimizedData: OptimizedMarketData = {
      stores: aggregatedStores,
      competitors: aggregatedCompetitors,
      metadata: {
        originalDataSize: originalSize,
        optimizedDataSize: 0,
        compressionRatio: 0,
        aggregationMethod: this.aggregationConfig.useRepresentativeSampling ? 'representative_sampling' : 'summary_stats'
      }
    };

    // Calculate optimized size and compression ratio
    optimizedData.metadata.optimizedDataSize = this.calculateDataSize(optimizedData);
    optimizedData.metadata.compressionRatio = optimizedData.metadata.originalDataSize > 0 
      ? optimizedData.metadata.optimizedDataSize / optimizedData.metadata.originalDataSize 
      : 1;

    this.logger('Data aggregation completed', {
      compressionRatio: optimizedData.metadata.compressionRatio,
      tokensSaved: Math.round((originalSize - optimizedData.metadata.optimizedDataSize) / 4), // Rough token estimate
      storesReduced: rawData.stores.length - (aggregatedStores.coordinates?.length || 0),
      competitorsReduced: rawData.competitors.length - (aggregatedCompetitors.coordinates?.length || 0)
    });

    return optimizedData;
  }

  /**
   * Create optimized prompt with pre-aggregated data
   * Requirement 13.4: Send IDs only when full data arrays are needed
   */
  createOptimizedPrompt(
    basePrompt: string,
    optimizedData: OptimizedMarketData,
    includeFullData: boolean = false
  ): string {
    const promptParts = [basePrompt];

    // Add store information
    if (includeFullData && optimizedData.stores.coordinates) {
      // Send full coordinate data when explicitly needed
      const storeCoords = optimizedData.stores.coordinates
        .map(store => `${store.lat.toFixed(4)},${store.lng.toFixed(4)}${store.id ? `:${store.id}` : ''}`)
        .join(';');
      promptParts.push(`Stores (${optimizedData.stores.count}): ${storeCoords}`);
    } else {
      // Send summary statistics instead of raw coordinates (Requirement 13.2)
      if (optimizedData.stores.summaryStats) {
        const stats = optimizedData.stores.summaryStats;
        promptParts.push(`Stores: ${optimizedData.stores.count} total, density=${stats.density.toFixed(2)}, coverage=${stats.coverage.toFixed(2)}`);
      }
      
      // Include representative points if available (Requirement 13.3)
      if (optimizedData.stores.representativePoints) {
        const repPoints = optimizedData.stores.representativePoints
          .slice(0, this.config.maxCoordinatesPerCategory)
          .map(point => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}(w:${point.weight.toFixed(1)})`)
          .join(';');
        promptParts.push(`Store clusters: ${repPoints}`);
      }
    }

    // Add competitor information
    if (includeFullData && optimizedData.competitors.coordinates) {
      const competitorCoords = optimizedData.competitors.coordinates
        .map(comp => `${comp.lat.toFixed(4)},${comp.lng.toFixed(4)}${comp.brand ? `:${comp.brand}` : ''}`)
        .join(';');
      promptParts.push(`Competitors (${optimizedData.competitors.count}): ${competitorCoords}`);
    } else {
      if (optimizedData.competitors.summaryStats) {
        const stats = optimizedData.competitors.summaryStats;
        promptParts.push(`Competitors: ${optimizedData.competitors.count} total, density=${stats.density.toFixed(2)}`);
        
        if (stats.brandDistribution) {
          const topBrands = Object.entries(stats.brandDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([brand, count]) => `${brand}:${count}`)
            .join(',');
          promptParts.push(`Top brands: ${topBrands}`);
        }
      }

      if (optimizedData.competitors.representativePoints) {
        const repPoints = optimizedData.competitors.representativePoints
          .slice(0, this.config.maxCoordinatesPerCategory)
          .map(point => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}(w:${point.weight.toFixed(1)})`)
          .join(';');
        promptParts.push(`Competitor clusters: ${repPoints}`);
      }
    }

    // Add metadata for context
    promptParts.push(`Data: ${optimizedData.metadata.compressionRatio.toFixed(2)}x compressed, ${optimizedData.metadata.aggregationMethod}`);

    return promptParts.join('\n');
  }

  /**
   * Aggregate store data with summary statistics
   */
  private aggregateStoreData(stores: Array<{ lat: number; lng: number; id?: string; [key: string]: any }>) {
    const result: OptimizedMarketData['stores'] = {
      count: stores.length
    };

    if (stores.length === 0) {
      return result;
    }

    // Calculate summary statistics
    if (this.aggregationConfig.includeSummaryStats) {
      const avgLat = stores.reduce((sum, store) => sum + store.lat, 0) / stores.length;
      const avgLng = stores.reduce((sum, store) => sum + store.lng, 0) / stores.length;
      
      // Calculate density (stores per square km - rough estimate)
      const latRange = Math.max(...stores.map(s => s.lat)) - Math.min(...stores.map(s => s.lat));
      const lngRange = Math.max(...stores.map(s => s.lng)) - Math.min(...stores.map(s => s.lng));
      const area = latRange * lngRange * 111 * 111; // Rough km² conversion
      const density = area > 0 ? stores.length / area : 0;
      
      // Calculate coverage (how spread out the stores are)
      const distances = stores.map(store => 
        Math.sqrt(Math.pow(store.lat - avgLat, 2) + Math.pow(store.lng - avgLng, 2))
      );
      const coverage = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;

      result.summaryStats = {
        avgLat,
        avgLng,
        density,
        coverage
      };
    }

    // Create representative points or include limited coordinates
    if (this.aggregationConfig.useRepresentativeSampling && stores.length > this.aggregationConfig.maxStoreCoordinates) {
      result.representativePoints = this.createRepresentativePoints(stores, this.aggregationConfig.maxStoreCoordinates);
    } else {
      result.coordinates = stores.slice(0, this.aggregationConfig.maxStoreCoordinates).map(store => ({
        lat: store.lat,
        lng: store.lng,
        id: store.id
      }));
    }

    return result;
  }

  /**
   * Aggregate competitor data with brand distribution
   */
  private aggregateCompetitorData(competitors: Array<{ lat: number; lng: number; brand?: string; [key: string]: any }>) {
    const result: OptimizedMarketData['competitors'] = {
      count: competitors.length
    };

    if (competitors.length === 0) {
      return result;
    }

    // Calculate summary statistics
    if (this.aggregationConfig.includeSummaryStats) {
      const avgLat = competitors.reduce((sum, comp) => sum + comp.lat, 0) / competitors.length;
      const avgLng = competitors.reduce((sum, comp) => sum + comp.lng, 0) / competitors.length;
      
      // Calculate density
      const latRange = Math.max(...competitors.map(c => c.lat)) - Math.min(...competitors.map(c => c.lat));
      const lngRange = Math.max(...competitors.map(c => c.lng)) - Math.min(...competitors.map(c => c.lng));
      const area = latRange * lngRange * 111 * 111;
      const density = area > 0 ? competitors.length / area : 0;

      // Calculate brand distribution
      const brandDistribution: Record<string, number> = {};
      competitors.forEach(comp => {
        const brand = comp.brand || 'Unknown';
        brandDistribution[brand] = (brandDistribution[brand] || 0) + 1;
      });

      result.summaryStats = {
        avgLat,
        avgLng,
        density,
        brandDistribution
      };
    }

    // Create representative points or include limited coordinates
    if (this.aggregationConfig.useRepresentativeSampling && competitors.length > this.aggregationConfig.maxCompetitorCoordinates) {
      result.representativePoints = this.createRepresentativePoints(competitors, this.aggregationConfig.maxCompetitorCoordinates);
    } else {
      result.coordinates = competitors.slice(0, this.aggregationConfig.maxCompetitorCoordinates).map(comp => ({
        lat: comp.lat,
        lng: comp.lng,
        brand: comp.brand
      }));
    }

    return result;
  }

  /**
   * Create representative points using clustering
   */
  private createRepresentativePoints(
    points: Array<{ lat: number; lng: number; [key: string]: any }>,
    maxPoints: number
  ): Array<{ lat: number; lng: number; weight: number }> {
    if (points.length <= maxPoints) {
      return points.map(point => ({
        lat: point.lat,
        lng: point.lng,
        weight: 1
      }));
    }

    // Simple k-means clustering to create representative points
    const clusters = this.performKMeansClustering(points, maxPoints);
    
    return clusters.map(cluster => ({
      lat: cluster.centroid.lat,
      lng: cluster.centroid.lng,
      weight: cluster.points.length
    }));
  }

  /**
   * Simple k-means clustering implementation
   */
  private performKMeansClustering(
    points: Array<{ lat: number; lng: number }>,
    k: number
  ): Array<{ centroid: { lat: number; lng: number }; points: Array<{ lat: number; lng: number }> }> {
    // Initialize centroids randomly
    const centroids = [];
    for (let i = 0; i < k; i++) {
      const randomPoint = points[Math.floor(Math.random() * points.length)];
      centroids.push({ lat: randomPoint.lat, lng: randomPoint.lng });
    }

    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      // Assign points to nearest centroid
      const clusters = centroids.map(() => ({ points: [] as Array<{ lat: number; lng: number }> }));
      
      for (const point of points) {
        let nearestCentroidIndex = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < centroids.length; i++) {
          const distance = Math.sqrt(
            Math.pow(point.lat - centroids[i].lat, 2) + 
            Math.pow(point.lng - centroids[i].lng, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestCentroidIndex = i;
          }
        }
        
        clusters[nearestCentroidIndex].points.push(point);
      }

      // Update centroids
      let centroidsChanged = false;
      for (let i = 0; i < centroids.length; i++) {
        if (clusters[i].points.length > 0) {
          const newLat = clusters[i].points.reduce((sum, p) => sum + p.lat, 0) / clusters[i].points.length;
          const newLng = clusters[i].points.reduce((sum, p) => sum + p.lng, 0) / clusters[i].points.length;
          
          if (Math.abs(newLat - centroids[i].lat) > 0.0001 || Math.abs(newLng - centroids[i].lng) > 0.0001) {
            centroids[i] = { lat: newLat, lng: newLng };
            centroidsChanged = true;
          }
        }
      }

      if (!centroidsChanged) break;
      iterations++;
    }

    return centroids.map((centroid, i) => ({
      centroid,
      points: clusters[i].points
    }));
  }

  /**
   * Calculate rough data size for compression metrics
   */
  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    config: MarketAnalysisConfig;
    aggregationConfig: DataAggregationConfig;
  } {
    return {
      config: { ...this.config },
      aggregationConfig: { ...this.aggregationConfig }
    };
  }
}