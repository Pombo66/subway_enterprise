import { PrismaClient } from '@prisma/client';
import { GenerationParams, GenerationResult } from './expansion-generation.service';

export interface ScenarioRecord {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Generation parameters
  parameters: {
    region: any;
    weights: Record<string, number>;
    mixRatio: Record<string, number>;
    popMin: number;
    seed: number;
    targetCount: number;
    enableDiagnostics: boolean;
    minDistanceM: number;
    aggression: number;
  };
  
  // Data versions for reproducibility
  dataVersions: {
    osm: string;
    demographic: string;
    stores: string;
    osmSnapshotDate: string;
  };
  
  // Results metadata
  results?: {
    suggestionCount: number;
    acceptanceRate: number;
    generationTimeMs: number;
    avgConfidence: number;
  };
  
  // Generation profile
  profile?: any; // JSON blob for detailed analysis
}

export class ScenarioPersistenceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Save scenario parameters and metadata for reproducibility
   */
  async saveScenario(
    scenarioId: string,
    params: GenerationParams,
    result: GenerationResult,
    name?: string,
    description?: string
  ): Promise<ScenarioRecord> {
    
    const osmSnapshotDate = this.getCurrentOSMSnapshotDate();
    const dataVersions = this.getCurrentDataVersions();
    
    const scenarioRecord: ScenarioRecord = {
      id: scenarioId,
      name: name || `Scenario ${scenarioId}`,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      parameters: {
        region: params.region,
        weights: this.extractWeights(),
        mixRatio: this.extractMixRatio(),
        popMin: parseInt(process.env.EXPANSION_POP_MIN || '1000'),
        seed: params.seed,
        targetCount: params.targetCount || 100,
        enableDiagnostics: params.enableDiagnostics || false,
        minDistanceM: params.minDistanceM,
        aggression: params.aggression
      },
      
      dataVersions: {
        ...dataVersions,
        osmSnapshotDate
      },
      
      results: {
        suggestionCount: result.suggestions.length,
        acceptanceRate: result.metadata.expansionStats?.acceptanceRate || 0,
        generationTimeMs: result.metadata.generationTimeMs,
        avgConfidence: result.metadata.avgConfidence
      },
      
      profile: result.metadata.generationProfile
    };

    // In production, save to database
    // For now, log the scenario for debugging
    console.log('💾 Scenario saved:', {
      id: scenarioId,
      name: scenarioRecord.name,
      parameters: scenarioRecord.parameters,
      dataVersions: scenarioRecord.dataVersions,
      results: scenarioRecord.results
    });

    return scenarioRecord;
  }

  /**
   * Load scenario by ID for re-running with same parameters
   */
  async loadScenario(scenarioId: string): Promise<ScenarioRecord | null> {
    // In production, load from database
    // For now, return null (not implemented)
    console.log(`📂 Loading scenario: ${scenarioId} (not implemented)`);
    return null;
  }

  /**
   * List all scenarios with metadata
   */
  async listScenarios(limit: number = 50): Promise<ScenarioRecord[]> {
    // In production, query database
    // For now, return empty array
    console.log(`📋 Listing scenarios (limit: ${limit}) - not implemented`);
    return [];
  }

  /**
   * Compare two scenarios for A/B testing
   */
  async compareScenarios(scenarioId1: string, scenarioId2: string): Promise<{
    scenario1: ScenarioRecord;
    scenario2: ScenarioRecord;
    comparison: {
      parameterDiffs: Record<string, { value1: any; value2: any }>;
      resultDiffs: Record<string, { value1: any; value2: any }>;
      significantChanges: string[];
    };
  } | null> {
    
    const scenario1 = await this.loadScenario(scenarioId1);
    const scenario2 = await this.loadScenario(scenarioId2);
    
    if (!scenario1 || !scenario2) {
      return null;
    }

    // Compare parameters and results
    const parameterDiffs = this.compareObjects(scenario1.parameters, scenario2.parameters);
    const resultDiffs = this.compareObjects(scenario1.results || {}, scenario2.results || {});
    
    // Identify significant changes
    const significantChanges = [];
    if (Math.abs((scenario1.results?.acceptanceRate || 0) - (scenario2.results?.acceptanceRate || 0)) > 5) {
      significantChanges.push('Acceptance rate changed significantly');
    }
    if (Math.abs((scenario1.results?.avgConfidence || 0) - (scenario2.results?.avgConfidence || 0)) > 0.1) {
      significantChanges.push('Average confidence changed significantly');
    }

    return {
      scenario1,
      scenario2,
      comparison: {
        parameterDiffs,
        resultDiffs,
        significantChanges
      }
    };
  }

  /**
   * Generate reproducible scenario ID
   */
  generateScenarioId(params: GenerationParams): string {
    const key = JSON.stringify({
      region: params.region,
      seed: params.seed,
      weights: this.extractWeights(),
      mixRatio: this.extractMixRatio(),
      popMin: process.env.EXPANSION_POP_MIN,
      osmSnapshot: this.getCurrentOSMSnapshotDate()
    });
    
    // Simple hash for demo - in production use proper UUID
    const hash = Buffer.from(key).toString('base64').slice(0, 12);
    return `scenario_${hash}`;
  }

  /**
   * Extract current scoring weights from environment
   */
  private extractWeights(): Record<string, number> {
    return {
      population: parseFloat(process.env.EXPANSION_WEIGHT_POPULATION || '0.25'),
      gap: parseFloat(process.env.EXPANSION_WEIGHT_GAP || '0.35'),
      anchor: parseFloat(process.env.EXPANSION_WEIGHT_ANCHOR || '0.20'),
      performance: parseFloat(process.env.EXPANSION_WEIGHT_PERFORMANCE || '0.20'),
      saturation: parseFloat(process.env.EXPANSION_WEIGHT_SATURATION || '0.15')
    };
  }

  /**
   * Extract current mix ratio from environment
   */
  private extractMixRatio(): Record<string, number> {
    return {
      settlement: parseFloat(process.env.EXPANSION_MIX_SETTLEMENT || '0.7'),
      h3Explore: parseFloat(process.env.EXPANSION_MIX_H3_EXPLORE || '0.3')
    };
  }

  /**
   * Get current OSM snapshot date (pinned for reproducibility)
   */
  private getCurrentOSMSnapshotDate(): string {
    // In production, this would be the actual OSM data snapshot date
    // For now, use a fixed date for consistency
    return process.env.EXPANSION_OSM_SNAPSHOT_DATE || '2024-11-01';
  }

  /**
   * Get current data versions for all sources
   */
  private getCurrentDataVersions(): { osm: string; demographic: string; stores: string } {
    return {
      osm: process.env.EXPANSION_OSM_VERSION || 'mock-v1.0',
      demographic: process.env.EXPANSION_DEMOGRAPHIC_VERSION || 'census-2023',
      stores: process.env.EXPANSION_STORES_VERSION || 'db-current'
    };
  }

  /**
   * Compare two objects and return differences
   */
  private compareObjects(obj1: any, obj2: any): Record<string, { value1: any; value2: any }> {
    const diffs: Record<string, { value1: any; value2: any }> = {};
    
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    
    for (const key of allKeys) {
      if (obj1[key] !== obj2[key]) {
        diffs[key] = { value1: obj1[key], value2: obj2[key] };
      }
    }
    
    return diffs;
  }

  /**
   * Export scenario for external analysis
   */
  async exportScenario(scenarioId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const scenario = await this.loadScenario(scenarioId);
    
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    if (format === 'json') {
      return JSON.stringify(scenario, null, 2);
    } else {
      // Convert to CSV format for spreadsheet analysis
      const csv = this.convertScenarioToCSV(scenario);
      return csv;
    }
  }

  /**
   * Convert scenario to CSV format
   */
  private convertScenarioToCSV(scenario: ScenarioRecord): string {
    const headers = ['Parameter', 'Value'];
    const rows = [
      ['Scenario ID', scenario.id],
      ['Name', scenario.name],
      ['Created At', scenario.createdAt.toISOString()],
      ['OSM Snapshot Date', scenario.dataVersions.osmSnapshotDate],
      ['Population Weight', scenario.parameters.weights.population],
      ['Gap Weight', scenario.parameters.weights.gap],
      ['Anchor Weight', scenario.parameters.weights.anchor],
      ['Performance Weight', scenario.parameters.weights.performance],
      ['Saturation Weight', scenario.parameters.weights.saturation],
      ['Settlement Mix', scenario.parameters.mixRatio.settlement],
      ['H3 Explore Mix', scenario.parameters.mixRatio.h3Explore],
      ['Population Min', scenario.parameters.popMin],
      ['Seed', scenario.parameters.seed],
      ['Target Count', scenario.parameters.targetCount],
      ['Suggestion Count', scenario.results?.suggestionCount || 0],
      ['Acceptance Rate', scenario.results?.acceptanceRate || 0],
      ['Generation Time (ms)', scenario.results?.generationTimeMs || 0],
      ['Average Confidence', scenario.results?.avgConfidence || 0]
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}