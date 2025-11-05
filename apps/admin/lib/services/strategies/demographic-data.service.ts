import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface EconomicIndicators {
  population: number;
  populationGrowthRate: number; // Annual %
  medianIncome: number;
  nationalMedianIncome: number;
  incomeIndex: number; // local/national ratio
  economicScore: number;
  growthTrajectory: 'high_growth' | 'moderate_growth' | 'stable' | 'declining';
  dataCompleteness: number; // 0-1 score indicating data quality
  dataSource: 'csv' | 'api' | 'estimated';
}

export interface DemographicRecord {
  lat: number;
  lng: number;
  population?: number;
  populationGrowthRate?: number;
  medianIncome?: number;
  region?: string;
  municipality?: string;
  dataSource: 'csv' | 'api' | 'estimated';
}

export interface ValidationResult {
  isValid: boolean;
  completeness: number;
  missingFields: string[];
  recordCount: number;
  errors: string[];
}

export interface APIConfig {
  baseUrl: string;
  apiKey?: string;
  endpoints: {
    population: string;
    income: string;
    growth: string;
  };
  rateLimit: number; // requests per second
}

export class DemographicDataService {
  private readonly CACHE_TTL_DAYS = 90;
  private readonly NATIONAL_MEDIAN_INCOME = 50000; // Default fallback
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private readonly prisma: PrismaClient) {
    console.log('📊 DemographicDataService initialized');
  }

  /**
   * Get economic indicators for a location
   * Implements requirement 3.1, 3.2, 3.3 for economic indicator integration
   */
  async getEconomicIndicators(
    lat: number,
    lng: number
  ): Promise<EconomicIndicators> {
    const hash = this.hashCoordinate(lat, lng);
    
    try {
      // Try to get from cache first
      const cached = await this.getFromCache(hash);
      if (cached) {
        this.cacheHits++;
        return cached;
      }

      this.cacheMisses++;

      // Load fresh data
      const demographicData = await this.loadDemographicDataForLocation(lat, lng);
      
      // Calculate economic indicators
      const indicators = this.calculateEconomicIndicators(demographicData);
      
      // Cache the result
      await this.cacheEconomicIndicators(hash, lat, lng, indicators);
      
      return indicators;
      
    } catch (error) {
      console.error(`Error getting economic indicators for ${lat}, ${lng}:`, error);
      
      // Return fallback indicators with low confidence
      return this.getFallbackIndicators();
    }
  }

  /**
   * Load demographic data from CSV files
   * Implements requirement 15 for CSV data loading
   */
  async loadFromCSV(filePath: string): Promise<DemographicRecord[]> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`CSV file not found: ${filePath}`);
      }

      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const records: DemographicRecord[] = [];

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          console.warn(`Skipping malformed row ${i + 1}: ${lines[i]}`);
          continue;
        }

        const record = this.parseCSVRow(headers, values);
        if (record) {
          records.push(record);
        }
      }

      console.log(`📊 Loaded ${records.length} demographic records from CSV`);
      return records;
      
    } catch (error) {
      console.error('Error loading CSV data:', error);
      throw error;
    }
  }

  /**
   * Load data from national statistics API
   * Implements requirement 15 for API integration
   */
  async loadFromAPI(apiConfig: APIConfig): Promise<DemographicRecord[]> {
    try {
      console.log('📊 Loading demographic data from API...');
      
      // This is a placeholder implementation
      // In a real implementation, this would make HTTP requests to the API
      const records: DemographicRecord[] = [];
      
      // Simulate API data loading
      console.log(`📊 API integration not yet implemented for ${apiConfig.baseUrl}`);
      
      return records;
      
    } catch (error) {
      console.error('Error loading API data:', error);
      throw error;
    }
  }

  /**
   * Calculate economic indicators from demographic data
   * Implements requirements 3.4, 4.3 for economic score calculation
   */
  private calculateEconomicIndicators(data: DemographicRecord): EconomicIndicators {
    const population = data.population || 0;
    const growthRate = data.populationGrowthRate || 0;
    const medianIncome = data.medianIncome || this.NATIONAL_MEDIAN_INCOME;
    const nationalMedianIncome = this.NATIONAL_MEDIAN_INCOME;
    
    // Calculate income index (Requirement 3.4)
    const incomeIndex = medianIncome / nationalMedianIncome;
    
    // Calculate economic score: population × (1 + growth_rate) × income_index (Requirement 3.4)
    const economicScore = population * (1 + growthRate / 100) * incomeIndex;
    
    // Classify growth trajectory (Requirement 4.1, 4.2)
    let growthTrajectory: 'high_growth' | 'moderate_growth' | 'stable' | 'declining';
    if (growthRate > 2.0) {
      growthTrajectory = 'high_growth';
    } else if (growthRate > 0) {
      growthTrajectory = 'moderate_growth';
    } else if (growthRate >= -0.5) {
      growthTrajectory = 'stable';
    } else {
      growthTrajectory = 'declining';
    }
    
    // Calculate data completeness
    const dataCompleteness = this.calculateDataCompleteness(data);
    
    return {
      population,
      populationGrowthRate: growthRate,
      medianIncome,
      nationalMedianIncome,
      incomeIndex,
      economicScore,
      growthTrajectory,
      dataCompleteness,
      dataSource: data.dataSource
    };
  }

  /**
   * Load demographic data for a specific location
   */
  private async loadDemographicDataForLocation(
    lat: number,
    lng: number
  ): Promise<DemographicRecord> {
    // For now, we'll estimate based on nearby stores and their population bands
    // In a full implementation, this would query actual demographic databases
    
    try {
      // Find nearby stores to estimate demographics
      const nearbyStores = await this.prisma.store.findMany({
        where: {
          latitude: {
            gte: lat - 0.1, // Roughly 11km radius
            lte: lat + 0.1
          },
          longitude: {
            gte: lng - 0.1,
            lte: lng + 0.1
          },
          cityPopulationBand: { not: null }
        },
        select: {
          latitude: true,
          longitude: true,
          cityPopulationBand: true,
          city: true,
          region: true
        }
      });

      // Estimate demographics based on nearby stores
      const populationBandValues: Record<string, number> = {
        'small': 75000,   // 50k-100k
        'medium': 300000, // 100k-500k
        'large': 750000   // >500k
      };

      let estimatedPopulation = 100000; // Default
      let estimatedGrowthRate = 1.0; // Default 1% growth
      let estimatedIncome = this.NATIONAL_MEDIAN_INCOME; // Default to national median

      if (nearbyStores.length > 0) {
        // Use population bands to estimate
        const validBands = nearbyStores
          .filter(s => s.cityPopulationBand)
          .map(s => populationBandValues[s.cityPopulationBand!] || 100000);

        if (validBands.length > 0) {
          estimatedPopulation = validBands.reduce((sum, pop) => sum + pop, 0) / validBands.length;
          
          // Estimate growth rate based on population band (larger cities tend to grow faster)
          if (estimatedPopulation > 500000) {
            estimatedGrowthRate = 1.5; // Large cities
          } else if (estimatedPopulation > 100000) {
            estimatedGrowthRate = 1.2; // Medium cities
          } else {
            estimatedGrowthRate = 0.8; // Small cities
          }
          
          // Estimate income based on population (rough correlation)
          estimatedIncome = this.NATIONAL_MEDIAN_INCOME * (0.8 + (estimatedPopulation / 1000000) * 0.4);
        }
      }

      return {
        lat,
        lng,
        population: Math.round(estimatedPopulation),
        populationGrowthRate: estimatedGrowthRate,
        medianIncome: Math.round(estimatedIncome),
        region: nearbyStores[0]?.region || 'unknown',
        municipality: nearbyStores[0]?.city || 'unknown',
        dataSource: 'estimated'
      };
      
    } catch (error) {
      console.error('Error loading demographic data for location:', error);
      
      // Return minimal fallback data
      return {
        lat,
        lng,
        population: 100000,
        populationGrowthRate: 1.0,
        medianIncome: this.NATIONAL_MEDIAN_INCOME,
        dataSource: 'estimated'
      };
    }
  }

  /**
   * Parse a CSV row into a demographic record
   */
  private parseCSVRow(headers: string[], values: string[]): DemographicRecord | null {
    try {
      const record: Partial<DemographicRecord> = {
        dataSource: 'csv'
      };

      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const value = values[i];

        switch (header) {
          case 'lat':
          case 'latitude':
            record.lat = parseFloat(value);
            break;
          case 'lng':
          case 'lon':
          case 'longitude':
            record.lng = parseFloat(value);
            break;
          case 'population':
            record.population = parseInt(value);
            break;
          case 'growth_rate':
          case 'population_growth_rate':
            record.populationGrowthRate = parseFloat(value);
            break;
          case 'median_income':
          case 'income':
            record.medianIncome = parseFloat(value);
            break;
          case 'region':
            record.region = value;
            break;
          case 'municipality':
          case 'city':
            record.municipality = value;
            break;
        }
      }

      // Validate required fields
      if (record.lat === undefined || record.lng === undefined) {
        return null;
      }

      return record as DemographicRecord;
      
    } catch (error) {
      console.error('Error parsing CSV row:', error);
      return null;
    }
  }

  /**
   * Calculate data completeness score
   */
  private calculateDataCompleteness(data: DemographicRecord): number {
    const fields = ['population', 'populationGrowthRate', 'medianIncome'];
    const presentFields = fields.filter(field => data[field as keyof DemographicRecord] !== undefined);
    return presentFields.length / fields.length;
  }

  /**
   * Get fallback indicators when data is unavailable
   */
  private getFallbackIndicators(): EconomicIndicators {
    return {
      population: 100000,
      populationGrowthRate: 1.0,
      medianIncome: this.NATIONAL_MEDIAN_INCOME,
      nationalMedianIncome: this.NATIONAL_MEDIAN_INCOME,
      incomeIndex: 1.0,
      economicScore: 101000, // 100k * 1.01 * 1.0
      growthTrajectory: 'moderate_growth',
      dataCompleteness: 0.1,
      dataSource: 'estimated'
    };
  }

  /**
   * Hash coordinate for cache key
   */
  private hashCoordinate(lat: number, lng: number): string {
    const rounded = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    return crypto.createHash('md5').update(rounded).digest('hex');
  }

  /**
   * Get cached economic indicators
   */
  private async getFromCache(hash: string): Promise<EconomicIndicators | null> {
    try {
      const cached = await this.prisma.$queryRaw<Array<{
        id: string;
        coordinateHash: string;
        population: number | null;
        populationGrowthRate: number | null;
        medianIncome: number | null;
        nationalMedianIncome: number | null;
        incomeIndex: number | null;
        dataSource: string;
        expiresAt: Date;
      }>>`
        SELECT id, coordinateHash, population, populationGrowthRate, medianIncome, 
               nationalMedianIncome, incomeIndex, dataSource, expiresAt
        FROM DemographicCache 
        WHERE coordinateHash = ${hash}
        LIMIT 1
      `;

      if (!cached || cached.length === 0) {
        return null;
      }

      const record = cached[0];
      if (record.expiresAt < new Date()) {
        await this.prisma.$executeRaw`DELETE FROM DemographicCache WHERE id = ${record.id}`;
        return null;
      }

      // Reconstruct economic indicators from cached data
      const population = record.population || 0;
      const growthRate = record.populationGrowthRate || 0;
      const medianIncome = record.medianIncome || this.NATIONAL_MEDIAN_INCOME;
      const nationalMedianIncome = record.nationalMedianIncome || this.NATIONAL_MEDIAN_INCOME;
      const incomeIndex = record.incomeIndex || 1.0;

      return {
        population,
        populationGrowthRate: growthRate,
        medianIncome,
        nationalMedianIncome,
        incomeIndex,
        economicScore: population * (1 + growthRate / 100) * incomeIndex,
        growthTrajectory: this.classifyGrowthTrajectory(growthRate),
        dataCompleteness: 0.8, // Cached data has good completeness
        dataSource: record.dataSource as 'csv' | 'api' | 'estimated'
      };
      
    } catch (error) {
      console.error('Error getting cached economic indicators:', error);
      return null;
    }
  }

  /**
   * Cache economic indicators
   */
  private async cacheEconomicIndicators(
    hash: string,
    lat: number,
    lng: number,
    indicators: EconomicIndicators
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.prisma.$executeRaw`
        INSERT INTO DemographicCache (
          id, coordinateHash, lat, lng, population, populationGrowthRate, 
          medianIncome, nationalMedianIncome, incomeIndex, dataSource, createdAt, expiresAt
        ) VALUES (
          ${crypto.randomUUID()}, ${hash}, ${lat}, ${lng}, ${indicators.population}, 
          ${indicators.populationGrowthRate}, ${indicators.medianIncome}, 
          ${indicators.nationalMedianIncome}, ${indicators.incomeIndex}, 
          ${indicators.dataSource}, ${new Date()}, ${expiresAt}
        )
      `;
      
    } catch (error) {
      console.error('Error caching economic indicators:', error);
    }
  }

  /**
   * Classify growth trajectory from growth rate
   */
  private classifyGrowthTrajectory(growthRate: number): 'high_growth' | 'moderate_growth' | 'stable' | 'declining' {
    if (growthRate > 2.0) {
      return 'high_growth';
    } else if (growthRate > 0) {
      return 'moderate_growth';
    } else if (growthRate >= -0.5) {
      return 'stable';
    } else {
      return 'declining';
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Validate demographic data completeness and freshness
   */
  validateData(records: DemographicRecord[]): ValidationResult {
    const errors: string[] = [];
    const missingFields: string[] = [];
    let completenessSum = 0;

    for (const record of records) {
      if (!record.lat || !record.lng) {
        errors.push('Missing required coordinates');
      }
      
      const completeness = this.calculateDataCompleteness(record);
      completenessSum += completeness;
      
      if (!record.population) missingFields.push('population');
      if (!record.populationGrowthRate) missingFields.push('populationGrowthRate');
      if (!record.medianIncome) missingFields.push('medianIncome');
    }

    const avgCompleteness = records.length > 0 ? completenessSum / records.length : 0;
    const uniqueMissingFields = [...new Set(missingFields)];

    return {
      isValid: errors.length === 0 && avgCompleteness > 0.5,
      completeness: avgCompleteness,
      missingFields: uniqueMissingFields,
      recordCount: records.length,
      errors
    };
  }
}