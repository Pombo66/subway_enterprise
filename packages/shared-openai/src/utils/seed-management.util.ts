/**
 * Seed Management Utility
 * Enhanced seed management for reproducibility and debugging
 * Requirements: 3.4, 3.5
 */

import { SeedInfo } from '../services/deterministic-controls.service';

export interface SeedRecord {
  id: string;
  seed: number;
  context: string;
  strategy: string;
  generatedAt: Date;
  usedAt: Date[];
  resultHashes: string[];
  metadata: Record<string, any>;
}

export interface ReproducibilityTest {
  seedValue: number;
  context: string;
  expectedHash: string;
  actualHash?: string;
  isReproducible?: boolean;
  attempts: number;
  lastTested: Date;
}

export class SeedManagementUtil {
  private static seedHistory = new Map<string, SeedRecord>();
  private static reproducibilityTests = new Map<string, ReproducibilityTest>();

  /**
   * Record seed usage for debugging and reproducibility
   * Requirement 3.4: Store seed values alongside cached rationales for debugging
   */
  static recordSeedUsage(
    seedInfo: SeedInfo,
    resultHash: string,
    metadata: Record<string, any> = {}
  ): void {
    const recordId = this.generateRecordId(seedInfo.seed, seedInfo.context);
    
    let record = this.seedHistory.get(recordId);
    
    if (!record) {
      record = {
        id: recordId,
        seed: seedInfo.seed,
        context: seedInfo.context,
        strategy: seedInfo.strategy,
        generatedAt: seedInfo.generatedAt,
        usedAt: [],
        resultHashes: [],
        metadata: {}
      };
      this.seedHistory.set(recordId, record);
    }

    // Update usage tracking
    record.usedAt.push(new Date());
    record.resultHashes.push(resultHash);
    record.metadata = { ...record.metadata, ...metadata };

    // Limit history size to prevent memory issues
    if (record.usedAt.length > 100) {
      record.usedAt = record.usedAt.slice(-50);
      record.resultHashes = record.resultHashes.slice(-50);
    }
  }

  /**
   * Test reproducibility of seed-based outputs
   * Requirement 3.4: Enable debugging through seed value tracking
   */
  static async testReproducibility(
    seedValue: number,
    context: string,
    apiCall: (seed: number) => Promise<string>
  ): Promise<ReproducibilityTest> {
    const testId = this.generateTestId(seedValue, context);
    let test = this.reproducibilityTests.get(testId);

    if (!test) {
      // First time testing this seed/context combination
      const initialResult = await apiCall(seedValue);
      const initialHash = this.hashResult(initialResult);
      
      test = {
        seedValue,
        context,
        expectedHash: initialHash,
        attempts: 1,
        lastTested: new Date()
      };
    } else {
      // Re-test existing seed/context combination
      const newResult = await apiCall(seedValue);
      const newHash = this.hashResult(newResult);
      
      test.actualHash = newHash;
      test.isReproducible = newHash === test.expectedHash;
      test.attempts++;
      test.lastTested = new Date();
    }

    this.reproducibilityTests.set(testId, test);
    return test;
  }

  /**
   * Get seed usage history for debugging
   */
  static getSeedHistory(seedValue?: number, context?: string): SeedRecord[] {
    const records = Array.from(this.seedHistory.values());
    
    return records.filter(record => {
      if (seedValue !== undefined && record.seed !== seedValue) {
        return false;
      }
      if (context !== undefined && !record.context.includes(context)) {
        return false;
      }
      return true;
    }).sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  /**
   * Get reproducibility test results
   */
  static getReproducibilityResults(): ReproducibilityTest[] {
    return Array.from(this.reproducibilityTests.values())
      .sort((a, b) => b.lastTested.getTime() - a.lastTested.getTime());
  }

  /**
   * Generate seed for specific reproducibility requirements
   */
  static generateReproducibleSeed(
    baseContext: string,
    variant: string = '',
    timestamp?: Date
  ): number {
    // Create deterministic seed that can be reproduced
    const seedInput = `${baseContext}|${variant}|${timestamp?.toISOString() || 'default'}`;
    
    let hash = 0;
    for (let i = 0; i < seedInput.length; i++) {
      const char = seedInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % 2147483647;
  }

  /**
   * Create seed backup for critical operations
   */
  static createSeedBackup(seedInfo: SeedInfo): SeedBackup {
    return {
      seed: seedInfo.seed,
      context: seedInfo.context,
      strategy: seedInfo.strategy,
      generatedAt: seedInfo.generatedAt,
      backupCreatedAt: new Date(),
      reproductionInstructions: this.generateReproductionInstructions(seedInfo)
    };
  }

  /**
   * Restore seed from backup
   */
  static restoreSeedFromBackup(backup: SeedBackup): SeedInfo {
    return {
      seed: backup.seed,
      context: backup.context,
      strategy: backup.strategy,
      generatedAt: backup.generatedAt
    };
  }

  /**
   * Validate seed consistency across cache invalidations
   * Requirement 3.5: Implement seed-based cache invalidation logic
   */
  static validateSeedConsistency(
    cacheKey: string,
    currentSeed: number,
    cachedSeed?: number
  ): SeedConsistencyResult {
    if (cachedSeed === undefined) {
      return {
        isConsistent: true,
        reason: 'No cached seed to compare',
        action: 'none'
      };
    }

    if (currentSeed === cachedSeed) {
      return {
        isConsistent: true,
        reason: 'Seeds match',
        action: 'use_cache'
      };
    }

    // Seeds don't match - determine why
    const seedRecord = this.findSeedRecord(cachedSeed, cacheKey);
    
    if (seedRecord && this.isSeedExpired(seedRecord)) {
      return {
        isConsistent: false,
        reason: 'Cached seed has expired',
        action: 'invalidate_cache',
        details: {
          cachedSeed,
          currentSeed,
          seedAge: Date.now() - seedRecord.generatedAt.getTime()
        }
      };
    }

    return {
      isConsistent: false,
      reason: 'Seed values differ',
      action: 'invalidate_cache',
      details: {
        cachedSeed,
        currentSeed
      }
    };
  }

  /**
   * Generate debugging report for seed-related issues
   */
  static generateDebuggingReport(context: string): SeedDebuggingReport {
    const relatedRecords = this.getSeedHistory(undefined, context);
    const relatedTests = this.getReproducibilityResults()
      .filter(test => test.context.includes(context));
    
    const uniqueSeeds = new Set(relatedRecords.map(r => r.seed));
    const totalUsages = relatedRecords.reduce((sum, r) => sum + r.usedAt.length, 0);
    const reproducibleTests = relatedTests.filter(t => t.isReproducible === true).length;
    const totalTests = relatedTests.length;

    return {
      context,
      generatedAt: new Date(),
      summary: {
        uniqueSeeds: uniqueSeeds.size,
        totalUsages,
        reproducibilityRate: totalTests > 0 ? (reproducibleTests / totalTests) * 100 : 0,
        totalTests
      },
      seedRecords: relatedRecords.slice(0, 10), // Last 10 records
      reproducibilityTests: relatedTests.slice(0, 5), // Last 5 tests
      recommendations: this.generateRecommendations(relatedRecords, relatedTests)
    };
  }

  /**
   * Clean up old seed records to prevent memory leaks
   */
  static cleanupOldRecords(maxAge: number = 7 * 24 * 60 * 60 * 1000): number { // 7 days default
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [key, record] of this.seedHistory.entries()) {
      if (record.generatedAt.getTime() < cutoffTime) {
        this.seedHistory.delete(key);
        cleanedCount++;
      }
    }

    // Also clean up old reproducibility tests
    for (const [key, test] of this.reproducibilityTests.entries()) {
      if (test.lastTested.getTime() < cutoffTime) {
        this.reproducibilityTests.delete(key);
      }
    }

    return cleanedCount;
  }

  /**
   * Export seed data for external analysis
   */
  static exportSeedData(): SeedExport {
    return {
      exportedAt: new Date(),
      seedHistory: Array.from(this.seedHistory.values()),
      reproducibilityTests: Array.from(this.reproducibilityTests.values()),
      statistics: {
        totalRecords: this.seedHistory.size,
        totalTests: this.reproducibilityTests.size,
        oldestRecord: this.getOldestRecord()?.generatedAt,
        newestRecord: this.getNewestRecord()?.generatedAt
      }
    };
  }

  // Private helper methods
  private static generateRecordId(seed: number, context: string): string {
    return `${seed}_${this.hashString(context)}`;
  }

  private static generateTestId(seed: number, context: string): string {
    return `test_${seed}_${this.hashString(context)}`;
  }

  private static hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private static hashResult(result: string): string {
    // Simple hash for result comparison
    return this.hashString(result);
  }

  private static findSeedRecord(seed: number, context: string): SeedRecord | undefined {
    const recordId = this.generateRecordId(seed, context);
    return this.seedHistory.get(recordId);
  }

  private static isSeedExpired(record: SeedRecord, maxAge: number = 24 * 60 * 60 * 1000): boolean {
    return Date.now() - record.generatedAt.getTime() > maxAge;
  }

  private static generateReproductionInstructions(seedInfo: SeedInfo): string {
    return `To reproduce this result:
1. Use seed: ${seedInfo.seed}
2. Context: ${seedInfo.context}
3. Strategy: ${seedInfo.strategy}
4. Generated at: ${seedInfo.generatedAt.toISOString()}`;
  }

  private static generateRecommendations(
    records: SeedRecord[],
    tests: ReproducibilityTest[]
  ): string[] {
    const recommendations: string[] = [];

    if (records.length === 0) {
      recommendations.push('No seed usage history found - consider enabling seed tracking');
    }

    const failedTests = tests.filter(t => t.isReproducible === false);
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} reproducibility tests failed - check for non-deterministic behavior`);
    }

    const uniqueSeeds = new Set(records.map(r => r.seed));
    if (uniqueSeeds.size > records.length * 0.8) {
      recommendations.push('High seed diversity detected - consider using more consistent seed generation');
    }

    return recommendations;
  }

  private static getOldestRecord(): SeedRecord | undefined {
    const records = Array.from(this.seedHistory.values());
    return records.reduce((oldest, current) => 
      !oldest || current.generatedAt < oldest.generatedAt ? current : oldest
    , undefined as SeedRecord | undefined);
  }

  private static getNewestRecord(): SeedRecord | undefined {
    const records = Array.from(this.seedHistory.values());
    return records.reduce((newest, current) => 
      !newest || current.generatedAt > newest.generatedAt ? current : newest
    , undefined as SeedRecord | undefined);
  }
}

export interface SeedBackup {
  seed: number;
  context: string;
  strategy: string;
  generatedAt: Date;
  backupCreatedAt: Date;
  reproductionInstructions: string;
}

export interface SeedConsistencyResult {
  isConsistent: boolean;
  reason: string;
  action: 'none' | 'use_cache' | 'invalidate_cache';
  details?: Record<string, any>;
}

export interface SeedDebuggingReport {
  context: string;
  generatedAt: Date;
  summary: {
    uniqueSeeds: number;
    totalUsages: number;
    reproducibilityRate: number;
    totalTests: number;
  };
  seedRecords: SeedRecord[];
  reproducibilityTests: ReproducibilityTest[];
  recommendations: string[];
}

export interface SeedExport {
  exportedAt: Date;
  seedHistory: SeedRecord[];
  reproducibilityTests: ReproducibilityTest[];
  statistics: {
    totalRecords: number;
    totalTests: number;
    oldestRecord?: Date;
    newestRecord?: Date;
  };
}