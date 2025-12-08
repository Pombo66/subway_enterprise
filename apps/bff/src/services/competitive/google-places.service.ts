import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export interface PlaceSearchRequest {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  categories?: string[]; // e.g., ['restaurant', 'cafe']
  brands?: string[]; // e.g., ['McDonald\'s', 'KFC']
}

export interface PlaceResult {
  googlePlaceId: string;
  name: string;
  brand: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  postcode?: string;
  phoneNumber?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
}

@Injectable()
export class GooglePlacesService {
  private apiKey: string;

  constructor(private prisma: PrismaClient) {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GOOGLE_PLACES_API_KEY not configured - competitor refresh will be limited');
    }
  }

  async searchNearby(request: PlaceSearchRequest): Promise<PlaceResult[]> {
    if (!this.apiKey) {
      console.warn('Google Places API key not configured');
      return [];
    }

    try {
      // Use Google Places Nearby Search API
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: {
            location: `${request.latitude},${request.longitude}`,
            radius: request.radiusMeters,
            type: 'restaurant', // Focus on restaurants
            key: this.apiKey,
          },
        }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', response.data.status);
        return [];
      }

      const places = response.data.results || [];
      const results: PlaceResult[] = [];

      for (const place of places) {
        // Extract brand from name (simple heuristic)
        const brand = this.extractBrand(place.name);
        const category = this.categorizePlace(place);

        // Filter by brands if specified
        if (request.brands && request.brands.length > 0) {
          if (!request.brands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
            continue;
          }
        }

        results.push({
          googlePlaceId: place.place_id,
          name: place.name,
          brand,
          category,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          address: place.vicinity,
          rating: place.rating,
          reviewCount: place.user_ratings_total,
          priceLevel: place.price_level,
        });
      }

      return results;
    } catch (error) {
      console.error('Google Places search error:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: placeId,
            fields: 'name,formatted_address,geometry,rating,user_ratings_total,price_level,formatted_phone_number,website',
            key: this.apiKey,
          },
        }
      );

      if (response.data.status === 'OK') {
        return response.data.result;
      }

      return null;
    } catch (error) {
      console.error('Google Places details error:', error);
      return null;
    }
  }

  async refreshCompetitors(request: PlaceSearchRequest): Promise<{
    found: number;
    added: number;
    updated: number;
  }> {
    const places = await this.searchNearby(request);
    let added = 0;
    let updated = 0;

    for (const place of places) {
      // Check if competitor already exists
      const existing = await this.prisma.competitorPlace.findUnique({
        where: { googlePlaceId: place.googlePlaceId },
      });

      if (existing) {
        // Update existing
        await this.prisma.competitorPlace.update({
          where: { id: existing.id },
          data: {
            name: place.name,
            brand: place.brand,
            category: place.category,
            latitude: place.latitude,
            longitude: place.longitude,
            address: place.address,
            rating: place.rating,
            reviewCount: place.reviewCount,
            priceLevel: place.priceLevel,
            lastVerified: new Date(),
            sources: JSON.stringify(['google']),
          },
        });
        updated++;
      } else {
        // Create new
        await this.prisma.competitorPlace.create({
          data: {
            googlePlaceId: place.googlePlaceId,
            name: place.name,
            brand: place.brand,
            category: place.category,
            latitude: place.latitude,
            longitude: place.longitude,
            address: place.address,
            rating: place.rating,
            reviewCount: place.reviewCount,
            priceLevel: place.priceLevel,
            sources: JSON.stringify(['google']),
          },
        });
        added++;
      }
    }

    return {
      found: places.length,
      added,
      updated,
    };
  }

  private extractBrand(name: string): string {
    // Common QSR brands
    const brands = [
      'McDonald\'s',
      'KFC',
      'Burger King',
      'Subway',
      'Wendy\'s',
      'Taco Bell',
      'Pizza Hut',
      'Domino\'s',
      'Papa John\'s',
      'Starbucks',
      'Dunkin\'',
      'Chipotle',
      'Five Guys',
      'Shake Shack',
      'Chick-fil-A',
      'Popeyes',
      'Arby\'s',
      'Sonic',
      'Jack in the Box',
      'Carl\'s Jr',
      'Hardee\'s',
      'Panda Express',
      'Panera Bread',
      'Jimmy John\'s',
      'Firehouse Subs',
      'Jersey Mike\'s',
    ];

    for (const brand of brands) {
      if (name.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }

    // If no match, use the name itself
    return name.split(' ')[0]; // First word as brand
  }

  private categorizePlace(place: any): string {
    const name = place.name.toLowerCase();
    const types = place.types || [];

    // QSR chains
    if (
      name.includes('mcdonald') ||
      name.includes('burger king') ||
      name.includes('wendy') ||
      name.includes('kfc') ||
      name.includes('taco bell')
    ) {
      return 'qsr';
    }

    // Pizza
    if (
      name.includes('pizza') ||
      name.includes('domino') ||
      name.includes('papa john')
    ) {
      return 'pizza';
    }

    // Coffee
    if (
      name.includes('starbucks') ||
      name.includes('coffee') ||
      name.includes('dunkin') ||
      types.includes('cafe')
    ) {
      return 'coffee';
    }

    // Sandwich
    if (
      name.includes('subway') ||
      name.includes('sandwich') ||
      name.includes('jimmy john') ||
      name.includes('firehouse')
    ) {
      return 'sandwich';
    }

    // Default
    return 'restaurant';
  }
}
