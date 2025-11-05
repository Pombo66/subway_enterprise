// Google Maps geocoding provider
import { GeocodeResult, GeocodeErrorDetails } from '../types';
import { GeocodeProvider, GeocodeUtils } from './base';
import { ErrorHandler } from '../errors';
import smartImportConfig from '../config';

/**
 * Google Maps geocoding provider implementation
 */
export class GoogleMapsProvider extends GeocodeProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor() {
    const config = smartImportConfig.geocoding.providers.google;
    super('google', config.rateLimit, smartImportConfig.geocoding.timeout);
    
    this.apiKey = config.apiKey || '';
  }

  /**
   * Geocode a single address using Google Maps Geocoding API
   */
  async geocode(address: string): Promise<GeocodeResult | GeocodeErrorDetails> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      if (!this.apiKey) {
        return this.createError('Google Maps API key not configured', false);
      }

      // Validate input
      if (!address || !address.trim()) {
        return this.createError('Address is required', false);
      }

      const normalizedAddress = GeocodeUtils.normalizeAddress(address);
      
      // Build request URL
      const params = new URLSearchParams({
        address: normalizedAddress,
        key: this.apiKey,
        language: 'en',
        region: 'us' // Can be made configurable
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      // Create abort controller for timeout
      const controller = this.createAbortController();
      
      // Make request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SubwayEnterprise/1.0'
        },
        signal: controller.signal
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return this.handleHttpError({
          response: { status: response.status },
          message: errorText
        }, address);
      }

      // Parse response
      const data = await response.json();
      
      // Handle API errors
      if (data.status !== 'OK') {
        this.logAttempt(address, false, Date.now() - startTime);
        return this.handleGoogleApiError(data.status, data.error_message, address);
      }

      // Handle empty results
      if (!data.results || data.results.length === 0) {
        this.logAttempt(address, false, Date.now() - startTime);
        return this.createError('No results found for address', false);
      }

      const result = data.results[0];
      
      // Extract coordinates
      const coordinates = GeocodeUtils.extractCoordinates(result);
      if (!coordinates) {
        this.logAttempt(address, false, Date.now() - startTime);
        return this.createError('Invalid coordinates in response', false);
      }

      // Validate coordinates
      if (!this.validateResult(coordinates)) {
        this.logAttempt(address, false, Date.now() - startTime);
        return this.createError('Invalid coordinate values', false);
      }

      // Determine precision from Google's location_type
      const precision = this.determineGooglePrecision(result);

      this.logAttempt(address, true, Date.now() - startTime);

      return {
        lat: coordinates.lat,
        lng: coordinates.lng,
        precision,
        provider: this.name
      };

    } catch (error: any) {
      this.logAttempt(address, false, Date.now() - startTime);
      
      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        return this.createError('Request timeout', true);
      }

      ErrorHandler.logError(error, { 
        context: 'GoogleMapsProvider.geocode', 
        address,
        provider: this.name 
      });

      return this.handleHttpError(error, address);
    }
  }

  /**
   * Handle Google Maps API specific errors
   */
  private handleGoogleApiError(status: string, errorMessage?: string, address?: string): GeocodeErrorDetails {
    switch (status) {
      case 'ZERO_RESULTS':
        return this.createError('No results found for address', false);
      
      case 'OVER_DAILY_LIMIT':
      case 'OVER_QUERY_LIMIT':
        return this.createError('API quota exceeded', true);
      
      case 'REQUEST_DENIED':
        return this.createError(`API request denied: ${errorMessage || 'Invalid API key or permissions'}`, false);
      
      case 'INVALID_REQUEST':
        return this.createError(`Invalid request: ${errorMessage || 'Missing required parameters'}`, false);
      
      case 'UNKNOWN_ERROR':
        return this.createError('Server error occurred', true);
      
      default:
        return this.createError(`API error: ${status} - ${errorMessage || 'Unknown error'}`, false);
    }
  }

  /**
   * Determine precision from Google Maps location_type
   */
  private determineGooglePrecision(result: any): string {
    const locationType = result.geometry?.location_type;
    
    switch (locationType) {
      case 'ROOFTOP':
        return 'exact';
      case 'RANGE_INTERPOLATED':
        return 'interpolated';
      case 'GEOMETRIC_CENTER':
        return 'geometric_center';
      case 'APPROXIMATE':
        return 'approximate';
      default:
        // Fall back to type-based precision
        return GeocodeUtils.determinePrecision(result);
    }
  }

  /**
   * Batch geocode multiple addresses
   * Note: Google Maps doesn't support batch requests in the standard API,
   * so we process sequentially with rate limiting
   */
  async batchGeocode(addresses: string[]): Promise<Array<GeocodeResult | GeocodeErrorDetails>> {
    const results: Array<GeocodeResult | GeocodeErrorDetails> = [];
    
    for (const address of addresses) {
      try {
        const result = await this.geocode(address);
        results.push(result);
        
        // Small delay between requests (handled by rate limiter, but adding buffer)
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        ErrorHandler.logError(error, { 
          context: 'GoogleMapsProvider.batchGeocode', 
          address,
          provider: this.name 
        });
        
        results.push(this.createError(`Batch geocoding failed: ${error}`, false));
      }
    }
    
    return results;
  }

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Get provider-specific configuration
   */
  getProviderConfig(): {
    hasApiKey: boolean;
    baseUrl: string;
    rateLimit: number;
    timeout: number;
  } {
    return {
      hasApiKey: !!this.apiKey,
      baseUrl: this.baseUrl,
      rateLimit: this.rateLimit,
      timeout: this.timeout
    };
  }

  /**
   * Test the provider connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        return {
          success: false,
          message: 'Google Maps API key not configured'
        };
      }

      // Test with a simple, known address
      const testAddress = 'Times Square, New York, NY, USA';
      const result = await this.geocode(testAddress);
      
      const responseTime = Date.now() - startTime;
      
      if ('lat' in result && 'lng' in result) {
        return {
          success: true,
          message: 'Connection successful',
          responseTime
        };
      } else {
        return {
          success: false,
          message: `Test failed: ${result.error}`,
          responseTime
        };
      }
      
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get usage statistics from Google Maps API
   * Note: This would require additional API calls to get quota information
   */
  getUsageStats(): {
    provider: string;
    requestsToday?: number;
    quotaLimit?: number;
    quotaRemaining?: number;
  } {
    return {
      provider: this.name,
      // Google Maps API doesn't provide easy access to usage stats
      // Would need to implement quota tracking separately
      requestsToday: undefined,
      quotaLimit: undefined,
      quotaRemaining: undefined
    };
  }

  /**
   * Estimate cost per request (for budgeting purposes)
   * Based on Google Maps Geocoding API pricing
   */
  getEstimatedCostPerRequest(): number {
    // As of 2024, Google Maps Geocoding API costs $5 per 1000 requests
    // This is an approximation and should be updated based on current pricing
    return 0.005; // $0.005 per request
  }

  /**
   * Get supported features
   */
  getSupportedFeatures(): {
    batchGeocoding: boolean;
    reverseGeocoding: boolean;
    addressValidation: boolean;
    placeDetails: boolean;
  } {
    return {
      batchGeocoding: false, // Not supported in standard API
      reverseGeocoding: true, // Could be implemented
      addressValidation: true, // Available through Address Validation API
      placeDetails: true // Available through Places API
    };
  }
}

// Export default instance
export const googleMapsProvider = new GoogleMapsProvider();