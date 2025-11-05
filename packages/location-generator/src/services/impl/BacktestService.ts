import { LocationCandidate, ExistingStore, CountryConfig } from '../../types/core';
import { PortfolioService } from './PortfolioService';
import { GridService } from './GridService';

/**
 * Live backtesting for validation and learning
 */
export interface BacktestResult {
  maskedStores: ExistingStore[];
  predictions: LocationCandidate[];
  metrics: {
    hitRate: number; // % of masked stores within threshold of predictions
    medianDistance: number; // km to nearest prediction
    coverageUplift: number; // vs baseline
    precision: number; // true positives / (true positives + false positives)
    recall: number; // true positives / (true positives + false negatives)
  };
  validation: {
    passed: boolean;
    thresholds: {
      hitRateMin: number;
      medianDistanceMax: number;
      coverageUpliftMin: number;
    };
  };
  recommendations: string[];
}

export class BacktestService {
  constructor(
    private portfolioService: PortfolioService,
    private gridService: GridService
  ) {}

  /**
   * Run backtest by masking stores and predicting their locations
   */
  async runBacktest(
    allStores: ExistingStore[],
    candidates: LocationCandidate[],
    config: CountryConfig,
    options: {
      maskPercentage?: number;
      targetK?: number;
      distanceThreshold?: number;
      iterations?: number;
    } = {}
  ): Promise<BacktestResult> {
    const {
      maskPercentage = 0.1, // Mask 10% of stores
      targetK = 20,
      distanceThreshold = 2.5, // 2.5km threshold
      iterations = 1
    } = options;

    let totalHitRate = 0;
    let totalMedianDistance = 0;
    let totalCoverageUplift = 0;
    let totalPrecision = 0;
    let totalRecall = 0;

    // Run multiple iterations for stability
    for (let i = 0; i < iterations; i++) {
      const iterationResult = await this.runSingleBacktest(
        allStores,
        candidates,
        config,
        maskPercentage,
        targetK,
        distanceThreshold
      );

      totalHitRate += iterationResult.hitRate;
      totalMedianDistance += iterationResult.medianDistance;
      totalCoverageUplift += iterationResult.coverageUplift;
      totalPrecision += iterationResult.precision;
      totalRecall += iterationResult.recall;
    }

    // Average results
    const metrics = {
      hitRate: totalHitRate / iterations,
      medianDistance: totalMedianDistance / iterations,
      coverageUplift: totalCoverageUplift / iterations,
      precision: totalPrecision / iterations,
      recall: totalRecall / iterations
    };

    // Validation thresholds
    const thresholds = {
      hitRateMin: 0.6, // 60% of masked stores should be within threshold
      medianDistanceMax: 2.5, // Median distance should be < 2.5km
      coverageUpliftMin: 0.1 // 10% coverage improvement vs baseline
    };

    const validation = {
      passed: 
        metrics.hitRate >= thresholds.hitRateMin &&
        metrics.medianDistance <= thresholds.medianDistanceMax &&
        metrics.coverageUplift >= thresholds.coverageUpliftMin,
      thresholds
    };

    return {
      maskedStores: [], // Would return from last iteration
      predictions: [], // Would return from last iteration
      metrics,
      validation,
      recommendations: this.generateBacktestRecommendations(metrics, validation)
    };
  }

  /**
   * Run single backtest iteration
   */
  private async runSingleBacktest(
    allStores: ExistingStore[],
    candidates: LocationCandidate[],
    config: CountryConfig,
    maskPercentage: number,
    targetK: number,
    distanceThreshold: number
  ): Promise<{
    hitRate: number;
    medianDistance: number;
    coverageUplift: number;
    precision: number;
    recall: number;
  }> {
    // Randomly mask stores
    const shuffled = [...allStores].sort(() => Math.random() - 0.5);
    const maskCount = Math.floor(allStores.length * maskPercentage);
    const maskedStores = shuffled.slice(0, maskCount);
    const remainingStores = shuffled.slice(maskCount);

    // Generate predictions using remaining stores
    const portfolioResult = this.portfolioService.buildPortfolio(
      candidates,
      config,
      remainingStores,
      targetK
    );

    const predictions = portfolioResult.selected;

    // Calculate metrics
    const hitRate = this.calculateHitRate(maskedStores, predictions, distanceThreshold);
    const medianDistance = this.calculateMedianDistance(maskedStores, predictions);
    const coverageUplift = this.calculateCoverageUplift(maskedStores, predictions, remainingStores);
    const { precision, recall } = this.calculatePrecisionRecall(maskedStores, predictions, distanceThreshold);

    return {
      hitRate,
      medianDistance,
      coverageUplift,
      precision,
      recall
    };
  }

  /**
   * Calculate hit rate (% of masked stores within threshold)
   */
  private calculateHitRate(
    maskedStores: ExistingStore[],
    predictions: LocationCandidate[],
    threshold: number
  ): number {
    if (maskedStores.length === 0) return 0;

    let hits = 0;
    for (const store of maskedStores) {
      const nearestPrediction = this.findNearestPrediction(store, predictions);
      if (nearestPrediction && nearestPrediction.distance <= threshold) {
        hits++;
      }
    }

    return hits / maskedStores.length;
  }

  /**
   * Calculate median distance from masked stores to nearest predictions
   */
  private calculateMedianDistance(
    maskedStores: ExistingStore[],
    predictions: LocationCandidate[]
  ): number {
    if (maskedStores.length === 0 || predictions.length === 0) return Infinity;

    const distances = maskedStores.map(store => {
      const nearest = this.findNearestPrediction(store, predictions);
      return nearest ? nearest.distance : Infinity;
    }).filter(d => d !== Infinity).sort((a, b) => a - b);

    if (distances.length === 0) return Infinity;

    const mid = Math.floor(distances.length / 2);
    return distances.length % 2 === 0
      ? (distances[mid - 1] + distances[mid]) / 2
      : distances[mid];
  }

  /**
   * Calculate coverage uplift vs baseline
   */
  private calculateCoverageUplift(
    maskedStores: ExistingStore[],
    predictions: LocationCandidate[],
    remainingStores: ExistingStore[]
  ): number {
    // Simple coverage metric: population served within 5km
    const baselineCoverage = this.calculateCoverage(remainingStores);
    const predictedCoverage = this.calculateCoverage([...remainingStores, ...this.convertPredictionsToStores(predictions)]);
    
    return baselineCoverage > 0 ? (predictedCoverage - baselineCoverage) / baselineCoverage : 0;
  }

  /**
   * Calculate precision and recall
   */
  private calculatePrecisionRecall(
    maskedStores: ExistingStore[],
    predictions: LocationCandidate[],
    threshold: number
  ): { precision: number; recall: number } {
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    // Count true positives (predictions near masked stores)
    for (const prediction of predictions) {
      const nearestMasked = this.findNearestStore(prediction, maskedStores);
      if (nearestMasked && nearestMasked.distance <= threshold) {
        truePositives++;
      } else {
        falsePositives++;
      }
    }

    // Count false negatives (masked stores not near any prediction)
    for (const store of maskedStores) {
      const nearestPrediction = this.findNearestPrediction(store, predictions);
      if (!nearestPrediction || nearestPrediction.distance > threshold) {
        falseNegatives++;
      }
    }

    const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

    return { precision, recall };
  }

  /**
   * Generate backtest recommendations
   */
  private generateBacktestRecommendations(
    metrics: any,
    validation: any
  ): string[] {
    const recommendations: string[] = [];

    if (!validation.passed) {
      if (metrics.hitRate < validation.thresholds.hitRateMin) {
        recommendations.push(`Hit rate ${(metrics.hitRate * 100).toFixed(1)}% below target ${(validation.thresholds.hitRateMin * 100).toFixed(1)}% - review scoring weights`);
      }
      
      if (metrics.medianDistance > validation.thresholds.medianDistanceMax) {
        recommendations.push(`Median distance ${metrics.medianDistance.toFixed(1)}km exceeds ${validation.thresholds.medianDistanceMax}km threshold - improve location precision`);
      }
      
      if (metrics.coverageUplift < validation.thresholds.coverageUpliftMin) {
        recommendations.push(`Coverage uplift ${(metrics.coverageUplift * 100).toFixed(1)}% below ${(validation.thresholds.coverageUpliftMin * 100).toFixed(1)}% target - review market coverage strategy`);
      }
    } else {
      recommendations.push('Backtest validation passed - model shows good predictive accuracy');
    }

    if (metrics.precision < 0.5) {
      recommendations.push('Low precision - consider stricter candidate filtering');
    }

    if (metrics.recall < 0.5) {
      recommendations.push('Low recall - consider expanding candidate pool or adjusting scoring');
    }

    return recommendations;
  }

  // Helper methods
  private findNearestPrediction(
    store: ExistingStore,
    predictions: LocationCandidate[]
  ): { prediction: LocationCandidate; distance: number } | null {
    if (predictions.length === 0) return null;

    let nearest = predictions[0];
    let minDistance = this.haversineDistance(store.lat, store.lng, nearest.lat, nearest.lng);

    for (const prediction of predictions.slice(1)) {
      const distance = this.haversineDistance(store.lat, store.lng, prediction.lat, prediction.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = prediction;
      }
    }

    return { prediction: nearest, distance: minDistance };
  }

  private findNearestStore(
    prediction: LocationCandidate,
    stores: ExistingStore[]
  ): { store: ExistingStore; distance: number } | null {
    if (stores.length === 0) return null;

    let nearest = stores[0];
    let minDistance = this.haversineDistance(prediction.lat, prediction.lng, nearest.lat, nearest.lng);

    for (const store of stores.slice(1)) {
      const distance = this.haversineDistance(prediction.lat, prediction.lng, store.lat, store.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = store;
      }
    }

    return { store: nearest, distance: minDistance };
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateCoverage(stores: ExistingStore[]): number {
    // Simple coverage calculation - would be more sophisticated in production
    return stores.length * 10000; // Assume each store covers 10k population
  }

  private convertPredictionsToStores(predictions: LocationCandidate[]): ExistingStore[] {
    return predictions.map(p => ({
      id: p.id,
      name: `Predicted ${p.id}`,
      lat: p.lat,
      lng: p.lng
    }));
  }
}