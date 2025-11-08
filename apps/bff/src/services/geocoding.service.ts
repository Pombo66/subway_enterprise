import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface GeocodeResult {
  storeId: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  success: boolean;
  error?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  private readonly GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Geocode all stores with missing coordinates
   */
  async geocodeMissingStores(country?: string): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: GeocodeResult[];
  }> {
    if (!this.MAPBOX_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN not configured');
    }

    this.logger.log('Finding stores with missing coordinates...');

    // Find stores with null coordinates
    const where: any = {
      OR: [
        { latitude: null },
        { longitude: null }
      ]
    };

    if (country) {
      where.country = country;
    }

    const stores = await this.prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        region: true,
        country: true,
        postcode: true
      }
    });

    this.logger.log(`Found ${stores.length} stores with missing coordinates`);

    if (stores.length === 0) {
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }

    const results: GeocodeResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;
    const DELAY_MS = 1000; // 1 second between batches

    for (let i = 0; i < stores.length; i += BATCH_SIZE) {
      const batch = stores.slice(i, i + BATCH_SIZE);
      
      this.logger.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(stores.length / BATCH_SIZE)}`);

      const batchPromises = batch.map(store => this.geocodeStore(store));
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      // Count successes and failures
      batchResults.forEach(result => {
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      });

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < stores.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    this.logger.log(`Geocoding complete: ${successful} successful, ${failed} failed`);

    return {
      processed: stores.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Geocode a single store
   */
  private async geocodeStore(store: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    postcode: string | null;
  }): Promise<GeocodeResult> {
    try {
      // Build search query
      const addressParts = [
        store.address,
        store.city,
        store.region,
        store.postcode,
        store.country
      ].filter(Boolean);

      if (addressParts.length === 0) {
        return {
          storeId: store.id,
          address: store.name,
          latitude: null,
          longitude: null,
          success: false,
          error: 'No address information available'
        };
      }

      const searchQuery = addressParts.join(', ');

      // Call Mapbox Geocoding API
      const url = new URL(`${this.GEOCODING_API}/${encodeURIComponent(searchQuery)}.json`);
      url.searchParams.set('access_token', this.MAPBOX_TOKEN!);
      url.searchParams.set('limit', '1');
      
      // Scope to country for better accuracy
      if (store.country) {
        url.searchParams.set('country', this.getCountryCode(store.country));
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return {
          storeId: store.id,
          address: searchQuery,
          latitude: null,
          longitude: null,
          success: false,
          error: 'No geocoding results found'
        };
      }

      const [longitude, latitude] = data.features[0].center;

      // Update store in database
      await this.prisma.store.update({
        where: { id: store.id },
        data: {
          latitude,
          longitude
        }
      });

      this.logger.log(`✅ Geocoded: ${store.name} -> ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

      return {
        storeId: store.id,
        address: searchQuery,
        latitude,
        longitude,
        success: true
      };

    } catch (error) {
      this.logger.error(`❌ Failed to geocode ${store.name}:`, error);

      return {
        storeId: store.id,
        address: store.address || store.name,
        latitude: null,
        longitude: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert country name to ISO 3166-1 alpha-2 code
   */
  private getCountryCode(country: string): string {
    const countryMap: Record<string, string> = {
      'Germany': 'DE',
      'United States': 'US',
      'United Kingdom': 'GB',
      'France': 'FR',
      'Spain': 'ES',
      'Italy': 'IT',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Austria': 'AT',
      'Switzerland': 'CH',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Denmark': 'DK',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Finland': 'FI'
    };

    return countryMap[country] || country.substring(0, 2).toUpperCase();
  }

  /**
   * Get count of stores with missing coordinates
   */
  async getMissingCoordinatesCount(country?: string): Promise<number> {
    const where: any = {
      OR: [
        { latitude: null },
        { longitude: null }
      ]
    };

    if (country) {
      where.country = country;
    }

    return this.prisma.store.count({ where });
  }
}
