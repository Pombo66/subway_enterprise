/**
 * Individual Location Analysis Validator Service
 * Validates that each location receives unique OpenAI analysis and prevents template responses
 */

export interface LocationAnalysisValidationResult {
  passed: boolean;
  uniqueAnalysisCount: number;
  duplicateAnalysisCount: number;
  templateResponseCount: number;
  coordinateValidationPassed: boolean;
  issues: string[];
  recommendations: string[];
}

export interface LocationAnalysisEntry {
  locationId: string;
  coordinates: { lat: number; lng: number };
  rationaleText: string;
  contextAnalysis?: any;
  placementScore?: any;
  timestamp: Date;
}

export class IndividualLocationAnalysisValidator {
  private static instance: IndividualLocationAnalysisValidator;
  private analysisHistory: Map<string, LocationAnalysisEntry[]> = new Map();
  
  // Validation thresholds
  private readonly VALIDATION_CONFIG = {
    MIN_RATIONALE_LENGTH: 50,
    MAX_SIMILARITY_THRESHOLD: 0.8, // 80% similarity considered duplicate
    TEMPLATE_KEYWORDS: [
      'template',
      'placeholder',
      'example',
      'default',
      'generic',
      'standard analysis',
      'basic assessment'
    ],
    COORDINATE_PRECISION: 4, // Decimal places for coordinate validation
    MAX_DUPLICATE_PERCENTAGE: 10 // Max 10% duplicates allowed
  };

  private constructor() {
    console.log('🔍 Individual Location Analysis Validator initialized');
  }

  public static getInstance(): IndividualLocationAnalysisValidator {
    if (!IndividualLocationAnalysisValidator.instance) {
      IndividualLocationAnalysisValidator.instance = new IndividualLocationAnalysisValidator();
    }
    return IndividualLocationAnalysisValidator.instance;
  }

  /**
   * Validate that each location receives unique OpenAI analysis
   */
  validateLocationSpecificAnalysis(
    suggestions: Array<{
      lat: number;
      lng: number;
      rationaleText: string;
      locationContext?: any;
      placementScore?: any;
      settlementName?: string;
    }>,
    sessionId: string = 'default'
  ): LocationAnalysisValidationResult {
    console.log(`🔍 Validating location-specific analysis for ${suggestions.length} suggestions`);

    const issues: string[] = [];
    const recommendations: string[] = [];
    let uniqueAnalysisCount = 0;
    let duplicateAnalysisCount = 0;
    let templateResponseCount = 0;

    // Store analysis entries for this session
    const analysisEntries: LocationAnalysisEntry[] = suggestions.map(suggestion => ({
      locationId: this.generateLocationId(suggestion.lat, suggestion.lng),
      coordinates: { lat: suggestion.lat, lng: suggestion.lng },
      rationaleText: suggestion.rationaleText,
      contextAnalysis: suggestion.locationContext,
      placementScore: suggestion.placementScore,
      timestamp: new Date()
    }));

    this.analysisHistory.set(sessionId, analysisEntries);

    // 1. Validate coordinate specificity
    const coordinateValidation = this.validateCoordinateSpecificity(analysisEntries);
    if (!coordinateValidation.passed) {
      issues.push(...coordinateValidation.issues);
    }

    // 2. Validate rationale uniqueness
    const uniquenessValidation = this.validateRationaleUniqueness(analysisEntries);
    uniqueAnalysisCount = uniquenessValidation.uniqueCount;
    duplicateAnalysisCount = uniquenessValidation.duplicateCount;
    
    if (uniquenessValidation.duplicateCount > 0) {
      issues.push(`${uniquenessValidation.duplicateCount} duplicate rationales detected`);
      recommendations.push('Enhance rationale diversification to ensure unique analysis per location');
    }

    // 3. Validate against template responses
    const templateValidation = this.validateAgainstTemplateResponses(analysisEntries);
    templateResponseCount = templateValidation.templateCount;
    
    if (templateValidation.templateCount > 0) {
      issues.push(`${templateValidation.templateCount} template responses detected`);
      recommendations.push('Improve AI prompts to generate location-specific content');
    }

    // 4. Validate location-specific content
    const contentValidation = this.validateLocationSpecificContent(analysisEntries);
    if (!contentValidation.passed) {
      issues.push(...contentValidation.issues);
      recommendations.push(...contentValidation.recommendations);
    }

    // 5. Validate coordinate inclusion in rationales
    const coordinateInclusionValidation = this.validateCoordinateInclusion(analysisEntries);
    if (!coordinateInclusionValidation.passed) {
      issues.push(...coordinateInclusionValidation.issues);
      recommendations.push('Ensure rationales include specific coordinates or location identifiers');
    }

    const passed = issues.length === 0;
    const duplicatePercentage = (duplicateAnalysisCount / suggestions.length) * 100;

    if (duplicatePercentage > this.VALIDATION_CONFIG.MAX_DUPLICATE_PERCENTAGE) {
      issues.push(`Duplicate percentage (${duplicatePercentage.toFixed(1)}%) exceeds threshold (${this.VALIDATION_CONFIG.MAX_DUPLICATE_PERCENTAGE}%)`);
    }

    console.log(`✅ Location analysis validation completed: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Unique: ${uniqueAnalysisCount}, Duplicates: ${duplicateAnalysisCount}, Templates: ${templateResponseCount}`);

    return {
      passed,
      uniqueAnalysisCount,
      duplicateAnalysisCount,
      templateResponseCount,
      coordinateValidationPassed: coordinateValidation.passed,
      issues,
      recommendations
    };
  }

  /**
   * Validate that no two locations share identical AI responses
   */
  validateNoIdenticalResponses(
    suggestions: Array<{ rationaleText: string; locationContext?: any }>,
    threshold: number = 0.95
  ): { passed: boolean; identicalPairs: Array<{ index1: number; index2: number; similarity: number }> } {
    const identicalPairs: Array<{ index1: number; index2: number; similarity: number }> = [];

    for (let i = 0; i < suggestions.length; i++) {
      for (let j = i + 1; j < suggestions.length; j++) {
        const similarity = this.calculateTextSimilarity(
          suggestions[i].rationaleText,
          suggestions[j].rationaleText
        );

        if (similarity >= threshold) {
          identicalPairs.push({ index1: i, index2: j, similarity });
        }
      }
    }

    return {
      passed: identicalPairs.length === 0,
      identicalPairs
    };
  }

  /**
   * Validate that rationales contain location-specific coordinates and details
   */
  validateLocationSpecificDetails(
    suggestions: Array<{
      lat: number;
      lng: number;
      rationaleText: string;
      settlementName?: string;
    }>
  ): { passed: boolean; locationsWithoutSpecifics: number[]; issues: string[] } {
    const locationsWithoutSpecifics: number[] = [];
    const issues: string[] = [];

    suggestions.forEach((suggestion, index) => {
      const hasCoordinates = this.containsCoordinateReference(suggestion.rationaleText, suggestion.lat, suggestion.lng);
      const hasLocationName = suggestion.settlementName && 
        suggestion.rationaleText.toLowerCase().includes(suggestion.settlementName.toLowerCase());
      const hasSpecificDetails = this.containsSpecificLocationDetails(suggestion.rationaleText);

      if (!hasCoordinates && !hasLocationName && !hasSpecificDetails) {
        locationsWithoutSpecifics.push(index);
        issues.push(`Location ${index + 1} lacks specific coordinate or location references`);
      }
    });

    return {
      passed: locationsWithoutSpecifics.length === 0,
      locationsWithoutSpecifics,
      issues
    };
  }

  /**
   * Get validation statistics for monitoring
   */
  getValidationStatistics(sessionId: string = 'default'): {
    totalAnalyzed: number;
    uniqueAnalysisRate: number;
    templateResponseRate: number;
    averageRationaleLength: number;
    coordinateInclusionRate: number;
  } {
    const entries = this.analysisHistory.get(sessionId) || [];
    
    if (entries.length === 0) {
      return {
        totalAnalyzed: 0,
        uniqueAnalysisRate: 0,
        templateResponseRate: 0,
        averageRationaleLength: 0,
        coordinateInclusionRate: 0
      };
    }

    const uniquenessValidation = this.validateRationaleUniqueness(entries);
    const templateValidation = this.validateAgainstTemplateResponses(entries);
    const coordinateValidation = this.validateCoordinateInclusion(entries);

    const totalLength = entries.reduce((sum, entry) => sum + entry.rationaleText.length, 0);
    const averageRationaleLength = totalLength / entries.length;

    return {
      totalAnalyzed: entries.length,
      uniqueAnalysisRate: (uniquenessValidation.uniqueCount / entries.length) * 100,
      templateResponseRate: (templateValidation.templateCount / entries.length) * 100,
      averageRationaleLength,
      coordinateInclusionRate: (coordinateValidation.coordinateInclusionCount / entries.length) * 100
    };
  }

  /**
   * Reset validation history (for testing)
   */
  reset(): void {
    this.analysisHistory.clear();
    console.log('🔄 Location analysis validation history reset');
  }

  /**
   * Generate unique location ID from coordinates
   */
  private generateLocationId(lat: number, lng: number): string {
    return `${lat.toFixed(this.VALIDATION_CONFIG.COORDINATE_PRECISION)}_${lng.toFixed(this.VALIDATION_CONFIG.COORDINATE_PRECISION)}`;
  }

  /**
   * Validate coordinate specificity
   */
  private validateCoordinateSpecificity(entries: LocationAnalysisEntry[]): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    const coordinateSet = new Set<string>();
    let duplicateCoordinates = 0;

    entries.forEach(entry => {
      const coordKey = this.generateLocationId(entry.coordinates.lat, entry.coordinates.lng);
      if (coordinateSet.has(coordKey)) {
        duplicateCoordinates++;
      } else {
        coordinateSet.add(coordKey);
      }
    });

    if (duplicateCoordinates > 0) {
      issues.push(`${duplicateCoordinates} locations have duplicate coordinates`);
    }

    return {
      passed: duplicateCoordinates === 0,
      issues
    };
  }

  /**
   * Validate rationale uniqueness
   */
  private validateRationaleUniqueness(entries: LocationAnalysisEntry[]): { uniqueCount: number; duplicateCount: number } {
    const rationaleMap = new Map<string, number>();
    let duplicateCount = 0;

    entries.forEach(entry => {
      const normalizedRationale = this.normalizeText(entry.rationaleText);
      const existingCount = rationaleMap.get(normalizedRationale) || 0;
      
      if (existingCount > 0) {
        duplicateCount++;
      }
      
      rationaleMap.set(normalizedRationale, existingCount + 1);
    });

    const uniqueCount = entries.length - duplicateCount;

    return { uniqueCount, duplicateCount };
  }

  /**
   * Validate against template responses
   */
  private validateAgainstTemplateResponses(entries: LocationAnalysisEntry[]): { templateCount: number } {
    let templateCount = 0;

    entries.forEach(entry => {
      const isTemplate = this.VALIDATION_CONFIG.TEMPLATE_KEYWORDS.some(keyword =>
        entry.rationaleText.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isTemplate || entry.rationaleText.length < this.VALIDATION_CONFIG.MIN_RATIONALE_LENGTH) {
        templateCount++;
      }
    });

    return { templateCount };
  }

  /**
   * Validate location-specific content
   */
  private validateLocationSpecificContent(entries: LocationAnalysisEntry[]): { passed: boolean; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let locationsWithoutSpecifics = 0;

    entries.forEach((entry, index) => {
      const hasSpecificContent = this.containsSpecificLocationDetails(entry.rationaleText);
      
      if (!hasSpecificContent) {
        locationsWithoutSpecifics++;
      }
    });

    if (locationsWithoutSpecifics > entries.length * 0.5) {
      issues.push(`${locationsWithoutSpecifics} locations lack specific content (>${(entries.length * 0.5).toFixed(0)} threshold)`);
      recommendations.push('Enhance AI prompts to include location-specific factors and context');
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Validate coordinate inclusion in rationales
   */
  private validateCoordinateInclusion(entries: LocationAnalysisEntry[]): { passed: boolean; issues: string[]; coordinateInclusionCount: number } {
    const issues: string[] = [];
    let coordinateInclusionCount = 0;

    entries.forEach((entry, index) => {
      const hasCoordinateReference = this.containsCoordinateReference(
        entry.rationaleText,
        entry.coordinates.lat,
        entry.coordinates.lng
      );

      if (hasCoordinateReference) {
        coordinateInclusionCount++;
      }
    });

    const inclusionRate = (coordinateInclusionCount / entries.length) * 100;
    
    if (inclusionRate < 50) {
      issues.push(`Low coordinate inclusion rate: ${inclusionRate.toFixed(1)}% (expected >50%)`);
    }

    return {
      passed: inclusionRate >= 50,
      issues,
      coordinateInclusionCount
    };
  }

  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);

    if (normalized1 === normalized2) return 1.0;

    // Simple Jaccard similarity for word sets
    const words1 = new Set(normalized1.split(/\s+/));
    const words2 = new Set(normalized2.split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if rationale contains coordinate reference
   */
  private containsCoordinateReference(rationale: string, lat: number, lng: number): boolean {
    const latStr = lat.toFixed(2);
    const lngStr = lng.toFixed(2);
    
    // Check for coordinate patterns
    const coordinatePatterns = [
      `${latStr}`,
      `${lngStr}`,
      `${lat.toFixed(4)}`,
      `${lng.toFixed(4)}`,
      `${lat.toFixed(1)}`,
      `${lng.toFixed(1)}`
    ];

    return coordinatePatterns.some(pattern => rationale.includes(pattern));
  }

  /**
   * Check if rationale contains specific location details
   */
  private containsSpecificLocationDetails(rationale: string): boolean {
    const specificIndicators = [
      /\d+k?\s*(population|residents|people)/i,
      /\d+\.?\d*\s*(km|kilometers|miles)\s*(away|distance|from)/i,
      /\d+\s*(anchor|poi|businesses|stores)/i,
      /(north|south|east|west|central|downtown|suburb)/i,
      /(highway|road|street|avenue|boulevard)/i,
      /(shopping|commercial|residential|industrial)\s*(area|district|zone)/i
    ];

    return specificIndicators.some(pattern => pattern.test(rationale));
  }
}