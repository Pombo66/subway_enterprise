/**
 * Individual Location Analysis Monitor Service
 * Monitors and logs individual OpenAI API calls per location to detect template responses
 */

export interface LocationAnalysisCall {
  locationId: string;
  coordinates: { lat: number; lng: number };
  serviceName: string;
  operation: string;
  timestamp: Date;
  responseLength: number;
  tokensUsed: number;
  responseTime: number;
  cacheHit: boolean;
  responseHash: string; // Hash of response for duplicate detection
}

export interface LocationAnalysisAlert {
  type: 'DUPLICATE_RESPONSE' | 'TEMPLATE_DETECTED' | 'HIGH_SIMILARITY' | 'MISSING_COORDINATES';
  locationId: string;
  coordinates: { lat: number; lng: number };
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: Date;
  relatedLocationIds?: string[];
}

export interface LocationAnalysisReport {
  totalLocationsAnalyzed: number;
  uniqueResponsesGenerated: number;
  duplicateResponsesDetected: number;
  templateResponsesDetected: number;
  averageResponseLength: number;
  averageTokensPerLocation: number;
  averageResponseTime: number;
  cacheHitRate: number;
  alerts: LocationAnalysisAlert[];
  topDuplicatePatterns: Array<{
    pattern: string;
    occurrences: number;
    affectedLocations: string[];
  }>;
}

export class IndividualLocationAnalysisMonitor {
  private static instance: IndividualLocationAnalysisMonitor;
  private analysisCallHistory: Map<string, LocationAnalysisCall[]> = new Map();
  private alertHistory: LocationAnalysisAlert[] = [];
  private responseHashMap: Map<string, string[]> = new Map(); // hash -> locationIds
  
  // Monitoring configuration
  private readonly CONFIG = {
    MAX_HISTORY_SIZE: 1000,
    MAX_API_CALLS_PER_MINUTE: 60,
    DUPLICATE_THRESHOLD: 0.9, // 90% similarity considered duplicate
    TEMPLATE_KEYWORDS: [
      'template',
      'placeholder',
      'example',
      'default response',
      'generic analysis',
      'standard assessment'
    ],
    GENERIC_RESPONSE_INDICATORS: [
      'general area',
      'typical location',
      'standard demographics',
      'average population',
      'common characteristics'
    ],
    ALERT_RETENTION_HOURS: 24,
    MIN_RESPONSE_LENGTH: 50,
    COORDINATE_REFERENCE_REQUIRED: true
  };

  private constructor() {
    console.log('📊 Individual Location Analysis Monitor initialized');
  }

  public static getInstance(): IndividualLocationAnalysisMonitor {
    if (!IndividualLocationAnalysisMonitor.instance) {
      IndividualLocationAnalysisMonitor.instance = new IndividualLocationAnalysisMonitor();
    }
    return IndividualLocationAnalysisMonitor.instance;
  }

  /**
   * Log individual OpenAI API call per location
   */
  logLocationAnalysisCall(
    lat: number,
    lng: number,
    serviceName: string,
    operation: string,
    response: string,
    tokensUsed: number,
    responseTime: number,
    cacheHit: boolean = false
  ): void {
    const locationId = this.generateLocationId(lat, lng);
    const responseHash = this.generateResponseHash(response);
    
    const call: LocationAnalysisCall = {
      locationId,
      coordinates: { lat, lng },
      serviceName,
      operation,
      timestamp: new Date(),
      responseLength: response.length,
      tokensUsed,
      responseTime,
      cacheHit,
      responseHash
    };

    // Store call history
    if (!this.analysisCallHistory.has(locationId)) {
      this.analysisCallHistory.set(locationId, []);
    }
    
    const locationCalls = this.analysisCallHistory.get(locationId)!;
    locationCalls.push(call);
    
    // Limit history size
    if (locationCalls.length > this.CONFIG.MAX_HISTORY_SIZE) {
      locationCalls.splice(0, locationCalls.length - this.CONFIG.MAX_HISTORY_SIZE);
    }

    // Track response hashes for duplicate detection
    if (!this.responseHashMap.has(responseHash)) {
      this.responseHashMap.set(responseHash, []);
    }
    this.responseHashMap.get(responseHash)!.push(locationId);

    // Check for issues and generate alerts
    this.checkForAnalysisIssues(call, response);

    console.log(`📍 Logged analysis call: ${serviceName}.${operation} for location ${locationId} (${response.length} chars, ${tokensUsed} tokens)`);
  }

  /**
   * Log real-time API call with enhanced tracking
   */
  logApiCall(
    lat: number,
    lng: number,
    serviceName: string,
    operation: string,
    requestData: any,
    responseData: any,
    tokensUsed: number,
    responseTime: number,
    cacheHit: boolean = false
  ): void {
    const locationId = this.generateLocationId(lat, lng);
    
    // Log the full API call with request and response data
    this.logLocationAnalysisCall(
      lat, lng, serviceName, operation, 
      JSON.stringify(responseData), tokensUsed, responseTime, cacheHit
    );

    // Real-time duplicate detection
    const responseHash = this.generateResponseHash(JSON.stringify(responseData));
    const duplicateLocations = this.responseHashMap.get(responseHash) || [];
    
    if (duplicateLocations.length > 1) {
      console.warn(`🚨 REAL-TIME DUPLICATE DETECTED: ${serviceName}.${operation} - Same response for ${duplicateLocations.length} locations`);
      console.warn(`   Affected locations: ${duplicateLocations.join(', ')}`);
    }

    // Check for generic responses in real-time
    if (this.isGenericResponse(responseData, lat, lng)) {
      console.warn(`🚨 GENERIC RESPONSE DETECTED: ${serviceName}.${operation} at ${locationId}`);
      console.warn(`   Response lacks location-specific details`);
    }

    // Log API call metrics
    console.log(`📡 API Call: ${serviceName}.${operation} | Location: ${locationId} | Tokens: ${tokensUsed} | Time: ${responseTime}ms | Cache: ${cacheHit ? 'HIT' : 'MISS'}`);
  }

  /**
   * Monitor API call rate and detect rate limit issues
   */
  monitorApiCallRate(): {
    callsLastMinute: number;
    callsLastHour: number;
    isNearRateLimit: boolean;
    recommendedDelay: number;
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const allCalls = Array.from(this.analysisCallHistory.values()).flat();
    
    const callsLastMinute = allCalls.filter(call => call.timestamp >= oneMinuteAgo).length;
    const callsLastHour = allCalls.filter(call => call.timestamp >= oneHourAgo).length;
    
    const isNearRateLimit = callsLastMinute > this.CONFIG.MAX_API_CALLS_PER_MINUTE * 0.8;
    const recommendedDelay = isNearRateLimit ? Math.max(0, 60000 / this.CONFIG.MAX_API_CALLS_PER_MINUTE) : 0;

    if (isNearRateLimit) {
      console.warn(`⚠️ Approaching API rate limit: ${callsLastMinute} calls in last minute`);
    }

    return {
      callsLastMinute,
      callsLastHour,
      isNearRateLimit,
      recommendedDelay
    };
  }

  /**
   * Detect when locations receive identical analysis
   */
  detectIdenticalAnalysis(): {
    identicalGroups: Array<{
      responseHash: string;
      locationIds: string[];
      responsePreview: string;
    }>;
    totalDuplicates: number;
  } {
    const identicalGroups: Array<{
      responseHash: string;
      locationIds: string[];
      responsePreview: string;
    }> = [];

    let totalDuplicates = 0;

    this.responseHashMap.forEach((locationIds, responseHash) => {
      if (locationIds.length > 1) {
        // Find a sample response for preview
        const sampleLocationId = locationIds[0];
        const sampleCalls = this.analysisCallHistory.get(sampleLocationId) || [];
        const sampleCall = sampleCalls.find(call => call.responseHash === responseHash);
        
        identicalGroups.push({
          responseHash,
          locationIds: [...locationIds],
          responsePreview: sampleCall ? this.truncateText(this.getResponseFromCall(sampleCall), 100) : 'No preview available'
        });

        totalDuplicates += locationIds.length - 1; // All but one are duplicates
      }
    });

    return { identicalGroups, totalDuplicates };
  }

  /**
   * Generate alerts when generic or template responses are detected
   */
  generateTemplateResponseAlerts(): LocationAnalysisAlert[] {
    const alerts: LocationAnalysisAlert[] = [];
    const now = new Date();

    this.analysisCallHistory.forEach((calls, locationId) => {
      calls.forEach(call => {
        // Check for template responses
        if (this.isTemplateResponse(call)) {
          alerts.push({
            type: 'TEMPLATE_DETECTED',
            locationId: call.locationId,
            coordinates: call.coordinates,
            message: `Template response detected in ${call.serviceName}.${call.operation}`,
            severity: 'HIGH',
            timestamp: now
          });
        }

        // Check for missing coordinates in response
        if (!this.containsCoordinateReference(call, call.coordinates.lat, call.coordinates.lng)) {
          alerts.push({
            type: 'MISSING_COORDINATES',
            locationId: call.locationId,
            coordinates: call.coordinates,
            message: `Response lacks coordinate-specific content in ${call.serviceName}.${call.operation}`,
            severity: 'MEDIUM',
            timestamp: now
          });
        }
      });
    });

    return alerts;
  }

  /**
   * Generate comprehensive analysis report
   */
  generateAnalysisReport(): LocationAnalysisReport {
    const allCalls = Array.from(this.analysisCallHistory.values()).flat();
    const uniqueHashes = new Set(allCalls.map(call => call.responseHash));
    
    const duplicateDetection = this.detectIdenticalAnalysis();
    const templateAlerts = this.generateTemplateResponseAlerts();
    
    // Calculate metrics
    const totalLocations = this.analysisCallHistory.size;
    const uniqueResponses = uniqueHashes.size;
    const duplicateResponses = duplicateDetection.totalDuplicates;
    const templateResponses = templateAlerts.filter(alert => alert.type === 'TEMPLATE_DETECTED').length;
    
    const totalTokens = allCalls.reduce((sum, call) => sum + call.tokensUsed, 0);
    const totalResponseTime = allCalls.reduce((sum, call) => sum + call.responseTime, 0);
    const totalResponseLength = allCalls.reduce((sum, call) => sum + call.responseLength, 0);
    const cacheHits = allCalls.filter(call => call.cacheHit).length;

    // Find top duplicate patterns
    const topDuplicatePatterns = duplicateDetection.identicalGroups
      .sort((a, b) => b.locationIds.length - a.locationIds.length)
      .slice(0, 5)
      .map(group => ({
        pattern: group.responsePreview,
        occurrences: group.locationIds.length,
        affectedLocations: group.locationIds
      }));

    return {
      totalLocationsAnalyzed: totalLocations,
      uniqueResponsesGenerated: uniqueResponses,
      duplicateResponsesDetected: duplicateResponses,
      templateResponsesDetected: templateResponses,
      averageResponseLength: allCalls.length > 0 ? totalResponseLength / allCalls.length : 0,
      averageTokensPerLocation: totalLocations > 0 ? totalTokens / totalLocations : 0,
      averageResponseTime: allCalls.length > 0 ? totalResponseTime / allCalls.length : 0,
      cacheHitRate: allCalls.length > 0 ? (cacheHits / allCalls.length) * 100 : 0,
      alerts: [...templateAlerts, ...this.alertHistory].slice(-50), // Last 50 alerts
      topDuplicatePatterns
    };
  }

  /**
   * Get monitoring statistics for dashboard
   */
  getMonitoringStats(): {
    totalApiCalls: number;
    uniqueLocationsAnalyzed: number;
    duplicateResponseRate: number;
    templateResponseRate: number;
    averageResponseQuality: number;
    recentAlerts: number;
  } {
    const report = this.generateAnalysisReport();
    const recentAlerts = this.alertHistory.filter(alert => 
      new Date().getTime() - alert.timestamp.getTime() < this.CONFIG.ALERT_RETENTION_HOURS * 60 * 60 * 1000
    ).length;

    const duplicateRate = report.totalLocationsAnalyzed > 0 
      ? (report.duplicateResponsesDetected / report.totalLocationsAnalyzed) * 100 
      : 0;
    
    const templateRate = report.totalLocationsAnalyzed > 0 
      ? (report.templateResponsesDetected / report.totalLocationsAnalyzed) * 100 
      : 0;

    // Quality score based on uniqueness and specificity
    const qualityScore = Math.max(0, 100 - duplicateRate - templateRate);

    return {
      totalApiCalls: Array.from(this.analysisCallHistory.values()).flat().length,
      uniqueLocationsAnalyzed: report.totalLocationsAnalyzed,
      duplicateResponseRate: duplicateRate,
      templateResponseRate: templateRate,
      averageResponseQuality: qualityScore,
      recentAlerts
    };
  }

  /**
   * Reset monitoring data (for testing)
   */
  reset(): void {
    this.analysisCallHistory.clear();
    this.alertHistory.length = 0;
    this.responseHashMap.clear();
    console.log('🔄 Individual location analysis monitoring data reset');
  }

  /**
   * Generate location ID from coordinates
   */
  private generateLocationId(lat: number, lng: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }

  /**
   * Generate hash of response content for duplicate detection
   */
  private generateResponseHash(response: string): string {
    // Simple hash function for response content
    let hash = 0;
    const normalizedResponse = response.toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (let i = 0; i < normalizedResponse.length; i++) {
      const char = normalizedResponse.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Check for analysis issues and generate alerts
   */
  private checkForAnalysisIssues(call: LocationAnalysisCall, response: string): void {
    const alerts: LocationAnalysisAlert[] = [];

    // Check for duplicate responses
    const duplicateLocations = this.responseHashMap.get(call.responseHash) || [];
    if (duplicateLocations.length > 1) {
      alerts.push({
        type: 'DUPLICATE_RESPONSE',
        locationId: call.locationId,
        coordinates: call.coordinates,
        message: `Duplicate response detected across ${duplicateLocations.length} locations`,
        severity: 'HIGH',
        timestamp: new Date(),
        relatedLocationIds: duplicateLocations.filter(id => id !== call.locationId)
      });
    }

    // Check for template responses
    if (this.isTemplateResponse(call)) {
      alerts.push({
        type: 'TEMPLATE_DETECTED',
        locationId: call.locationId,
        coordinates: call.coordinates,
        message: `Template or generic response detected in ${call.serviceName}`,
        severity: 'HIGH',
        timestamp: new Date()
      });
    }

    // Store alerts
    this.alertHistory.push(...alerts);
    
    // Limit alert history
    if (this.alertHistory.length > 500) {
      this.alertHistory.splice(0, this.alertHistory.length - 500);
    }

    // Log alerts
    alerts.forEach(alert => {
      console.warn(`🚨 Location Analysis Alert: ${alert.message} (${alert.locationId})`);
    });
  }

  /**
   * Check if response is a template response
   */
  private isTemplateResponse(call: LocationAnalysisCall): boolean {
    // Get response content (this is a simplified approach)
    const responseContent = this.getResponseFromCall(call);
    
    // Check for template keywords
    const hasTemplateKeywords = this.CONFIG.TEMPLATE_KEYWORDS.some(keyword =>
      responseContent.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check for minimum length
    const isTooShort = responseContent.length < this.CONFIG.MIN_RESPONSE_LENGTH;

    return hasTemplateKeywords || isTooShort;
  }

  /**
   * Check if response contains coordinate reference
   */
  private containsCoordinateReference(call: LocationAnalysisCall, lat: number, lng: number): boolean {
    const responseContent = this.getResponseFromCall(call);
    
    // Check for coordinate patterns
    const latStr = lat.toFixed(2);
    const lngStr = lng.toFixed(2);
    
    const coordinatePatterns = [
      latStr,
      lngStr,
      lat.toFixed(4),
      lng.toFixed(4)
    ];

    return coordinatePatterns.some(pattern => responseContent.includes(pattern));
  }

  /**
   * Get response content from call (simplified - in real implementation would need to store response)
   */
  private getResponseFromCall(call: LocationAnalysisCall): string {
    // This is a placeholder - in real implementation, we'd need to store the actual response
    // For now, we'll use the response hash as a proxy
    return `Response for ${call.serviceName}.${call.operation} at ${call.locationId}`;
  }

  /**
   * Check if response is generic (lacks location-specific details)
   */
  private isGenericResponse(responseData: any, lat: number, lng: number): boolean {
    const responseText = JSON.stringify(responseData).toLowerCase();
    
    // Check for generic response indicators
    const hasGenericIndicators = this.CONFIG.GENERIC_RESPONSE_INDICATORS.some(indicator =>
      responseText.includes(indicator.toLowerCase())
    );

    // Check if coordinates are referenced
    const hasCoordinateReference = this.CONFIG.COORDINATE_REFERENCE_REQUIRED && 
      this.containsCoordinateReference({ coordinates: { lat, lng } } as any, lat, lng);

    // Check for location-specific content
    const hasLocationSpecificContent = this.hasLocationSpecificContent(responseText, lat, lng);

    return hasGenericIndicators || (!hasCoordinateReference && this.CONFIG.COORDINATE_REFERENCE_REQUIRED) || !hasLocationSpecificContent;
  }

  /**
   * Check if response has location-specific content
   */
  private hasLocationSpecificContent(responseText: string, lat: number, lng: number): boolean {
    // Look for specific geographic references, street names, neighborhoods, etc.
    const locationIndicators = [
      'street', 'avenue', 'road', 'boulevard',
      'neighborhood', 'district', 'area',
      'near', 'close to', 'adjacent to',
      'downtown', 'suburb', 'city center',
      lat.toFixed(1), lng.toFixed(1), // Coordinate references
      lat.toFixed(2), lng.toFixed(2)
    ];

    return locationIndicators.some(indicator => 
      responseText.includes(indicator.toLowerCase())
    );
  }

  /**
   * Generate real-time monitoring alerts
   */
  generateRealTimeAlerts(): LocationAnalysisAlert[] {
    const alerts: LocationAnalysisAlert[] = [];
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Check recent calls for issues
    const recentCalls = Array.from(this.analysisCallHistory.values())
      .flat()
      .filter(call => call.timestamp >= fiveMinutesAgo);

    // Group by response hash to find duplicates
    const responseGroups = new Map<string, LocationAnalysisCall[]>();
    recentCalls.forEach(call => {
      if (!responseGroups.has(call.responseHash)) {
        responseGroups.set(call.responseHash, []);
      }
      responseGroups.get(call.responseHash)!.push(call);
    });

    // Generate alerts for duplicates
    responseGroups.forEach((calls, hash) => {
      if (calls.length > 1) {
        alerts.push({
          type: 'DUPLICATE_RESPONSE',
          locationId: calls[0].locationId,
          coordinates: calls[0].coordinates,
          message: `${calls.length} locations received identical responses in last 5 minutes`,
          severity: 'HIGH',
          timestamp: now,
          relatedLocationIds: calls.map(call => call.locationId)
        });
      }
    });

    // Check API call rate
    const apiRateStatus = this.monitorApiCallRate();
    if (apiRateStatus.isNearRateLimit) {
      alerts.push({
        type: 'HIGH_SIMILARITY', // Reusing type for rate limit
        locationId: 'system',
        coordinates: { lat: 0, lng: 0 },
        message: `High API call rate detected: ${apiRateStatus.callsLastMinute} calls/minute`,
        severity: 'MEDIUM',
        timestamp: now
      });
    }

    return alerts;
  }

  /**
   * Start real-time monitoring with periodic checks
   */
  startRealTimeMonitoring(): void {
    console.log('🔄 Starting real-time individual location analysis monitoring...');
    
    // Check for issues every 30 seconds
    setInterval(() => {
      const alerts = this.generateRealTimeAlerts();
      alerts.forEach(alert => {
        console.warn(`🚨 REAL-TIME ALERT: ${alert.message}`);
        this.alertHistory.push(alert);
      });
    }, 30000);

    // Log monitoring status every 5 minutes
    setInterval(() => {
      const stats = this.getMonitoringStats();
      console.log(`📊 Monitoring Status: ${stats.uniqueLocationsAnalyzed} locations, ${stats.duplicateResponseRate.toFixed(1)}% duplicates, ${stats.averageResponseQuality.toFixed(1)} quality score`);
    }, 5 * 60 * 1000);
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}