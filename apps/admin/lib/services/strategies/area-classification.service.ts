import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as turf from '@turf/turf';

export interface AreaClassification {
  classification: 'urban' | 'suburban' | 'rural';
  populationDensity: number; // people per km²
  populationInRadius: number;
  confidence: number; // 0-1 based on data quality
}

export interface PopulationData {
  totalPopulation: number;
  areaKm2: number;
  density: number;
  dataSource: 'census' | 'estimated' | 'interpolated';
  confidence: number;
}

export class AreaClassificationService {
  private readonly URBAN_DENSITY_THRESHOLD = parseInt(
    process.env.EXPANSION_URBAN_DENSITY_THRESHOLD || '400'
  );
  private readonly SUBURBAN_DENSITY_THRESHOLD = parseInt(
    process.env.EXPANSION_SUBURBAN_DENSITY_THRESHOLD || '150'
  );
  private readonly CLASSIFICATION_RADIUS_KM = 5; // Radius for population analysis
  private readonly CACHE_TTL_DAYS = 90;
  
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private readonly prisma: PrismaClient) {
    console.log('🏘️ AreaClassificationService initialized with thresholds:', {
      urban: this.URBAN_DENSITY_THRESHOLD,
      suburban: this.SUBURBAN_DENSITY_THRESHOLD
    });
  }

  /**
   * Classify area as urban/suburban/rural based on population density
   */
  async classifyArea(lat: number, lng: number): Promise<AreaClassification> {
    const hash = this.hashCoordinate(lat, lng);
    const cached = await this.getFromCache(hash);
    
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;
    
    try {
      // Get population data within classification radius
      const populationData = await this.getPopulationData(lat, lng, this.CLASSIFICATION_RADIUS_KM);
      
      // Classify based on density thresholds
      let classification: 'urban' | 'suburban' | 'rural';
      if (populationData.density >= this.URBAN_DENSITY_THRESHOLD) {
        classification = 'urban';
      } else if (populationData.density >= this.SUBURBAN_DENSITY_THRESHOLD) {
        classification = 'suburban';
      } else {
        classification = 'rural';
      }
      
      const result: AreaClassification = {
        classification,
        populationDensity: populationData.density,
        populationInRadius: populationData.totalPopulation,
        confidence: populationData.confidence
      };
      
      await this.cacheResult(hash, lat, lng, result);
      return result;
      
    } catch (error) {
      console.error(`Area classification error for ${lat}, ${lng}:`, error);
      // Fallback to suburban classification with low confidence
      return {
        classification: 'suburban',
        populationDensity: 200, // Reasonable default
        populationInRadius: 0,
        confidence: 0.1
      };
    }
  }

  /**
   * Get population data for area analysis
   */
  private async getPopulationData(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<PopulationData> {
    // For now, we'll estimate population based on nearby stores and their population bands
    // In a full implementation, this would integrate with census data or demographic APIs
    
    try {
      // Find nearby stores within radius to estimate population
      const nearbyStores = await this.prisma.store.findMany({
        where: {
          latitude: {
            gte: lat - (radiusKm / 111), // Rough km to degree conversion
            lte: lat + (radiusKm / 111)
          },
          longitude: {
            gte: lng - (radiusKm / (111 * Math.cos(lat * Math.PI / 180))),
            lte: lng + (radiusKm / (111 * Math.cos(lat * Math.PI / 180)))
          },
          cityPopulationBand: { not: null }
        },
        select: {
          latitude: true,
          longitude: true,
          cityPopulationBand: true
        }
      });

      // Estimate population based on store population bands
      let estimatedPopulation = 0;
      let confidence = 0.5; // Medium confidence for estimation

      if (nearbyStores.length > 0) {
        // Use population bands to estimate
        const populationBandValues: Record<string, number> = {
          'small': 50000,   // <100k
          'medium': 300000, // 100k-500k
          'large': 750000   // >500k
        };

        // Take average of nearby store population bands
        const validBands = nearbyStores
          .filter(s => s.cityPopulationBand)
          .map(s => populationBandValues[s.cityPopulationBand!] || 100000);

        if (validBands.length > 0) {
          estimatedPopulation = validBands.reduce((sum, pop) => sum + pop, 0) / validBands.length;
          confidence = Math.min(0.8, 0.3 + (validBands.length * 0.1)); // Higher confidence with more data points
        }
      }

      // If no nearby stores, use very rough estimation
      if (estimatedPopulation === 0) {
        estimatedPopulation = 100000; // Default assumption
        confidence = 0.2; // Low confidence
      }

      // Calculate area and density
      const areaKm2 = Math.PI * radiusKm * radiusKm;
      const density = estimatedPopulation / areaKm2;

      return {
        totalPopulation: Math.round(estimatedPopulation),
        areaKm2,
        density: Math.round(density),
        dataSource: 'estimated',
        confidence
      };

    } catch (error) {
      console.error('Population data query error:', error);
      // Fallback values
      return {
        totalPopulation: 100000,
        areaKm2: Math.PI * radiusKm * radiusKm,
        density: 200,
        dataSource: 'estimated',
        confidence: 0.1
      };
    }
  }

  /**
   * Hash coordinate for cache key
   */
  private hashCoordinate(lat: number, lng: number): string {
    const rounded = `${lat.toFixed(3)},${lng.toFixed(3)}`; // Less precision for area classification
    return crypto.createHash('md5').update(rounded).digest('hex');
  }

  /**
   * Get cached classification result
   */
  private async getFromCache(hash: string): Promise<AreaClassification | null> {
    try {
      // Use raw query to access the DemographicCache table
      const cached = await this.prisma.$queryRaw<Array<{
        id: string;
        coordinateHash: string;
        lat: number;
        lng: number;
        population: number | null;
        areaClassification: string | null;
        expiresAt: Date;
      }>>`
        SELECT id, coordinateHash, lat, lng, population, areaClassification, expiresAt
        FROM DemographicCache 
        WHERE coordinateHash = ${hash}
        LIMIT 1
      `;

      if (!cached || cached.length === 0 || !cached[0].areaClassification) {
        return null;
      }

      const record = cached[0];
      if (record.expiresAt < new Date()) {
        await this.prisma.$executeRaw`DELETE FROM DemographicCache WHERE id = ${record.id}`;
        return null;
      }

      return {
        classification: record.areaClassification as 'urban' | 'suburban' | 'rural',
        populationDensity: record.population ? record.population / (Math.PI * this.CLASSIFICATION_RADIUS_KM * this.CLASSIFICATION_RADIUS_KM) : 0,
        populationInRadius: record.population || 0,
        confidence: 0.8 // Cached data has good confidence
      };
    } catch (error) {
      console.error('Area classification cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache classification result
   */
  private async cacheResult(
    hash: string,
    lat: number,
    lng: number,
    result: AreaClassification
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      // Use raw query to insert into DemographicCache table
      await this.prisma.$executeRaw`
        INSERT INTO DemographicCache (
          id, coordinateHash, lat, lng, population, areaClassification, dataSource, createdAt, expiresAt
        ) VALUES (
          ${crypto.randomUUID()}, ${hash}, ${lat}, ${lng}, ${Math.round(result.populationInRadius)}, 
          ${result.classification}, 'estimated', ${new Date()}, ${expiresAt}
        )
      `;
    } catch (error) {
      console.error('Area classification cache write error:', error);
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
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}