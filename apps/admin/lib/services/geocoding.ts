import { GeocodeRequest, GeocodeResult } from '../validation/store-upload';
import { GeocodingError, ERROR_CODES, ErrorLogger } from '../errors/upload-errors';
import { getGeocodingConfig } from '../config/upload-config';

// Provider interfaces
interface MapboxResponse {
  features: Array<{
    center: [number, number]; // [lng, lat]
    place_name: string;
    relevance: number;
  }>;
}

interface GoogleResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  }>;
  status: string;
}

interface NominatimResponse extends Array<{
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}> {}

export class GeocodingService {
  private config = getGeocodingConfig();
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly maxRetries = 1; // Reduced from 3 to 1 to avoid long timeouts
  private readonly retryDelayMs = 500; // Reduced from 1000 to 500ms

  /**
   * Geocode a single address using provider fallback
   */
  async geocodeAddress(request: GeocodeRequest): Promise<GeocodeResult> {
    const addressQuery = this.buildAddressQuery(request);
    console.log(`🌍 Geocoding request:`, {
      address: addressQuery,
      components: request
    });
    
    const providers = this.getAvailableProviders();
    
    if (providers.length === 0) {
      console.error('❌ No geocoding providers available');
      ErrorLogger.logWarning('No geocoding providers available');
      return {
        provider: 'nominatim',
        status: 'failed',
        error: 'No geocoding providers configured'
      };
    }

    console.log(`🔄 Available providers: ${providers.join(', ')}`);
    let attemptCount = 0;

    // Try each provider in order with retry logic
    for (const provider of providers) {
      let retryCount = 0;
      
      while (retryCount < this.maxRetries) {
        try {
          attemptCount++;
          const retryInfo = retryCount > 0 ? ` (retry ${retryCount}/${this.maxRetries - 1})` : '';
          console.log(`🔄 Attempt ${attemptCount}: Trying ${provider}${retryInfo} for "${addressQuery}"`);
          
          await this.throttleRequest();
          
          let result: GeocodeResult;
          
          switch (provider) {
            case 'mapbox':
              result = await this.geocodeWithMapbox(request);
              break;
            case 'google':
              result = await this.geocodeWithGoogle(request);
              break;
            case 'nominatim':
              result = await this.geocodeWithNominatim(request);
              break;
            default:
              continue;
          }
          
          if (result.status === 'success') {
            console.log(`✅ Geocoding successful with ${provider}${retryInfo}:`, {
              address: addressQuery,
              coordinates: { lat: result.latitude, lng: result.longitude },
              accuracy: result.accuracy
            });
            return result;
          }
          
          // If no results found, don't retry - move to next provider
          if (result.error?.includes('No results') || result.error?.includes('not found')) {
            console.warn(`⚠️ ${provider} found no results for "${addressQuery}" - skipping retries`);
            ErrorLogger.logWarning(`Geocoding failed with ${provider}`, { request, result });
            break; // Break retry loop, move to next provider
          }
          
          // For other errors, retry with exponential backoff
          retryCount++;
          if (retryCount < this.maxRetries) {
            const delayMs = this.retryDelayMs * Math.pow(2, retryCount - 1);
            console.log(`⏳ Retrying ${provider} in ${delayMs}ms...`);
            await this.delay(delayMs);
          } else {
            console.warn(`⚠️ ${provider} failed after ${this.maxRetries} attempts for "${addressQuery}"`);
            ErrorLogger.logWarning(`Geocoding failed with ${provider} after retries`, { request, result });
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ ${provider} error for "${addressQuery}":`, errorMessage);
          
          retryCount++;
          if (retryCount < this.maxRetries) {
            const delayMs = this.retryDelayMs * Math.pow(2, retryCount - 1);
            console.log(`⏳ Retrying ${provider} after error in ${delayMs}ms...`);
            await this.delay(delayMs);
          } else {
            ErrorLogger.logError(
              new GeocodingError(`${provider} geocoding failed after ${this.maxRetries} attempts: ${errorMessage}`),
              { request, provider }
            );
            break; // Break retry loop, move to next provider
          }
        }
      }
    }
    
    // All providers failed
    console.error(`❌ All providers failed for "${addressQuery}" after ${attemptCount} attempts`);
    return {
      provider: providers[providers.length - 1] as any,
      status: 'failed',
      error: `All ${providers.length} provider(s) failed after ${attemptCount} attempts`
    };
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(requests: GeocodeRequest[]): Promise<GeocodeResult[]> {
    console.log(`🌍 Starting batch geocoding for ${requests.length} addresses`);
    const results: GeocodeResult[] = [];
    
    // Determine batch size based on available providers
    const providers = this.getAvailableProviders();
    const hasCommercialProvider = providers.includes('mapbox') || providers.includes('google');
    
    // Use larger batches and shorter delays for commercial providers
    const batchSize = hasCommercialProvider ? 10 : 5; // 10 for commercial, 5 for Nominatim
    const batchDelay = hasCommercialProvider ? 100 : 1000; // 100ms for commercial, 1s for Nominatim
    
    const totalBatches = Math.ceil(requests.length / batchSize);
    console.log(`📊 Using batch size: ${batchSize}, delay: ${batchDelay}ms (providers: ${providers.join(', ')})`);
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = requests.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} addresses)`);
      
      // Process batch in parallel
      const batchPromises = batch.map((request, index) => 
        this.geocodeAddress(request).catch(error => {
          console.error(`❌ Batch geocoding error for address ${i + index + 1}:`, error);
          ErrorLogger.logError(error, { request });
          return {
            provider: 'nominatim' as const,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract results from settled promises
      let batchSuccessCount = 0;
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.status === 'success') {
            batchSuccessCount++;
          }
        } else {
          console.error(`❌ Promise rejected in batch ${batchNumber}:`, result.reason);
          results.push({
            provider: 'nominatim',
            status: 'failed',
            error: 'Promise rejected'
          });
        }
      }
      
      console.log(`✅ Batch ${batchNumber} complete: ${batchSuccessCount}/${batch.length} successful`);
      
      // Add delay between batches if there are more to process
      if (i + batchSize < requests.length) {
        await this.delay(batchDelay);
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    console.log(`🎉 Batch geocoding complete: ${successCount}/${requests.length} successful, ${failedCount} failed`);
    
    // Log provider usage statistics
    const providerStats = results.reduce((acc, result) => {
      if (result.status === 'success' && result.provider) {
        acc[result.provider] = (acc[result.provider] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    console.log(`📊 Provider usage:`, providerStats);
    
    return results;
  }

  /**
   * Geocode using Mapbox API
   */
  private async geocodeWithMapbox(request: GeocodeRequest): Promise<GeocodeResult> {
    if (!this.config.mapboxToken) {
      throw new GeocodingError('Mapbox token not configured');
    }

    const query = this.buildAddressQuery(request);
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${this.config.mapboxToken}&limit=1`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new GeocodingError(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data: MapboxResponse = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return {
        provider: 'mapbox',
        status: 'failed'
      };
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;

    return {
      latitude,
      longitude,
      accuracy: feature.relevance >= 0.8 ? 'high' : feature.relevance >= 0.5 ? 'medium' : 'low',
      provider: 'mapbox',
      status: 'success',
      raw: feature
    };
  }

  /**
   * Geocode using Google Maps API
   */
  private async geocodeWithGoogle(request: GeocodeRequest): Promise<GeocodeResult> {
    if (!this.config.googleMapsApiKey) {
      throw new GeocodingError('Google Maps API key not configured');
    }

    const query = this.buildAddressQuery(request);
    const encodedQuery = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${this.config.googleMapsApiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new GeocodingError(`Google Maps API error: ${response.status} ${response.statusText}`);
    }

    const data: GoogleResponse = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        provider: 'google',
        status: 'failed'
      };
    }

    const result = data.results[0];
    const { lat: latitude, lng: longitude } = result.geometry.location;

    return {
      latitude,
      longitude,
      accuracy: 'high', // Google generally provides high accuracy
      provider: 'google',
      status: 'success',
      raw: result
    };
  }

  /**
   * Geocode using Nominatim (OpenStreetMap)
   */
  private async geocodeWithNominatim(request: GeocodeRequest): Promise<GeocodeResult> {
    const query = this.buildAddressQuery(request);
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`;

    console.log(`🔍 Nominatim request: ${url.substring(0, 100)}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.config.userAgent
      }
    });
    
    if (!response.ok) {
      const error = `Nominatim API error: ${response.status} ${response.statusText}`;
      console.error(`❌ ${error}`);
      throw new GeocodingError(error);
    }

    const data: NominatimResponse = await response.json();
    
    if (!data || data.length === 0) {
      console.warn(`⚠️ Nominatim returned no results for: ${query}`);
      return {
        provider: 'nominatim',
        status: 'failed',
        error: 'No results found'
      };
    }

    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error(`❌ Nominatim returned invalid coordinates: lat=${result.lat}, lon=${result.lon}`);
      return {
        provider: 'nominatim',
        status: 'failed',
        error: 'Invalid coordinates in response'
      };
    }

    console.log(`✅ Nominatim success: (${latitude}, ${longitude}) importance=${result.importance}`);

    return {
      latitude,
      longitude,
      accuracy: result.importance >= 0.7 ? 'high' : result.importance >= 0.4 ? 'medium' : 'low',
      provider: 'nominatim',
      status: 'success',
      raw: result
    };
  }

  /**
   * Build address query string
   */
  private buildAddressQuery(request: GeocodeRequest): string {
    const parts = [request.address, request.city];
    
    if (request.postcode) {
      parts.push(request.postcode);
    }
    
    parts.push(request.country);
    
    return parts.filter(part => part && part.trim()).join(', ');
  }

  /**
   * Get available geocoding providers based on configuration
   */
  private getAvailableProviders(): string[] {
    const providers: string[] = [];
    
    if (this.config.mapboxToken) {
      providers.push('mapbox');
    }
    
    if (this.config.googleMapsApiKey) {
      providers.push('google');
    }
    
    if (this.config.enableNominatim) {
      providers.push('nominatim');
    }
    
    return providers;
  }

  /**
   * Throttle requests to respect rate limits
   */
  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Use shorter interval for commercial providers, longer for Nominatim
    const providers = this.getAvailableProviders();
    const hasCommercialProvider = providers.includes('mapbox') || providers.includes('google');
    const minInterval = hasCommercialProvider ? 100 : 1200; // 100ms for commercial, 1.2s for Nominatim
    
    if (timeSinceLastRequest < minInterval) {
      await this.delay(minInterval - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate coordinates
   */
  static validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Normalize address components
   */
  static normalizeAddress(request: GeocodeRequest): GeocodeRequest {
    return {
      address: request.address.trim(),
      city: request.city.trim(),
      postcode: request.postcode?.trim(),
      country: request.country.trim()
    };
  }

  /**
   * Get geocoding statistics
   */
  getStats(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}