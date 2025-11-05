import { CountryBounds, BasicLocation, RegionFilter } from '../interfaces/expansion.interface';

/**
 * Shared utility functions for expansion services
 */
export class ExpansionUtils {
  private static readonly COUNTRY_BOUNDS: Record<string, CountryBounds> = {
    'Germany': { north: 55.0, south: 47.0, east: 16.0, west: 5.0 },
    'Netherlands': { north: 53.7, south: 50.7, east: 7.3, west: 3.3 },
    'Belgium': { north: 51.5, south: 49.5, east: 6.4, west: 2.5 },
    'France': { north: 51.1, south: 41.3, east: 9.6, west: -5.1 },
    'United Kingdom': { north: 60.9, south: 49.9, east: 1.8, west: -8.6 },
    'Spain': { north: 43.8, south: 35.2, east: 4.3, west: -9.3 },
    'Italy': { north: 47.1, south: 35.5, east: 18.5, west: 6.6 }
  };

  /**
   * Get geographic bounds for a country
   */
  static getCountryBounds(country: string): CountryBounds {
    return this.COUNTRY_BOUNDS[country] || this.COUNTRY_BOUNDS['Germany'];
  }

  /**
   * Calculate target count based on aggression level
   */
  static calculateTargetCount(aggression: number): number {
    if (aggression <= 20) return 50;
    if (aggression <= 40) return 100;
    if (aggression <= 60) return 150;
    if (aggression <= 80) return 200;
    return 300;
  }

  /**
   * Generate basic fallback locations within country bounds
   */
  static generateBasicLocations(count: number, region: RegionFilter): BasicLocation[] {
    const locations: BasicLocation[] = [];
    const countryBounds = this.getCountryBounds(region.country || 'Germany');
    
    for (let i = 0; i < count; i++) {
      const lat = countryBounds.south + Math.random() * (countryBounds.north - countryBounds.south);
      const lng = countryBounds.west + Math.random() * (countryBounds.east - countryBounds.west);
      
      locations.push({
        lat,
        lng,
        name: `Basic Location ${i + 1}`,
        confidence: 0.3 + Math.random() * 0.4
      });
    }
    
    return locations;
  }

  /**
   * Validate region filter parameters
   */
  static validateRegionFilter(region: RegionFilter): boolean {
    if (!region) return false;
    
    // At least one filter must be specified
    return !!(region.country || region.state || region.city);
  }

  /**
   * Normalize country name for consistent lookup
   */
  static normalizeCountryName(country: string): string {
    const normalized = country.trim();
    
    // Handle common variations
    const variations: Record<string, string> = {
      'DE': 'Germany',
      'Deutschland': 'Germany',
      'NL': 'Netherlands',
      'Nederland': 'Netherlands',
      'BE': 'Belgium',
      'België': 'Belgium',
      'Belgique': 'Belgium',
      'FR': 'France',
      'UK': 'United Kingdom',
      'GB': 'United Kingdom',
      'ES': 'Spain',
      'España': 'Spain',
      'IT': 'Italy',
      'Italia': 'Italy'
    };

    return variations[normalized] || normalized;
  }

  /**
   * Calculate distance between two points in kilometers
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if a point is within country bounds
   */
  static isWithinCountryBounds(lat: number, lng: number, country: string): boolean {
    const bounds = this.getCountryBounds(country);
    
    return lat >= bounds.south && 
           lat <= bounds.north && 
           lng >= bounds.west && 
           lng <= bounds.east;
  }

  /**
   * Generate unique cache key for expansion parameters
   */
  static generateCacheKey(params: any): string {
    const keyData = {
      region: params.region,
      aggression: params.aggression,
      targetCount: params.targetCount,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 60)) // Hour-based cache
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Estimate processing time based on parameters
   */
  static estimateProcessingTime(params: any): number {
    const baseTime = 5000; // 5 seconds base
    const targetCount = params.targetCount || this.calculateTargetCount(params.aggression);
    const aiMultiplier = params.enableAIRationale ? 3 : 1;
    
    return baseTime + (targetCount * 100 * aiMultiplier);
  }

  /**
   * Format region display name
   */
  static formatRegionName(region: RegionFilter): string {
    const parts: string[] = [];
    
    if (region.city) parts.push(region.city);
    if (region.state) parts.push(region.state);
    if (region.country) parts.push(this.normalizeCountryName(region.country));
    
    return parts.join(', ') || 'Unknown Region';
  }
}