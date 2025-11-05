import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

export interface OSMFeature {
  id: string;
  type: 'node' | 'way' | 'relation';
  lat: number;
  lon: number;
  tags: Record<string, string>;
  name?: string;
  amenity?: string;
  shop?: string;
  highway?: string;
  railway?: string;
  public_transport?: string;
  landuse?: string;
}

export interface OSMResponse {
  version: number;
  generator: string;
  elements: OSMFeature[];
}

export interface RateLimiter {
  canMakeRequest(): boolean;
  recordRequest(): void;
  getStats(): { requestCount: number; lastRequest: Date | null };
}

export class SimpleRateLimiter implements RateLimiter {
  private requestCount = 0;
  private lastRequest: Date | null = null;
  private readonly requestsPerSecond: number;

  constructor(requestsPerSecond: number) {
    this.requestsPerSecond = requestsPerSecond;
  }

  canMakeRequest(): boolean {
    if (!this.lastRequest) {
      return true;
    }

    const timeSinceLastRequest = Date.now() - this.lastRequest.getTime();
    const minInterval = 1000 / this.requestsPerSecond; // milliseconds between requests

    return timeSinceLastRequest >= minInterval;
  }

  recordRequest(): void {
    this.requestCount++;
    this.lastRequest = new Date();
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequest: this.lastRequest
    };
  }
}

export class OverpassAPI {
  private readonly client: AxiosInstance;
  private readonly rateLimiter: RateLimiter;
  private readonly OVERPASS_URL: string;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(overpassUrl: string, rateLimitPerSec: number = 1) {
    this.OVERPASS_URL = overpassUrl;
    this.rateLimiter = new SimpleRateLimiter(rateLimitPerSec);
    
    this.client = axios.create({
      baseURL: this.OVERPASS_URL,
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'SubwayEnterprise/1.0 (expansion-analysis)',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log(`🗺️ OverpassAPI initialized with URL: ${this.OVERPASS_URL}, rate limit: ${rateLimitPerSec} req/sec`);
  }

  /**
   * Execute Overpass QL query with rate limiting and retry logic
   * Implements requirement 16.1, 16.4 for API integration and rate limiting
   */
  async query(overpassQL: string): Promise<OSMResponse> {
    return this.executeWithRetry(overpassQL);
  }

  /**
   * Build query for POI types near location
   * Implements requirement 16.2 for POI querying
   */
  buildPOIQuery(
    lat: number,
    lng: number,
    radius: number,
    poiTypes: string[]
  ): string {
    const bbox = this.calculateBoundingBox(lat, lng, radius);
    
    // Build Overpass QL query for multiple POI types
    let query = '[out:json][timeout:25];\n(\n';
    
    for (const poiType of poiTypes) {
      switch (poiType) {
        case 'transport':
          query += `  node["railway"="station"](${bbox});\n`;
          query += `  node["public_transport"="station"](${bbox});\n`;
          query += `  node["amenity"="bus_station"](${bbox});\n`;
          break;
        case 'education':
          query += `  node["amenity"="university"](${bbox});\n`;
          query += `  node["amenity"="college"](${bbox});\n`;
          query += `  node["amenity"="school"](${bbox});\n`;
          break;
        case 'retail':
          query += `  node["shop"="mall"](${bbox});\n`;
          query += `  node["shop"="supermarket"](${bbox});\n`;
          query += `  node["landuse"="retail"](${bbox});\n`;
          break;
        case 'service':
          query += `  node["highway"="services"](${bbox});\n`;
          query += `  node["amenity"="fuel"](${bbox});\n`;
          break;
      }
    }
    
    query += ');\nout geom;';
    
    return query;
  }

  /**
   * Handle rate limiting and retries with exponential backoff
   * Implements requirement 16.4 for API rate limiting and error handling
   */
  private async executeWithRetry(overpassQL: string, attempt: number = 1): Promise<OSMResponse> {
    try {
      // Wait for rate limiter
      while (!this.rateLimiter.canMakeRequest()) {
        await this.sleep(100); // Wait 100ms and check again
      }

      this.rateLimiter.recordRequest();
      
      console.log(`🗺️ Executing Overpass query (attempt ${attempt}/${this.MAX_RETRIES})`);
      
      const response: AxiosResponse<OSMResponse> = await this.client.post('', `data=${encodeURIComponent(overpassQL)}`);
      
      if (!response.data || !response.data.elements) {
        throw new Error('Invalid response format from Overpass API');
      }

      console.log(`✅ Overpass query successful: ${response.data.elements.length} features found`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Overpass query failed (attempt ${attempt}):`, error);
      
      if (attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.executeWithRetry(overpassQL, attempt + 1);
      }
      
      throw new Error(`Overpass API failed after ${this.MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate bounding box for radius around point
   */
  private calculateBoundingBox(lat: number, lng: number, radiusMeters: number): string {
    // Convert radius from meters to degrees (rough approximation)
    const radiusDegrees = radiusMeters / 111000; // 1 degree ≈ 111km
    
    const south = lat - radiusDegrees;
    const north = lat + radiusDegrees;
    const west = lng - radiusDegrees / Math.cos(lat * Math.PI / 180);
    const east = lng + radiusDegrees / Math.cos(lat * Math.PI / 180);
    
    return `${south},${west},${north},${east}`;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats() {
    return this.rateLimiter.getStats();
  }
}

export class OSMQueryService {
  private readonly overpassAPI: OverpassAPI;
  private readonly cache: Map<string, OSMFeature[]> = new Map();
  private readonly CACHE_TTL_DAYS = 30;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    private readonly prisma: PrismaClient,
    overpassUrl: string = 'https://overpass-api.de/api/interpreter',
    rateLimitPerSec: number = 1
  ) {
    this.overpassAPI = new OverpassAPI(overpassUrl, rateLimitPerSec);
    console.log('🗺️ OSMQueryService initialized');
  }

  /**
   * Query OSM for specific POI types near location
   * Implements requirement 16.2 for POI querying with caching
   */
  async queryPOIs(
    lat: number,
    lng: number,
    radius: number,
    poiTypes: string[]
  ): Promise<OSMFeature[]> {
    const cacheKey = this.generateCacheKey(lat, lng, radius, poiTypes);
    
    try {
      // Try cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.cacheHits++;
        return cached;
      }

      this.cacheMisses++;

      // Build and execute query
      const query = this.overpassAPI.buildPOIQuery(lat, lng, radius, poiTypes);
      const response = await this.overpassAPI.query(query);
      
      // Process and normalize features
      const features = this.processOSMResponse(response);
      
      // Cache the results
      await this.cacheResults(cacheKey, lat, lng, radius, poiTypes, features);
      
      return features;
      
    } catch (error) {
      console.error(`Error querying POIs for ${lat}, ${lng}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get transport hubs (stations, terminals, stops)
   * Implements requirements 5.1, 5.2, 5.3 for transport hub queries
   */
  async getTransportHubs(
    lat: number,
    lng: number,
    radius: number
  ): Promise<OSMFeature[]> {
    return this.queryPOIs(lat, lng, radius, ['transport']);
  }

  /**
   * Get educational institutions
   * Implements requirements 6.1, 6.2 for educational institution queries
   */
  async getEducationalInstitutions(
    lat: number,
    lng: number,
    radius: number
  ): Promise<OSMFeature[]> {
    return this.queryPOIs(lat, lng, radius, ['education']);
  }

  /**
   * Get retail centers and shopping areas
   * Implements requirements 7.1, 7.2, 7.3 for retail center queries
   */
  async getRetailCenters(
    lat: number,
    lng: number,
    radius: number
  ): Promise<OSMFeature[]> {
    return this.queryPOIs(lat, lng, radius, ['retail']);
  }

  /**
   * Get service stations and motorway services
   * Implements requirements 8.1, 8.2 for service station queries
   */
  async getServiceStations(
    lat: number,
    lng: number,
    radius: number
  ): Promise<OSMFeature[]> {
    return this.queryPOIs(lat, lng, radius, ['service']);
  }

  /**
   * Process OSM response and normalize features
   */
  private processOSMResponse(response: OSMResponse): OSMFeature[] {
    return response.elements.map(element => ({
      id: element.id,
      type: element.type,
      lat: element.lat,
      lon: element.lon,
      tags: element.tags || {},
      name: element.tags?.name,
      amenity: element.tags?.amenity,
      shop: element.tags?.shop,
      highway: element.tags?.highway,
      railway: element.tags?.railway,
      public_transport: element.tags?.public_transport,
      landuse: element.tags?.landuse
    }));
  }

  /**
   * Generate cache key for query parameters
   */
  private generateCacheKey(lat: number, lng: number, radius: number, poiTypes: string[]): string {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radius},${poiTypes.sort().join(',')}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get cached results
   */
  private async getFromCache(cacheKey: string): Promise<OSMFeature[] | null> {
    try {
      const cached = await this.prisma.$queryRaw<Array<{
        id: string;
        coordinateHash: string;
        features: string;
        featureCount: number;
        expiresAt: Date;
      }>>`
        SELECT id, coordinateHash, features, featureCount, expiresAt
        FROM OSMPOICache 
        WHERE coordinateHash = ${cacheKey}
        LIMIT 1
      `;

      if (!cached || cached.length === 0) {
        return null;
      }

      const record = cached[0];
      if (record.expiresAt < new Date()) {
        await this.prisma.$executeRaw`DELETE FROM OSMPOICache WHERE id = ${record.id}`;
        return null;
      }

      // Parse cached features
      const features = JSON.parse(record.features) as OSMFeature[];
      console.log(`🎯 Cache hit: ${features.length} POI features from cache`);
      return features;
      
    } catch (error) {
      console.error('Error getting cached OSM data:', error);
      return null;
    }
  }

  /**
   * Cache query results
   */
  private async cacheResults(
    cacheKey: string,
    lat: number,
    lng: number,
    radius: number,
    poiTypes: string[],
    features: OSMFeature[]
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.prisma.$executeRaw`
        INSERT INTO OSMPOICache (
          id, coordinateHash, lat, lng, radius, poiType, features, featureCount, createdAt, expiresAt
        ) VALUES (
          ${crypto.randomUUID()}, ${cacheKey}, ${lat}, ${lng}, ${radius}, 
          ${poiTypes.join(',')}, ${JSON.stringify(features)}, ${features.length}, 
          ${new Date()}, ${expiresAt}
        )
      `;
      
      console.log(`💾 Cached ${features.length} POI features for ${this.CACHE_TTL_DAYS} days`);
      
    } catch (error) {
      console.error('Error caching OSM results:', error);
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
      hitRate: Math.round(hitRate * 100) / 100,
      rateLimiterStats: this.overpassAPI.getRateLimiterStats()
    };
  }
}