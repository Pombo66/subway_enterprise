import * as turf from '@turf/turf';
import { PrismaClient } from '@prisma/client';

export interface DriveTimeNMSResult {
  selected: any[];
  suppressed: any[];
  clusters: Array<{
    center: any;
    members: any[];
    avgDriveTime: number;
  }>;
}

export class DriveTimeNMSService {
  private readonly DRIVE_TIME_MINUTES = parseInt(process.env.EXPANSION_DRIVE_TIME_NMS_MINUTES || '10');
  private readonly DRIVE_SPEED_KMH = parseInt(process.env.EXPANSION_DRIVE_SPEED_KMH || '50'); // Urban driving speed
  
  // Convert drive time to approximate distance
  private readonly MAX_DISTANCE_M = (this.DRIVE_TIME_MINUTES / 60) * this.DRIVE_SPEED_KMH * 1000;

  /**
   * Extract coordinates from candidate, handling both settlement format (lng/lat) and H3 format (center array)
   */
  private extractCoordinates(candidate: any): { lng: number; lat: number } | null {
    let lng: number, lat: number;
    
    if (candidate.center && Array.isArray(candidate.center)) {
      // H3 format: center: [lng, lat]
      lng = candidate.center[0];
      lat = candidate.center[1];
    } else {
      // Settlement format: lng/lat properties
      lng = typeof candidate.lng === 'number' ? candidate.lng : candidate.longitude;
      lat = typeof candidate.lat === 'number' ? candidate.lat : candidate.latitude;
    }
    
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      console.warn(`Invalid coordinates for ${candidate.id}:`, { lng, lat });
      return null;
    }
    
    return { lng, lat };
  }

  constructor(private readonly prisma: PrismaClient) {
    console.log(`🚗 Drive-time NMS initialized: ${this.DRIVE_TIME_MINUTES}min (≈${Math.round(this.MAX_DISTANCE_M / 1000)}km at ${this.DRIVE_SPEED_KMH}km/h)`);
  }

  /**
   * Apply 10-minute drive-time Non-Maximum Suppression
   * Groups candidates within drive-time and keeps highest scoring
   */
  async applyDriveTimeNMS(
    candidates: Array<{
      id: string;
      lat: number;
      lng: number;
      score: number;
      [key: string]: any;
    }>
  ): Promise<DriveTimeNMSResult> {
    
    console.log(`🚗 Applying drive-time NMS to ${candidates.length} candidates...`);
    
    // Sort by score descending
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    
    const selected: any[] = [];
    const suppressed: any[] = [];
    const clusters: Array<{ center: any; members: any[]; avgDriveTime: number }> = [];
    const processed = new Set<string>();

    for (const candidate of sorted) {
      if (processed.has(candidate.id)) continue;

      // Find all candidates within drive time of this one
      const cluster = this.findDriveTimeCluster(candidate, sorted, processed);
      
      if (cluster.members.length > 1) {
        // Multiple candidates in drive-time range - keep highest scoring
        selected.push(cluster.center);
        suppressed.push(...cluster.members.filter(m => m.id !== cluster.center.id));
        clusters.push(cluster);
        
        // Mark all as processed
        cluster.members.forEach(member => processed.add(member.id));
        
        const centerScore = typeof cluster.center.score === 'number' ? cluster.center.score.toFixed(3) : cluster.center.score;
        console.log(`   Cluster: kept ${cluster.center.id} (score: ${centerScore}), suppressed ${cluster.members.length - 1} within ${cluster.avgDriveTime.toFixed(1)}min`);
      } else {
        // Isolated candidate - keep it
        selected.push(candidate);
        processed.add(candidate.id);
      }
    }

    console.log(`🚗 Drive-time NMS complete: ${selected.length} selected, ${suppressed.length} suppressed, ${clusters.length} clusters`);
    
    return {
      selected,
      suppressed,
      clusters
    };
  }

  /**
   * Find all candidates within drive time of a center candidate
   */
  private findDriveTimeCluster(
    center: any,
    allCandidates: any[],
    processed: Set<string>
  ): { center: any; members: any[]; avgDriveTime: number } {
    
    // Extract and validate center coordinates
    const centerCoords = this.extractCoordinates(center);
    if (!centerCoords) {
      return { center, members: [center], avgDriveTime: 0 };
    }
    
    const centerPoint = turf.point([centerCoords.lng, centerCoords.lat]);
    const members = [];
    let totalDriveTime = 0;

    for (const candidate of allCandidates) {
      if (processed.has(candidate.id)) continue;

      // Extract and validate candidate coordinates
      const candidateCoords = this.extractCoordinates(candidate);
      if (!candidateCoords) {
        continue;
      }

      const candidatePoint = turf.point([candidateCoords.lng, candidateCoords.lat]);
      const distance = turf.distance(centerPoint, candidatePoint, { units: 'meters' });
      
      // Approximate drive time based on distance and urban speed
      const driveTimeMinutes = (distance / 1000) / this.DRIVE_SPEED_KMH * 60;
      
      if (driveTimeMinutes <= this.DRIVE_TIME_MINUTES) {
        members.push({
          ...candidate,
          driveTimeFromCenter: driveTimeMinutes,
          distanceFromCenter: distance
        });
        totalDriveTime += driveTimeMinutes;
      }
    }

    const avgDriveTime = members.length > 0 ? totalDriveTime / members.length : 0;

    return {
      center,
      members,
      avgDriveTime
    };
  }

  /**
   * Apply per-region soft caps with state-level fairness to prevent megacity dominance
   */
  async applyRegionalSoftCaps(
    candidates: any[],
    region: { country?: string; state?: string },
    maxPerRegion: number = 50
  ): Promise<{ selected: any[]; capped: any[]; stateDistribution: Record<string, number> }> {
    
    console.log(`📊 Applying regional soft caps with state fairness: max ${maxPerRegion} per region`);
    
    if (candidates.length <= maxPerRegion) {
      return {
        selected: candidates,
        capped: [],
        stateDistribution: this.calculateStateDistribution(candidates)
      };
    }

    // Apply state-level fairness for country-wide generation
    if (region.country && !region.state) {
      return this.applyStateLevelFairness(candidates, maxPerRegion);
    }

    // Simple regional cap for state-level generation
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const selected = sorted.slice(0, maxPerRegion);
    const capped = sorted.slice(maxPerRegion);

    console.log(`📊 Regional caps applied: ${selected.length} selected, ${capped.length} capped`);

    return { 
      selected, 
      capped,
      stateDistribution: this.calculateStateDistribution(selected)
    };
  }

  /**
   * Apply sophisticated state-level fairness with population weighting and performance bonuses
   */
  private applyStateLevelFairness(
    candidates: any[],
    totalTarget: number
  ): { selected: any[]; capped: any[]; stateDistribution: Record<string, number>; fairnessLedger: Record<string, any> } {
    
    // Group candidates by state
    const candidatesByState = this.groupCandidatesByState(candidates);
    const stateNames = Object.keys(candidatesByState);
    
    console.log(`   Found candidates in ${stateNames.length} states:`, 
      stateNames.map(state => `${state}:${candidatesByState[state].length}`).join(', '));
    
    // Get state population weights and performance metrics
    const stateMetrics = this.calculateStateMetrics(candidatesByState);
    
    // Calculate proportional base quotas by population
    const USE_POP_WEIGHTING = process.env.STATE_FAIR_BASE_BY_POP !== 'false';
    const PERF_BONUS_SLOTS = parseInt(process.env.STATE_PERF_BONUS || '1');
    
    let baseAllocations: Record<string, number> = {};
    let bonusAllocations: Record<string, number> = {};
    
    if (USE_POP_WEIGHTING) {
      // Population-weighted base allocation
      const totalPopWeight = Object.values(stateMetrics).reduce((sum, m) => sum + m.populationWeight, 0);
      const reservedForBonus = Math.min(PERF_BONUS_SLOTS * stateNames.length, Math.floor(totalTarget * 0.2));
      const baseTarget = totalTarget - reservedForBonus;
      
      stateNames.forEach(state => {
        const popShare = stateMetrics[state].populationWeight / totalPopWeight;
        baseAllocations[state] = Math.floor(baseTarget * popShare);
      });
      
      // Performance bonus allocation
      const statesByPerformance = stateNames
        .sort((a, b) => stateMetrics[b].avgPeerTurnover - stateMetrics[a].avgPeerTurnover);
      
      statesByPerformance.slice(0, Math.floor(reservedForBonus / PERF_BONUS_SLOTS)).forEach(state => {
        bonusAllocations[state] = PERF_BONUS_SLOTS;
      });
    } else {
      // Equal base allocation
      const basePerState = Math.floor(totalTarget / stateNames.length);
      stateNames.forEach(state => {
        baseAllocations[state] = basePerState;
      });
    }
    
    // Apply manual overrides from environment
    const manualOverrides = this.getManualStateCaps();
    Object.entries(manualOverrides).forEach(([state, cap]) => {
      if (baseAllocations[state] !== undefined) {
        baseAllocations[state] = Math.min(baseAllocations[state] + (bonusAllocations[state] || 0), cap);
        bonusAllocations[state] = 0; // Override cancels bonus
      }
    });
    
    // Allocate candidates per state
    const selected: any[] = [];
    const capped: any[] = [];
    const stateDistribution: Record<string, number> = {};
    const fairnessLedger: Record<string, any> = {};
    
    stateNames.forEach(state => {
      const stateCandidates = candidatesByState[state].sort((a, b) => b.score - a.score);
      const baseAllocation = baseAllocations[state] || 0;
      const bonusAllocation = bonusAllocations[state] || 0;
      const totalAllocation = Math.min(baseAllocation + bonusAllocation, stateCandidates.length);
      
      const stateSelected = stateCandidates.slice(0, totalAllocation);
      const stateCapped = stateCandidates.slice(totalAllocation);
      
      selected.push(...stateSelected);
      capped.push(...stateCapped);
      stateDistribution[state] = stateSelected.length;
      
      // Create fairness ledger entry
      fairnessLedger[state] = {
        base: baseAllocation,
        perfBonus: bonusAllocation,
        manual: manualOverrides[state] ? `capped at ${manualOverrides[state]}` : null,
        allocated: totalAllocation,
        available: stateCandidates.length,
        avgScore: stateMetrics[state].avgScore,
        avgPeerTurnover: stateMetrics[state].avgPeerTurnover
      };
      
      console.log(`   ${state}: ${totalAllocation}/${stateCandidates.length} selected (base: ${baseAllocation}, bonus: ${bonusAllocation})`);
    });
    
    // Sort final selection by score while maintaining state fairness
    selected.sort((a, b) => b.score - a.score);
    
    console.log(`📊 Sophisticated state fairness applied: ${selected.length} selected across ${stateNames.length} states`);
    
    return { selected, capped, stateDistribution, fairnessLedger };
  }

  /**
   * Calculate state-level metrics for fair allocation
   */
  private calculateStateMetrics(candidatesByState: Record<string, any[]>): Record<string, any> {
    const stateMetrics: Record<string, any> = {};
    
    // Mock German state populations (in production, use real census data)
    const statePopulations: Record<string, number> = {
      'North Rhine-Westphalia': 17932651,
      'Bavaria': 13124737,
      'Baden-Württemberg': 11100394,
      'Lower Saxony': 7993608,
      'Hesse': 6288080,
      'Berlin': 3669491,
      'Hamburg': 1899160,
      'Saxony': 4071971,
      'Other States': 5000000 // Aggregate for smaller states
    };
    
    Object.entries(candidatesByState).forEach(([state, candidates]) => {
      const avgScore = candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length;
      const avgPeerTurnover = candidates.reduce((sum, c) => sum + (c.peerTurnover || 0), 0) / candidates.length;
      const population = statePopulations[state] || 1000000; // Default for unknown states
      
      stateMetrics[state] = {
        avgScore,
        avgPeerTurnover,
        population,
        populationWeight: Math.log10(population), // Log scale for fairness
        candidateCount: candidates.length
      };
    });
    
    return stateMetrics;
  }

  /**
   * Get manual state caps from environment variables
   */
  private getManualStateCaps(): Record<string, number> {
    const caps: Record<string, number> = {};
    
    // Check for manual overrides like STATE_CAP_BAVARIA=5
    const envKeys = Object.keys(process.env).filter(key => key.startsWith('STATE_CAP_'));
    
    envKeys.forEach(key => {
      const state = key.replace('STATE_CAP_', '').replace('_', ' ');
      const cap = parseInt(process.env[key] || '0');
      if (cap > 0) {
        caps[state] = cap;
      }
    });
    
    return caps;
  }

  /**
   * Group candidates by state (mock implementation)
   */
  private groupCandidatesByState(candidates: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    candidates.forEach(candidate => {
      // Mock state assignment based on settlement name or coordinates
      // In production, use actual geographic boundaries or settlement metadata
      let state = 'Unknown';
      
      if (candidate.settlementName || candidate.name) {
        const name = candidate.settlementName || candidate.name;
        
        // Mock German state assignment based on major cities
        if (['Berlin'].includes(name)) state = 'Berlin';
        else if (['Hamburg'].includes(name)) state = 'Hamburg';
        else if (['Munich', 'Würzburg', 'Bamberg', 'Regensburg'].includes(name)) state = 'Bavaria';
        else if (['Stuttgart', 'Heidelberg', 'Freiburg im Breisgau'].includes(name)) state = 'Baden-Württemberg';
        else if (['Cologne', 'Düsseldorf', 'Dortmund', 'Essen'].includes(name)) state = 'North Rhine-Westphalia';
        else if (['Frankfurt am Main'].includes(name)) state = 'Hesse';
        else if (['Leipzig'].includes(name)) state = 'Saxony';
        else state = 'Other States';
      } else {
        // Fallback: assign based on coordinates (simplified)
        const lat = candidate.lat || candidate.center?.[1];
        const lng = candidate.lng || candidate.center?.[0];
        
        if (lat && lng) {
          if (lat > 53.0) state = 'Northern States';
          else if (lat > 50.0) state = 'Central States';
          else state = 'Southern States';
        }
      }
      
      if (!groups[state]) groups[state] = [];
      groups[state].push(candidate);
    });
    
    return groups;
  }

  /**
   * Calculate state distribution for reporting
   */
  private calculateStateDistribution(candidates: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    const groups = this.groupCandidatesByState(candidates);
    
    Object.keys(groups).forEach(state => {
      distribution[state] = groups[state].length;
    });
    
    return distribution;
  }

  /**
   * Enhanced NMS that considers both drive-time and regional distribution
   */
  async applyEnhancedNMS(
    candidates: any[],
    region: { country?: string; state?: string },
    options: {
      maxPerRegion?: number;
      minSpacing?: number; // Additional minimum spacing in meters
      preserveTopScorers?: number; // Always keep top N regardless of spacing
      enableStateFairness?: boolean; // Enable state-level fairness
    } = {}
  ): Promise<{
    selected: any[];
    suppressed: any[];
    capped: any[];
    clusters: any[];
    stats: {
      originalCount: number;
      afterDriveTimeNMS: number;
      afterRegionalCaps: number;
      finalCount: number;
    };
  }> {
    
    const originalCount = candidates.length;
    console.log(`🎯 Enhanced NMS: processing ${originalCount} candidates`);

    // Step 1: Preserve top scorers if requested
    let topScorers: any[] = [];
    let remainingCandidates = candidates;
    
    if (options.preserveTopScorers && options.preserveTopScorers > 0) {
      const sorted = [...candidates].sort((a, b) => b.score - a.score);
      topScorers = sorted.slice(0, options.preserveTopScorers);
      remainingCandidates = sorted.slice(options.preserveTopScorers);
      console.log(`   Preserved top ${topScorers.length} scorers`);
    }

    // Step 2: Apply drive-time NMS to remaining candidates
    const driveTimeResult = await this.applyDriveTimeNMS(remainingCandidates);
    const afterDriveTimeNMS = [...topScorers, ...driveTimeResult.selected];

    // Step 3: Apply additional minimum spacing if requested
    let afterSpacing = afterDriveTimeNMS;
    if (options.minSpacing && options.minSpacing > 0) {
      afterSpacing = this.applyMinimumSpacing(afterDriveTimeNMS, options.minSpacing);
      console.log(`   Applied ${options.minSpacing}m minimum spacing: ${afterSpacing.length} remaining`);
    }

    // Step 4: Apply regional soft caps with optional state fairness
    const regionalResult = await this.applyRegionalSoftCaps(
      afterSpacing,
      region,
      options.maxPerRegion || 50
    );

    const stats = {
      originalCount,
      afterDriveTimeNMS: afterDriveTimeNMS.length,
      afterRegionalCaps: regionalResult.selected.length,
      finalCount: regionalResult.selected.length
    };

    console.log(`🎯 Enhanced NMS complete:`, stats);

    return {
      selected: regionalResult.selected,
      suppressed: driveTimeResult.suppressed,
      capped: regionalResult.capped,
      clusters: driveTimeResult.clusters,
      stats
    };
  }

  /**
   * Apply minimum spacing constraint (simple distance-based NMS)
   */
  private applyMinimumSpacing(candidates: any[], minSpacingM: number): any[] {
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const selected: any[] = [];
    
    for (const candidate of sorted) {
      // Extract and validate candidate coordinates
      const candidateCoords = this.extractCoordinates(candidate);
      if (!candidateCoords) {
        continue;
      }
      
      const candidatePoint = turf.point([candidateCoords.lng, candidateCoords.lat]);
      
      // Check if too close to any already selected candidate
      const tooClose = selected.some(selected => {
        const selectedCoords = this.extractCoordinates(selected);
        if (!selectedCoords) {
          return false; // Skip invalid coordinates
        }
        
        const selectedPoint = turf.point([selectedCoords.lng, selectedCoords.lat]);
        const distance = turf.distance(candidatePoint, selectedPoint, { units: 'meters' });
        return distance < minSpacingM;
      });

      if (!tooClose) {
        selected.push(candidate);
      }
    }

    return selected;
  }

  /**
   * Calculate drive-time statistics for analysis
   */
  calculateDriveTimeStats(candidates: any[]): {
    avgNearestNeighborDriveTime: number;
    minDriveTime: number;
    maxDriveTime: number;
    clusteredPairs: number;
  } {
    
    if (candidates.length < 2) {
      return {
        avgNearestNeighborDriveTime: 0,
        minDriveTime: 0,
        maxDriveTime: 0,
        clusteredPairs: 0
      };
    }

    const driveTimes: number[] = [];
    let clusteredPairs = 0;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      // Extract and validate candidate coordinates
      const candidateCoords = this.extractCoordinates(candidate);
      if (!candidateCoords) {
        continue;
      }
      
      const candidatePoint = turf.point([candidateCoords.lng, candidateCoords.lat]);
      
      let nearestDriveTime = Infinity;
      
      for (let j = 0; j < candidates.length; j++) {
        if (i === j) continue;
        
        const other = candidates[j];
        
        // Extract and validate other coordinates
        const otherCoords = this.extractCoordinates(other);
        if (!otherCoords) {
          continue;
        }
        
        const otherPoint = turf.point([otherCoords.lng, otherCoords.lat]);
        const distance = turf.distance(candidatePoint, otherPoint, { units: 'meters' });
        const driveTime = (distance / 1000) / this.DRIVE_SPEED_KMH * 60;
        
        if (driveTime < nearestDriveTime) {
          nearestDriveTime = driveTime;
        }
        
        if (driveTime <= this.DRIVE_TIME_MINUTES) {
          clusteredPairs++;
        }
      }
      
      if (nearestDriveTime !== Infinity) {
        driveTimes.push(nearestDriveTime);
      }
    }

    return {
      avgNearestNeighborDriveTime: driveTimes.length > 0 
        ? driveTimes.reduce((sum, t) => sum + t, 0) / driveTimes.length 
        : 0,
      minDriveTime: Math.min(...driveTimes),
      maxDriveTime: Math.max(...driveTimes),
      clusteredPairs: clusteredPairs / 2 // Divide by 2 since we count each pair twice
    };
  }
}