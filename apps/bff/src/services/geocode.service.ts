// Geocoding service for BFF
import { Injectable, Logger, Optional } from '@nestjs/common';
import { GeocodeRequestDto, GeocodeResponseDto, GeocodeResultDto, GeocodeProvider } from '../dto/geocode.dto';

// Import the geocoding functionality from admin lib
// Note: In a real implementation, this would be moved to a shared package
// For now, we'll create a simplified version that mirrors the admin implementation

interface GeocodeResult {
  lat: number;
  lng: number;
  precision: string;
  provider: string;
}

interface GeocodeErrorDetails {
  error: string;
  retryable: boolean;
  statusCode?: number;
  provider?: string;
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);

  /**
   * Process batch geocoding request
   */
  async batchGeocode(request: GeocodeRequestDto): Promise<GeocodeResponseDto> {
    const results: GeocodeResultDto[] = [];

    this.logger.log(`Processing batch geocode request for ${request.rows.length} rows`);

    for (const row of request.rows) {
      try {
        const result = await this.geocodeRow(row, request.providerPreference);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to geocode row ${row.id}:`, error);
        results.push({
          id: row.id,
          error: `Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return { results };
  }

  /**
   * Geocode a single row
   */
  private async geocodeRow(
    row: { id: string; address?: string; city?: string; postcode?: string; country: string },
    preferredProvider?: GeocodeProvider
  ): Promise<GeocodeResultDto> {
    // Build address string
    const addressParts = [row.address, row.city, row.postcode, row.country]
      .filter(part => part && part.trim());
    
    if (addressParts.length === 0) {
      return {
        id: row.id,
        error: 'No address components provided'
      };
    }

    const fullAddress = addressParts.join(', ');

    try {
      // Use the preferred provider or fall back to default
      const provider = preferredProvider || GeocodeProvider.NOMINATIM;
      const result = await this.callGeocodeProvider(fullAddress, provider);

      if ('lat' in result) {
        return {
          id: row.id,
          lat: result.lat,
          lng: result.lng,
          precision: result.precision,
          provider: result.provider as GeocodeProvider
        };
      } else {
        return {
          id: row.id,
          error: result.error
        };
      }
    } catch (error) {
      this.logger.error(`Geocoding error for row ${row.id}:`, error);
      return {
        id: row.id,
        error: `Geocoding service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Call the appropriate geocoding provider
   */
  private async callGeocodeProvider(
    address: string,
    provider: GeocodeProvider
  ): Promise<GeocodeResult | GeocodeErrorDetails> {
    switch (provider) {
      case GeocodeProvider.NOMINATIM:
        return this.callNominatim(address);
      case GeocodeProvider.GOOGLE:
        return this.callGoogleMaps(address);
      default:
        return {
          error: `Unsupported provider: ${provider}`,
          retryable: false
        };
    }
  }

  /**
   * Call Nominatim geocoding service
   */
  private async callNominatim(address: string): Promise<GeocodeResult | GeocodeErrorDetails> {
    const baseUrl = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
    const userAgent = process.env.NOMINATIM_USER_AGENT || 'SubwayEnterprise/1.0 (admin@subway.com)';
    
    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        addressdetails: '1'
      });

      const response = await fetch(`${baseUrl}/search?${params.toString()}`, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          error: `Nominatim API error: ${response.status}`,
          retryable: response.status >= 500 || response.status === 429,
          statusCode: response.status,
          provider: 'nominatim'
        };
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return {
          error: 'No results found',
          retryable: false,
          provider: 'nominatim'
        };
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      if (isNaN(lat) || isNaN(lng)) {
        return {
          error: 'Invalid coordinates in response',
          retryable: false,
          provider: 'nominatim'
        };
      }

      return {
        lat,
        lng,
        precision: this.determinePrecision(result),
        provider: 'nominatim'
      };

    } catch (error) {
      this.logger.error('Nominatim geocoding error:', error);
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true,
        provider: 'nominatim'
      };
    }
  }

  /**
   * Call Google Maps geocoding service
   */
  private async callGoogleMaps(address: string): Promise<GeocodeResult | GeocodeErrorDetails> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return {
        error: 'Google Maps API key not configured',
        retryable: false,
        provider: 'google'
      };
    }

    try {
      const params = new URLSearchParams({
        address,
        key: apiKey,
        language: 'en'
      });

      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);

      if (!response.ok) {
        return {
          error: `Google Maps API error: ${response.status}`,
          retryable: response.status >= 500 || response.status === 429,
          statusCode: response.status,
          provider: 'google'
        };
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        const retryable = ['OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT', 'UNKNOWN_ERROR'].includes(data.status);
        return {
          error: `Google Maps error: ${data.status}`,
          retryable,
          provider: 'google'
        };
      }

      if (!data.results || data.results.length === 0) {
        return {
          error: 'No results found',
          retryable: false,
          provider: 'google'
        };
      }

      const result = data.results[0];
      const location = result.geometry?.location;

      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return {
          error: 'Invalid coordinates in response',
          retryable: false,
          provider: 'google'
        };
      }

      return {
        lat: location.lat,
        lng: location.lng,
        precision: this.determineGooglePrecision(result),
        provider: 'google'
      };

    } catch (error) {
      this.logger.error('Google Maps geocoding error:', error);
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true,
        provider: 'google'
      };
    }
  }

  /**
   * Determine precision from Nominatim result
   */
  private determinePrecision(result: any): string {
    const type = result.type;
    const osm_type = result.osm_type;

    if (osm_type === 'node' && ['house', 'building'].includes(type)) return 'exact';
    if (type === 'road') return 'street';
    if (['suburb', 'neighbourhood', 'quarter'].includes(type)) return 'neighborhood';
    if (['city', 'town', 'village'].includes(type)) return 'city';
    if (type === 'postcode') return 'postal';
    if (['state', 'province'].includes(type)) return 'region';
    if (type === 'country') return 'country';

    return 'approximate';
  }

  /**
   * Determine precision from Google Maps result
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
        return 'approximate';
    }
  }

  /**
   * Test geocoding provider connectivity
   */
  async testProvider(provider: GeocodeProvider): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    const testAddress = provider === GeocodeProvider.GOOGLE ? 
      'Times Square, New York, NY, USA' : 
      'Berlin, Germany';

    try {
      const result = await this.callGeocodeProvider(testAddress, provider);
      const responseTime = Date.now() - startTime;

      if ('lat' in result) {
        return {
          success: true,
          message: 'Provider test successful',
          responseTime
        };
      } else {
        return {
          success: false,
          message: `Provider test failed: ${result.error}`,
          responseTime
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Provider test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime
      };
    }
  }
}