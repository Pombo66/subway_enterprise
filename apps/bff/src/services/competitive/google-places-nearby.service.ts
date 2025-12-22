import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

/**
 * Request interface for nearby competitor search
 */
export interface NearbyCompetitorsRequest {
  lat: number;
  lng: number;
  radiusKm: number;
  brands?: string[];
}

/**
 * Individual competitor result
 */
export interface CompetitorResult {
  brand: string;
  lat: number;
  lng: number;
  distanceM: number;
  placeName?: string;
}

/**
 * Summary statistics by brand
 */
export interface BrandSummary {
  count: number;
  nearestM: number | null;
}

/**
 * Full response from nearby competitors endpoint
 */
export interface NearbyCompetitorsResponse {
  center: { lat: number; lng: number };
  radiusKm: number;
  brands: string[];
  results: CompetitorResult[];
  summary: {
    total: number;
    byBrand: Record<string, BrandSummary>;
  };
  source: 'google_places';
  cached: boolean;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  response: NearbyCompetitorsResponse;
  timestamp: number;
  key: string;
}

/**
 * Google Places Nearby Service
 * 
 * On-demand competitor discovery using Google Places API.
 * Features:
 * - In-memory LRU cache with 30-minute TTL
 * - Deduplication of results (50m tolerance)
 * - Result limits (50 per brand, 250 total)
 * - Retry with exponential backoff
 * - No database persistence
 */
@Injectable()
export class GooglePlacesNearbyService {
  private readonly logger = new Logger(GooglePlacesNearbyService.name);
  
  // Cache configuration
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_MAX_SIZE = 100;
  
  // API configuration
  private readonly REQUEST_TIMEOUT_MS = 10000;
  private readonly MAX_RETRIES = 3;
  private readonly MAX_PER_BRAND = 50;
  private readonly MAX_TOTAL = 250;
  
  // Deduplication tolerance in meters
  private readonly DEDUP_TOLERANCE_M = 50;
  
  // Default brands to search
  private readonly DEFAULT_BRANDS = [
    "McDonald's",
    "Burger King", 
    "KFC",
    "Domino's",
    "Starbucks"
  ];
  
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY not configured - competitor nearby search will fail');
    } else {
      this.logger.log('Google Places Nearby Service initialized');
    }
  }

  /**
   * Get nearby competitors for a location
   */
  async getNearbyCompetitors(request: NearbyCompetitorsRequest): Promise<NearbyCompetitorsResponse> {
    const brands = request.brands?.length ? request.brands : this.DEFAULT_BRANDS;
    const cacheKey = this.generateCacheKey(request, brands);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return { ...cached, cached: true };
    }
    
    this.logger.log(`Fetching competitors for ${request.lat},${request.lng} radius ${request.radiusKm}km`);
    
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }
    
    const radiusM = request.radiusKm * 1000;
    const allResults: CompetitorResult[] = [];
    
    // Search for each brand
    for (const brand of brands) {
      try {
        const brandResults = await this.searchBrand(brand, request.lat, request.lng, radiusM);
        allResults.push(...brandResults);
        
        // Check if we've hit the total limit
        if (allResults.length >= this.MAX_TOTAL) {
          this.logger.warn(`Hit max total results (${this.MAX_TOTAL}), stopping brand searches`);
          break;
        }
      } catch (error) {
        this.logger.error(`Failed to search for brand ${brand}:`, error);
        // Continue with other brands on failure
      }
    }
    
    // Deduplicate results
    const dedupedResults = this.deduplicateResults(allResults);
    
    // Enforce total limit
    const limitedResults = dedupedResults.slice(0, this.MAX_TOTAL);
    
    // Build response
    const response: NearbyCompetitorsResponse = {
      center: { lat: request.lat, lng: request.lng },
      radiusKm: request.radiusKm,
      brands,
      results: limitedResults,
      summary: this.buildSummary(limitedResults, brands),
      source: 'google_places',
      cached: false
    };
    
    // Store in cache
    this.setInCache(cacheKey, response);
    
    this.logger.log(`Found ${limitedResults.length} competitors (${allResults.length} before dedup)`);
    
    return response;
  }

  /**
   * Search for a specific brand using Google Places API (New) - Text Search
   */
  private async searchBrand(
    brand: string, 
    lat: number, 
    lng: number, 
    radiusM: number
  ): Promise<CompetitorResult[]> {
    const results: CompetitorResult[] = [];
    let retries = 0;
    let lastError: Error | null = null;
    
    while (retries < this.MAX_RETRIES) {
      try {
        // Use Places API (New) - Text Search endpoint
        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          {
            textQuery: `${brand} restaurant`,
            locationBias: {
              circle: {
                center: {
                  latitude: lat,
                  longitude: lng
                },
                radius: radiusM
              }
            },
            maxResultCount: this.MAX_PER_BRAND
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress'
            },
            timeout: this.REQUEST_TIMEOUT_MS
          }
        );
        
        const places = response.data.places || [];
        
        if (places.length === 0) {
          return [];
        }
        
        for (const place of places) {
          if (results.length >= this.MAX_PER_BRAND) {
            break;
          }
          
          const placeLat = place.location?.latitude;
          const placeLng = place.location?.longitude;
          
          if (typeof placeLat !== 'number' || typeof placeLng !== 'number') {
            continue;
          }
          
          const distanceM = this.calculateDistance(lat, lng, placeLat, placeLng);
          
          // Only include results within the radius
          if (distanceM <= radiusM) {
            results.push({
              brand,
              lat: placeLat,
              lng: placeLng,
              distanceM: Math.round(distanceM),
              placeName: place.displayName?.text || place.formattedAddress
            });
          }
        }
        
        return results;
        
      } catch (error) {
        lastError = error as Error;
        retries++;
        
        if (error instanceof AxiosError) {
          // Log the actual error for debugging
          const errorMessage = error.response?.data?.error?.message || error.message;
          this.logger.error(`Places API error for ${brand}: ${errorMessage}`);
          
          if (error.response?.status === 429) {
            // Rate limited - don't retry
            throw new Error('Google Places API rate limit exceeded');
          }
        }
        
        if (retries < this.MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retries - 1) * 1000;
          this.logger.warn(`Retry ${retries}/${this.MAX_RETRIES} for ${brand} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError || new Error(`Failed to search for ${brand} after ${this.MAX_RETRIES} retries`);
  }

  /**
   * Deduplicate results based on location proximity (50m tolerance)
   */
  deduplicateResults(results: CompetitorResult[]): CompetitorResult[] {
    const unique: CompetitorResult[] = [];
    
    for (const result of results) {
      const isDuplicate = unique.some(existing => {
        const distance = this.calculateDistance(
          existing.lat, existing.lng,
          result.lat, result.lng
        );
        return distance < this.DEDUP_TOLERANCE_M;
      });
      
      if (!isDuplicate) {
        unique.push(result);
      }
    }
    
    return unique;
  }

  /**
   * Build summary statistics from results
   */
  buildSummary(results: CompetitorResult[], brands: string[]): NearbyCompetitorsResponse['summary'] {
    const byBrand: Record<string, BrandSummary> = {};
    
    // Initialize all brands with zero counts
    for (const brand of brands) {
      byBrand[brand] = { count: 0, nearestM: null };
    }
    
    // Count and find nearest for each brand
    for (const result of results) {
      if (!byBrand[result.brand]) {
        byBrand[result.brand] = { count: 0, nearestM: null };
      }
      
      byBrand[result.brand].count++;
      
      if (byBrand[result.brand].nearestM === null || result.distanceM < byBrand[result.brand].nearestM!) {
        byBrand[result.brand].nearestM = result.distanceM;
      }
    }
    
    return {
      total: results.length,
      byBrand
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(request: NearbyCompetitorsRequest, brands: string[]): string {
    // Round coordinates to ~100m precision for cache key
    const latKey = Math.round(request.lat * 1000) / 1000;
    const lngKey = Math.round(request.lng * 1000) / 1000;
    const brandsKey = [...brands].sort().join(',');
    return `${latKey}:${lngKey}:${request.radiusKm}:${brandsKey}`;
  }

  /**
   * Get entry from cache if valid
   */
  private getFromCache(key: string): NearbyCompetitorsResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.response;
  }

  /**
   * Store entry in cache with LRU eviction
   */
  private setInCache(key: string, response: NearbyCompetitorsResponse): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.CACHE_MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      key
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Get current cache size (for testing)
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Clear all cache entries (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
