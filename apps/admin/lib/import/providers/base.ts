// Base geocoding provider interface and utilities
import { GeocodeResult, GeocodeErrorDetails, GeocodeProvider as GeocodeProviderType } from '../types';
import { GeocodeError, NetworkError, RateLimitError, ErrorHandler } from '../errors';

/**
 * Abstract base class for geocoding providers
 */
export abstract class GeocodeProvider {
  protected readonly name: GeocodeProviderType;
  protected readonly rateLimit: number;
  protected readonly timeout: number;

  constructor(name: GeocodeProviderType, rateLimit: number, timeout: number = 10000) {
    this.name = name;
    this.rateLimit = rateLimit;
    this.timeout = timeout;
  }

  /**
   * Geocode a single address
   */
  abstract geocode(address: string): Promise<GeocodeResult | GeocodeErrorDetails>;

  /**
   * Get provider name
   */
  getName(): GeocodeProviderType {
    return this.name;
  }

  /**
   * Get rate limit (requests per second)
   */
  getRateLimit(): number {
    return this.rateLimit;
  }

  /**
   * Get timeout in milliseconds
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Format address components into a geocodable string
   */
  protected formatAddress(components: {
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
  }): string {
    const parts = [
      components.address,
      components.city,
      components.postcode,
      components.country
    ].filter(part => part && part.trim());

    return parts.join(', ');
  }

  /**
   * Validate address components
   */
  protected validateAddressComponents(components: {
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
  }): boolean {
    // At minimum, we need city and country, or address and country
    const hasCity = components.city && components.city.trim();
    const hasAddress = components.address && components.address.trim();
    const hasCountry = components.country && components.country.trim();

    return hasCountry && (hasCity || hasAddress);
  }

  /**
   * Create standardized error response
   */
  protected createError(
    message: string, 
    retryable: boolean = false, 
    statusCode?: number
  ): GeocodeErrorDetails {
    return {
      error: message,
      retryable,
      statusCode,
      provider: this.name
    };
  }

  /**
   * Handle HTTP errors consistently
   */
  protected handleHttpError(error: any, address?: string): GeocodeErrorDetails {
    const statusCode = error.response?.status || error.status || 0;
    
    // Rate limiting
    if (statusCode === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      return this.createError(
        `Rate limit exceeded${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
        true,
        429
      );
    }
    
    // Server errors (retryable)
    if (statusCode >= 500) {
      return this.createError(
        `Server error: ${error.message}`,
        true,
        statusCode
      );
    }
    
    // Client errors (usually not retryable)
    if (statusCode >= 400) {
      return this.createError(
        `Client error: ${error.message}`,
        false,
        statusCode
      );
    }
    
    // Network errors (retryable)
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.message?.includes('timeout')) {
      return this.createError(
        `Network error: ${error.message}`,
        true
      );
    }
    
    // Unknown errors (not retryable by default)
    return this.createError(
      `Geocoding failed: ${error.message}`,
      false
    );
  }

  /**
   * Validate geocoding result
   */
  protected validateResult(result: any): boolean {
    return (
      result &&
      typeof result.lat === 'number' &&
      typeof result.lng === 'number' &&
      !isNaN(result.lat) &&
      !isNaN(result.lng) &&
      result.lat >= -90 &&
      result.lat <= 90 &&
      result.lng >= -180 &&
      result.lng <= 180
    );
  }

  /**
   * Create AbortController for timeout handling
   */
  protected createAbortController(): AbortController {
    const controller = new AbortController();
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);
    
    // Clear timeout when request completes
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
    
    return controller;
  }

  /**
   * Log geocoding attempt for debugging
   */
  protected logAttempt(address: string, success: boolean, duration?: number): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] Geocode ${success ? 'SUCCESS' : 'FAILED'}: "${address}"${duration ? ` (${duration}ms)` : ''}`);
    }
  }
}

/**
 * Utility functions for geocoding providers
 */
export class GeocodeUtils {
  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
   * Normalize address string for better geocoding results
   */
  static normalizeAddress(address: string): string {
    return address
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s,.-]/g, '') // Remove special characters except common ones
      .replace(/\b(str|street|st)\b/gi, 'Street') // Normalize street abbreviations
      .replace(/\b(ave|avenue)\b/gi, 'Avenue')
      .replace(/\b(rd|road)\b/gi, 'Road')
      .replace(/\b(dr|drive)\b/gi, 'Drive')
      .replace(/\b(ln|lane)\b/gi, 'Lane')
      .replace(/\b(blvd|boulevard)\b/gi, 'Boulevard');
  }

  /**
   * Extract coordinates from various response formats
   */
  static extractCoordinates(response: any): { lat: number; lng: number } | null {
    // Handle different response formats
    if (response.lat && response.lng) {
      return { lat: parseFloat(response.lat), lng: parseFloat(response.lng) };
    }
    
    if (response.latitude && response.longitude) {
      return { lat: parseFloat(response.latitude), lng: parseFloat(response.longitude) };
    }
    
    if (response.geometry?.location) {
      const loc = response.geometry.location;
      return { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
    }
    
    if (response.center && Array.isArray(response.center) && response.center.length === 2) {
      return { lat: parseFloat(response.center[1]), lng: parseFloat(response.center[0]) };
    }
    
    return null;
  }

  /**
   * Determine precision level from geocoding response
   */
  static determinePrecision(response: any): string {
    // Nominatim class mapping
    const nominatimClass = response.class;
    const nominatimType = response.type;
    
    if (nominatimClass === 'place' && nominatimType === 'house') return 'exact';
    if (nominatimClass === 'highway') return 'street';
    if (nominatimClass === 'place' && ['suburb', 'neighbourhood'].includes(nominatimType)) return 'neighborhood';
    if (nominatimClass === 'place' && nominatimType === 'city') return 'city';
    if (nominatimClass === 'place' && nominatimType === 'postcode') return 'postal';
    
    // Google Maps type mapping
    const googleTypes = response.types || [];
    if (googleTypes.includes('street_address')) return 'exact';
    if (googleTypes.includes('route')) return 'street';
    if (googleTypes.includes('neighborhood')) return 'neighborhood';
    if (googleTypes.includes('locality')) return 'city';
    if (googleTypes.includes('postal_code')) return 'postal';
    if (googleTypes.includes('administrative_area_level_1')) return 'region';
    if (googleTypes.includes('country')) return 'country';
    
    // Default precision
    return 'approximate';
  }
}