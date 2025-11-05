import { EconomicIndicators } from './demographic-data.service';
import { OSMFeature } from './osm-query.service';

export interface DataQualityMetrics {
  demographic: {
    completeness: number;
    freshness: number;
    accuracy: number;
    coverage: number;
    lastUpdated: Date;
    totalRecords: number;
    missingDataCount: number;
    estimatedDataCount: number;
  };
  osm: {
    featureAvailability: number;
    dataFreshness: number;
    querySuccessRate: number;
    averageFeatureCount: number;
    lastSuccessfulQuery: Date;
    failedQueries: number;
    totalQueries: number;
  };
  overall: {
    dataHealthScore: number;
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  };
}

export interface DataQualityAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'completeness' | 'freshness' | 'availability' | 'accuracy';
  message: string;
  timestamp: Date;
  source: 'demographic' | 'osm' | 'system';
  details?: Record<string, any>;
}

export class DataQualityMonitor {
  private demographicRecords = 0;
  private demographicMissingData = 0;
  private demographicEstimatedData = 0;
  private demographicLastUpdate = new Date();
  
  private osmTotalQueries = 0;
  private osmFailedQueries = 0;
  private osmLastSuccess = new Date();
  private osmFeatureCounts: number[] = [];
  
  private alerts: DataQualityAlert[] = [];
  private readonly MAX_ALERTS = 100;
  
  constructor() {
    console.log('🔍 DataQualityMonitor initialized');
  }

  /**
   * Validate demographic data completeness and freshness
   * Implements requirement 15.2 for demographic data validation
   */
  validateDemographicData(indicators: EconomicIndicators): void {
    this.demographicRecords++;
    this.demographicLastUpdate = new Date();
    
    // Check data completeness
    const missingFields = this.checkDemographicCompleteness(indicators);
    if (missingFields.length > 0) {
      this.demographicMissingData++;
      
      if (missingFields.length > 2) {
        this.addAlert({
          severity: 'medium',
          type: 'completeness',
          message: `Demographic data missing ${missingFields.length} fields: ${missingFields.join(', ')}`,
          timestamp: new Date(),
          source: 'demographic',
          details: { missingFields, dataSource: indicators.dataSource }
        });
      }
    }
    
    // Check if data is estimated
    if (indicators.dataSource === 'estimated') {
      this.demographicEstimatedData++;
    }
    
    // Check data freshness
    if (indicators.dataCompleteness < 0.5) {
      this.addAlert({
        severity: 'high',
        type: 'completeness',
        message: `Low demographic data completeness: ${(indicators.dataCompleteness * 100).toFixed(0)}%`,
        timestamp: new Date(),
        source: 'demographic',
        details: { completeness: indicators.dataCompleteness }
      });
    }
  }

  /**
   * Monitor OSM data quality and feature availability
   * Implements requirement 15.2 for OSM data monitoring
   */
  validateOSMData(features: OSMFeature[], querySuccess: boolean): void {
    this.osmTotalQueries++;
    
    if (querySuccess) {
      this.osmLastSuccess = new Date();
      this.osmFeatureCounts.push(features.length);
      
      // Keep only last 100 feature counts
      if (this.osmFeatureCounts.length > 100) {
        this.osmFeatureCounts = this.osmFeatureCounts.slice(-100);
      }
      
      // Check feature availability
      if (features.length === 0) {
        this.addAlert({
          severity: 'low',
          type: 'availability',
          message: 'OSM query returned no features - area may lack POI data',
          timestamp: new Date(),
          source: 'osm'
        });
      }
      
      // Check for data quality issues
      const qualityIssues = this.checkOSMQuality(features);
      if (qualityIssues.length > 0) {
        this.addAlert({
          severity: 'low',
          type: 'accuracy',
          message: `OSM data quality issues: ${qualityIssues.join(', ')}`,
          timestamp: new Date(),
          source: 'osm',
          details: { issues: qualityIssues, featureCount: features.length }
        });
      }
      
    } else {
      this.osmFailedQueries++;
      
      // Alert on high failure rate
      const failureRate = this.osmFailedQueries / this.osmTotalQueries;
      if (failureRate > 0.2 && this.osmTotalQueries > 10) {
        this.addAlert({
          severity: 'high',
          type: 'availability',
          message: `High OSM query failure rate: ${(failureRate * 100).toFixed(0)}%`,
          timestamp: new Date(),
          source: 'osm',
          details: { failureRate, totalQueries: this.osmTotalQueries }
        });
      }
    }
  }

  /**
   * Check for data freshness
   * Implements requirement 15.2 for freshness monitoring
   */
  checkDataFreshness(): void {
    const now = new Date();
    
    // Check demographic data freshness (should be updated within 7 days)
    const demographicAge = now.getTime() - this.demographicLastUpdate.getTime();
    const demographicDaysOld = demographicAge / (1000 * 60 * 60 * 24);
    
    if (demographicDaysOld > 7) {
      this.addAlert({
        severity: 'medium',
        type: 'freshness',
        message: `Demographic data is ${demographicDaysOld.toFixed(0)} days old`,
        timestamp: new Date(),
        source: 'demographic',
        details: { daysOld: demographicDaysOld }
      });
    }
    
    // Check OSM data freshness (should have successful query within 1 hour)
    const osmAge = now.getTime() - this.osmLastSuccess.getTime();
    const osmHoursOld = osmAge / (1000 * 60 * 60);
    
    if (osmHoursOld > 1 && this.osmTotalQueries > 0) {
      this.addAlert({
        severity: 'medium',
        type: 'freshness',
        message: `No successful OSM queries in ${osmHoursOld.toFixed(1)} hours`,
        timestamp: new Date(),
        source: 'osm',
        details: { hoursOld: osmHoursOld }
      });
    }
  }

  /**
   * Get comprehensive data quality metrics
   * Implements requirement 15.2 for quality metrics reporting
   */
  getDataQualityMetrics(): DataQualityMetrics {
    // Calculate demographic metrics
    const demographicCompleteness = this.demographicRecords > 0 
      ? ((this.demographicRecords - this.demographicMissingData) / this.demographicRecords) * 100
      : 0;
    
    const demographicAccuracy = this.demographicRecords > 0
      ? ((this.demographicRecords - this.demographicEstimatedData) / this.demographicRecords) * 100
      : 0;
    
    // Calculate OSM metrics
    const osmSuccessRate = this.osmTotalQueries > 0
      ? ((this.osmTotalQueries - this.osmFailedQueries) / this.osmTotalQueries) * 100
      : 0;
    
    const avgFeatureCount = this.osmFeatureCounts.length > 0
      ? this.osmFeatureCounts.reduce((sum, count) => sum + count, 0) / this.osmFeatureCounts.length
      : 0;
    
    // Calculate overall health score
    const dataHealthScore = this.calculateOverallHealthScore(
      demographicCompleteness,
      demographicAccuracy,
      osmSuccessRate
    );
    
    // Generate issues and recommendations
    const { criticalIssues, warnings, recommendations } = this.analyzeDataHealth();
    
    return {
      demographic: {
        completeness: Math.round(demographicCompleteness * 100) / 100,
        freshness: this.calculateFreshness(this.demographicLastUpdate),
        accuracy: Math.round(demographicAccuracy * 100) / 100,
        coverage: Math.min(100, (this.demographicRecords / 1000) * 100), // Assume 1000 is good coverage
        lastUpdated: this.demographicLastUpdate,
        totalRecords: this.demographicRecords,
        missingDataCount: this.demographicMissingData,
        estimatedDataCount: this.demographicEstimatedData
      },
      osm: {
        featureAvailability: Math.round(avgFeatureCount * 10) / 10, // Average features per query
        dataFreshness: this.calculateFreshness(this.osmLastSuccess),
        querySuccessRate: Math.round(osmSuccessRate * 100) / 100,
        averageFeatureCount: Math.round(avgFeatureCount * 10) / 10,
        lastSuccessfulQuery: this.osmLastSuccess,
        failedQueries: this.osmFailedQueries,
        totalQueries: this.osmTotalQueries
      },
      overall: {
        dataHealthScore: Math.round(dataHealthScore * 100) / 100,
        criticalIssues,
        warnings,
        recommendations
      }
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 20): DataQualityAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): DataQualityAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
    
    const removedCount = initialCount - this.alerts.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleared ${removedCount} old data quality alerts`);
    }
  }

  /**
   * Reset all monitoring data
   */
  resetMonitoring(): void {
    this.demographicRecords = 0;
    this.demographicMissingData = 0;
    this.demographicEstimatedData = 0;
    this.demographicLastUpdate = new Date();
    
    this.osmTotalQueries = 0;
    this.osmFailedQueries = 0;
    this.osmLastSuccess = new Date();
    this.osmFeatureCounts = [];
    
    this.alerts = [];
    
    console.log('🔍 Data quality monitoring reset');
  }

  /**
   * Check demographic data completeness
   */
  private checkDemographicCompleteness(indicators: EconomicIndicators): string[] {
    const missingFields: string[] = [];
    
    if (!indicators.population || indicators.population === 0) {
      missingFields.push('population');
    }
    
    if (indicators.populationGrowthRate === undefined || indicators.populationGrowthRate === null) {
      missingFields.push('growthRate');
    }
    
    if (!indicators.medianIncome || indicators.medianIncome === 0) {
      missingFields.push('medianIncome');
    }
    
    if (!indicators.incomeIndex || indicators.incomeIndex === 0) {
      missingFields.push('incomeIndex');
    }
    
    return missingFields;
  }

  /**
   * Check OSM data quality
   */
  private checkOSMQuality(features: OSMFeature[]): string[] {
    const issues: string[] = [];
    
    // Check for features without names
    const unnamedFeatures = features.filter(f => !f.name || f.name.trim() === '');
    if (unnamedFeatures.length > features.length * 0.5) {
      issues.push('high_unnamed_features');
    }
    
    // Check for features without proper tags
    const poorlyTaggedFeatures = features.filter(f => 
      !f.amenity && !f.shop && !f.highway && !f.railway && !f.landuse
    );
    if (poorlyTaggedFeatures.length > features.length * 0.3) {
      issues.push('poor_tagging');
    }
    
    return issues;
  }

  /**
   * Calculate data freshness score (0-100)
   */
  private calculateFreshness(lastUpdate: Date): number {
    const now = new Date();
    const ageMs = now.getTime() - lastUpdate.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    
    // Freshness decreases over time
    if (ageHours < 1) return 100;
    if (ageHours < 24) return Math.max(0, 100 - (ageHours * 2));
    if (ageHours < 168) return Math.max(0, 50 - ((ageHours - 24) * 0.3));
    return 0;
  }

  /**
   * Calculate overall data health score
   */
  private calculateOverallHealthScore(
    demographicCompleteness: number,
    demographicAccuracy: number,
    osmSuccessRate: number
  ): number {
    // Weighted average: 40% demographic completeness, 30% accuracy, 30% OSM success
    return (demographicCompleteness * 0.4) + (demographicAccuracy * 0.3) + (osmSuccessRate * 0.3);
  }

  /**
   * Analyze data health and generate issues/recommendations
   */
  private analyzeDataHealth(): {
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Check for critical issues
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      criticalIssues.push(`${criticalAlerts.length} critical data quality issues detected`);
    }
    
    const osmFailureRate = this.osmTotalQueries > 0 ? this.osmFailedQueries / this.osmTotalQueries : 0;
    if (osmFailureRate > 0.5) {
      criticalIssues.push('OSM API experiencing high failure rate');
    }
    
    // Check for warnings
    const demographicEstimatedRate = this.demographicRecords > 0 
      ? this.demographicEstimatedData / this.demographicRecords 
      : 0;
    
    if (demographicEstimatedRate > 0.7) {
      warnings.push('High reliance on estimated demographic data');
    }
    
    if (this.osmFeatureCounts.length > 0) {
      const avgFeatures = this.osmFeatureCounts.reduce((sum, count) => sum + count, 0) / this.osmFeatureCounts.length;
      if (avgFeatures < 2) {
        warnings.push('Low OSM feature density may affect anchor strategy accuracy');
      }
    }
    
    // Generate recommendations
    if (demographicEstimatedRate > 0.5) {
      recommendations.push('Consider integrating additional demographic data sources');
    }
    
    if (osmFailureRate > 0.2) {
      recommendations.push('Implement OSM API fallback or alternative POI data source');
    }
    
    if (this.demographicMissingData > this.demographicRecords * 0.3) {
      recommendations.push('Improve demographic data collection and validation processes');
    }
    
    return { criticalIssues, warnings, recommendations };
  }

  /**
   * Add alert with deduplication
   */
  private addAlert(alert: DataQualityAlert): void {
    // Check for duplicate alerts (same type and message within last hour)
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
    const isDuplicate = this.alerts.some(existing => 
      existing.type === alert.type &&
      existing.message === alert.message &&
      existing.timestamp > oneHourAgo
    );
    
    if (!isDuplicate) {
      this.alerts.push(alert);
      
      // Keep only recent alerts
      if (this.alerts.length > this.MAX_ALERTS) {
        this.alerts = this.alerts.slice(-this.MAX_ALERTS);
      }
      
      // Log high severity alerts
      if (alert.severity === 'high' || alert.severity === 'critical') {
        console.warn(`🚨 Data Quality Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
      }
    }
  }
}