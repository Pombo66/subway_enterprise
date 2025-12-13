import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export interface MapboxCompetitorRequest {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  brands?: string[];
}

export interface MapboxCompetitorResult {
  id: string;
  name: string;
  brand: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
}

@Injectable()
export class MapboxCompetitorsService {
  private mapboxToken: string;

  // Top QSR competitors for Subway
  private readonly QSR_COMPETITORS = [
    'McDonald\'s',
    'KFC', 
    'Burger King',
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
    'Jimmy John\'s',
    'Panera Bread',
    'Arby\'s',
    'Sonic',
    'Jack in the Box'
  ];

  constructor(private prisma: PrismaClient) {
    this.mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!this.mapboxToken) {
      console.warn('NEXT_PUBLIC_MAPBOX_TOKEN not configured - competitor data will be limited');
    }
  }

  async getCompetitorsNearLocation(request: MapboxCompetitorRequest): Promise<MapboxCompetitorResult[]> {
    if (!this.mapboxToken) {
      console.warn('Mapbox token not configured');
      return [];
    }

    try {
      const radius = request.radiusMeters || 2000; // Default 2km radius
      
      // Use Mapbox Tilequery API to find POIs
      const response = await axios.get(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${request.longitude},${request.latitude}.json`,
        {
          params: {
            radius: Math.min(radius, 5000), // Max 5km for performance
            layers: 'poi_label', // Points of interest layer
            limit: 50, // Max results
            access_token: this.mapboxToken,
          },
        }
      );

      if (!response.data?.features) {
        console.log('No POI features found in Mapbox response');
        return [];
      }

      const competitors: MapboxCompetitorResult[] = [];
      
      for (const feature of response.data.features) {
        const properties = feature.properties || {};
        const name = properties.name || properties.name_en || '';
        
        if (!name) continue;

        // Check if this is a QSR competitor
        const brand = this.extractBrand(name);
        if (!brand) continue;

        const category = this.categorizeCompetitor(brand);
        const coordinates = feature.geometry?.coordinates;
        
        if (!coordinates || coordinates.length < 2) continue;

        competitors.push({
          id: `mapbox-${feature.id || Math.random()}`,
          name,
          brand,
          category,
          longitude: coordinates[0],
          latitude: coordinates[1],
          address: properties.address || undefined,
        });
      }

      console.log(`🗺️ Found ${competitors.length} QSR competitors via Mapbox Tilequery`);
      return competitors;

    } catch (error) {
      console.error('Mapbox Tilequery error:', error);
      return [];
    }
  }

  async refreshCompetitors(request: MapboxCompetitorRequest): Promise<{
    found: number;
    added: number;
    updated: number;
  }> {
    const competitors = await this.getCompetitorsNearLocation(request);
    let added = 0;
    let updated = 0;

    for (const competitor of competitors) {
      // Check if competitor already exists
      const existing = await this.prisma.competitorPlace.findFirst({
        where: {
          brand: competitor.brand,
          latitude: {
            gte: competitor.latitude - 0.001, // ~100m tolerance
            lte: competitor.latitude + 0.001,
          },
          longitude: {
            gte: competitor.longitude - 0.001,
            lte: competitor.longitude + 0.001,
          },
        },
      });

      if (existing) {
        // Update existing
        await this.prisma.competitorPlace.update({
          where: { id: existing.id },
          data: {
            name: competitor.name,
            address: competitor.address,
            lastVerified: new Date(),
            sources: JSON.stringify(['mapbox']),
          },
        });
        updated++;
      } else {
        // Create new
        await this.prisma.competitorPlace.create({
          data: {
            name: competitor.name,
            brand: competitor.brand,
            category: competitor.category,
            latitude: competitor.latitude,
            longitude: competitor.longitude,
            address: competitor.address,
            sources: JSON.stringify(['mapbox']),
            reliabilityScore: 0.8, // Good reliability for Mapbox data
          },
        });
        added++;
      }
    }

    return {
      found: competitors.length,
      added,
      updated,
    };
  }

  private extractBrand(name: string): string | null {
    const nameLower = name.toLowerCase();
    
    for (const brand of this.QSR_COMPETITORS) {
      if (nameLower.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    
    return null; // Not a recognized QSR competitor
  }

  private categorizeCompetitor(brand: string): string {
    const brandLower = brand.toLowerCase();
    
    // QSR chains
    if (['mcdonald\'s', 'burger king', 'wendy\'s', 'kfc', 'chick-fil-a', 'popeyes'].includes(brandLower)) {
      return 'qsr';
    }
    
    // Pizza
    if (['pizza hut', 'domino\'s', 'papa john\'s'].includes(brandLower)) {
      return 'pizza';
    }
    
    // Coffee
    if (['starbucks', 'dunkin\''].includes(brandLower)) {
      return 'coffee';
    }
    
    // Sandwich/Sub competitors (direct Subway competitors)
    if (['jimmy john\'s', 'panera bread'].includes(brandLower)) {
      return 'sandwich';
    }
    
    // Mexican/Tex-Mex
    if (['taco bell', 'chipotle'].includes(brandLower)) {
      return 'mexican';
    }
    
    // Default to QSR
    return 'qsr';
  }
}