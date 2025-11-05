// Nominatim (OpenStreetMap) geocoding provider
import { GeocodeResult, GeocodeErrorDetails } from '../types';
import { GeocodeProvider, GeocodeUtils } from './base';
import { ErrorHandler } from '../errors';
import smartImportConfig from '../config';

/**
 * Nominatim geocoding provider implementation
 * Uses OpenStreetMap's Nominatim service for geocoding
 */
export class NominatimProvider extends GeocodeProvider {
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor() {
    const config = smartImportConfig.geocoding.providers.nominatim;
    super('nominatim', config.rateLimit, smartImportConfig.geocoding.timeout);
    
    this.baseUrl = config.baseUrl;
    this.userAgent = config.userAgent;
  }

  /**
   * Geocode a single address using Nominatim
   */
  async geocode(address: string): Promise<GeocodeResult | GeocodeErrorDetails> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!address || !address.trim()) {
        return this.createError('Address is required', false);
      }

      const normalizedAddress = GeocodeUtils.normalizeAddress(address);
      
      // Build request URL
      const params = new URLSearchParams({
        q: normalizedAddress,
        format: 'json',
        limit: '1',
        addressdetails: '1',
        extratags: '1',
        namedetails: '1'
      });

      const url = `${this.baseUrl}/search?${params.toString()}`;
      
      // Create abort controller for timeout
      const controller = this.createAbortController();
      
      // Make request with proper headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en'
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
      
      // Handle empty results
      if (!Array.isArray(data) || data.length === 0) {
        this.logAttempt(address, false, Date.now() - startTime);
        return this.createError('No results found for address', false);
      }

      const result = data[0];
      
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

      // Determine precision
      const precision = GeocodeUtils.determinePrecision(result);

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
        context: 'NominatimProvider.geocode', 
        address,
        provider: this.name 
      });

      return this.handleHttpError(error, address);
    }
  }

  /**
   * Batch geocode multiple addresses
   * Note: Nominatim doesn't support batch requests, so we process sequentially
   */
  async batchGeocode(addresses: string[]): Promise<Array<GeocodeResult | GeocodeErrorDetails>> {
    const results: Array<GeocodeResult | GeocodeErrorDetails> = [];
    
    for (const address of addresses) {
      try {
        const result = await this.geocode(address);
        results.push(result);
        
        // Add small delay between requests to respect rate limits
        // This is handled by the rate limiter, but adding a small buffer
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        ErrorHandler.logError(error, { 
          context: 'NominatimProvider.batchGeocode', 
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
    return !!(this.baseUrl && this.userAgent);
  }

  /**
   * Get provider-specific configuration
   */
  getProviderConfig(): {
    baseUrl: string;
    userAgent: string;
    rateLimit: number;
    timeout: number;
  } {
    return {
      baseUrl: this.baseUrl,
      userAgent: this.userAgent,
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
      // Test with a simple, known address
      const testAddress = 'Berlin, Germany';
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
   * Get usage statistics (if available)
   * Note: Nominatim doesn't provide usage stats, so this returns basic info
   */
  getUsageStats(): {
    provider: string;
    requestsToday?: number;
    quotaLimit?: number;
    quotaRemaining?: number;
  } {
    return {
      provider: this.name,
      // Nominatim doesn't provide usage statistics
      requestsToday: undefined,
      quotaLimit: undefined,
      quotaRemaining: undefined
    };
  }
}

// Export default instance
export const nominatimProvider = new NominatimProvider();