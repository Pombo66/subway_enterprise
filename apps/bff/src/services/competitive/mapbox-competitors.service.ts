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

  // Top QSR competitors for Subway - expanded list with variations
  private readonly QSR_COMPETITORS = [
    'McDonald\'s', 'McDonalds', 'Mcdonald',
    'KFC', 'Kentucky Fried Chicken',
    'Burger King', 'BurgerKing',
    'Wendy\'s', 'Wendys',
    'Taco Bell', 'TacoBell',
    'Pizza Hut', 'PizzaHut',
    'Domino\'s', 'Dominos', 'Domino',
    'Papa John\'s', 'Papa Johns', 'PapaJohns',
    'Starbucks',
    'Dunkin\'', 'Dunkin', 'Dunkin Donuts',
    'Chipotle',
    'Five Guys', 'FiveGuys',
    'Shake Shack', 'ShakeShack',
    'Chick-fil-A', 'Chickfila', 'Chick fil A',
    'Popeyes', 'Popeye\'s',
    'Jimmy John\'s', 'Jimmy Johns',
    'Panera Bread', 'Panera',
    'Arby\'s', 'Arbys',
    'Sonic', 'Sonic Drive-In',
    'Jack in the Box',
    // European chains
    'Nordsee',
    'Vapiano',
    'Hans im Glück',
    'Peter Pane',
    'L\'Osteria', 'Losteria',
    'Dean & David', 'Dean and David',
    'Backwerk',
    'Ditsch',
  ];

  // Normalized brand names for consistent storage
  private readonly BRAND_NORMALIZATION: Record<string, string> = {
    'mcdonalds': 'McDonald\'s',
    'mcdonald': 'McDonald\'s',
    'kentucky fried chicken': 'KFC',
    'burgerking': 'Burger King',
    'wendys': 'Wendy\'s',
    'tacobell': 'Taco Bell',
    'pizzahut': 'Pizza Hut',
    'dominos': 'Domino\'s',
    'domino': 'Domino\'s',
    'papa johns': 'Papa John\'s',
    'papajohns': 'Papa John\'s',
    'dunkin': 'Dunkin\'',
    'dunkin donuts': 'Dunkin\'',
    'fiveguys': 'Five Guys',
    'shakeshack': 'Shake Shack',
    'chickfila': 'Chick-fil-A',
    'chick fil a': 'Chick-fil-A',
    'popeye\'s': 'Popeyes',
    'jimmy johns': 'Jimmy John\'s',
    'panera': 'Panera Bread',
    'arbys': 'Arby\'s',
    'sonic drive-in': 'Sonic',
    'losteria': 'L\'Osteria',
    'dean and david': 'Dean & David',
  };

  constructor(private prisma: PrismaClient) {
    // Try multiple Mapbox token environment variables (backend should use MAPBOX_ACCESS_TOKEN)
    this.mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || 
                       process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 
                       process.env.MAPBOX_SECRET_TOKEN || '';
    if (!this.mapboxToken) {
      console.warn('Mapbox token not configured - tried MAPBOX_ACCESS_TOKEN, NEXT_PUBLIC_MAPBOX_TOKEN, MAPBOX_SECRET_TOKEN');
    } else {
      console.log('🗺️ Mapbox token configured for competitor intelligence');
    }
  }

  async getCompetitorsNearLocation(request: MapboxCompetitorRequest): Promise<MapboxCompetitorResult[]> {
    if (!this.mapboxToken) {
      console.warn('Mapbox token not configured');
      return [];
    }

    try {
      const radius = request.radiusMeters || 2000; // Default 2km radius
      const allCompetitors: MapboxCompetitorResult[] = [];
      
      // Query multiple points in a grid pattern to cover more area
      // This helps because Tilequery has a 5km max radius
      const gridPoints = this.generateGridPoints(request.latitude, request.longitude, radius);
      
      console.log(`🗺️ Querying ${gridPoints.length} points for competitors...`);
      
      for (const point of gridPoints) {
        const competitors = await this.queryTilequery(point.lat, point.lng, Math.min(radius, 5000));
        allCompetitors.push(...competitors);
      }
      
      // Deduplicate by location (within ~50m)
      const uniqueCompetitors = this.deduplicateCompetitors(allCompetitors);
      
      console.log(`🗺️ Found ${uniqueCompetitors.length} unique QSR competitors via Mapbox Tilequery (from ${allCompetitors.length} total)`);
      return uniqueCompetitors;

    } catch (error) {
      console.error('Mapbox Tilequery error:', error);
      return [];
    }
  }

  private generateGridPoints(centerLat: number, centerLng: number, radiusMeters: number): Array<{lat: number, lng: number}> {
    const points: Array<{lat: number, lng: number}> = [];
    
    // Always include center point
    points.push({ lat: centerLat, lng: centerLng });
    
    // For larger radii, add surrounding points
    if (radiusMeters > 2000) {
      const offsetDegrees = radiusMeters / 111000 * 0.5; // Half the radius in degrees
      
      // Add 4 cardinal points
      points.push({ lat: centerLat + offsetDegrees, lng: centerLng }); // North
      points.push({ lat: centerLat - offsetDegrees, lng: centerLng }); // South
      points.push({ lat: centerLat, lng: centerLng + offsetDegrees }); // East
      points.push({ lat: centerLat, lng: centerLng - offsetDegrees }); // West
    }
    
    return points;
  }

  private async queryTilequery(lat: number, lng: number, radius: number): Promise<MapboxCompetitorResult[]> {
    try {
      // Use Mapbox Tilequery API to find POIs
      const response = await axios.get(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json`,
        {
          params: {
            radius: Math.min(radius, 5000), // Max 5km for Tilequery
            layers: 'poi_label', // Points of interest layer
            limit: 50, // Max results per query
            access_token: this.mapboxToken,
          },
        }
      );

      if (!response.data?.features) {
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
          id: `mapbox-${feature.id || `${coordinates[0]}-${coordinates[1]}`}`,
          name,
          brand,
          category,
          longitude: coordinates[0],
          latitude: coordinates[1],
          address: properties.address || undefined,
        });
      }

      return competitors;
    } catch (error) {
      console.error(`Tilequery error at ${lat},${lng}:`, error);
      return [];
    }
  }

  private deduplicateCompetitors(competitors: MapboxCompetitorResult[]): MapboxCompetitorResult[] {
    const seen = new Map<string, MapboxCompetitorResult>();
    
    for (const competitor of competitors) {
      // Create a key based on brand and approximate location (~50m precision)
      const latKey = Math.round(competitor.latitude * 2000) / 2000;
      const lngKey = Math.round(competitor.longitude * 2000) / 2000;
      const key = `${competitor.brand}-${latKey}-${lngKey}`;
      
      if (!seen.has(key)) {
        seen.set(key, competitor);
      }
    }
    
    return Array.from(seen.values());
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
        // Normalize the brand name
        return this.normalizeBrand(brand);
      }
    }
    
    return null; // Not a recognized QSR competitor
  }

  private normalizeBrand(brand: string): string {
    const brandLower = brand.toLowerCase();
    return this.BRAND_NORMALIZATION[brandLower] || brand;
  }

  private categorizeCompetitor(brand: string): string {
    const brandLower = brand.toLowerCase();
    
    // QSR chains
    if (['mcdonald\'s', 'burger king', 'wendy\'s', 'kfc', 'chick-fil-a', 'popeyes', 'five guys', 'shake shack', 'sonic', 'arby\'s', 'jack in the box'].includes(brandLower)) {
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

    // European chains
    if (['nordsee', 'vapiano', 'hans im glück', 'peter pane', 'l\'osteria', 'dean & david', 'backwerk', 'ditsch'].includes(brandLower)) {
      return 'european';
    }
    
    // Default to QSR
    return 'qsr';
  }
}