import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const country = searchParams.get('country');
    const target = searchParams.get('target');
    const mode = searchParams.get('mode') || 'live';
    const limit = searchParams.get('limit');
    const minDistance = searchParams.get('minDistance');
    const maxPerCity = searchParams.get('maxPerCity');
    const scope = searchParams.get('scope');
    const scopeType = searchParams.get('scopeType');

    console.info('🎯 API: Fetching expansion recommendations', {
      region,
      country,
      target,
      mode,
      limit,
      minDistance,
      maxPerCity,
      scope,
      scopeType,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    });

    // Build query parameters for BFF
    const bffParams = new URLSearchParams();
    if (region) bffParams.set('region', region);
    if (country) bffParams.set('country', country);
    if (target) bffParams.set('target', target);
    if (mode) bffParams.set('mode', mode);
    if (limit) bffParams.set('limit', limit);
    if (minDistance) bffParams.set('minDistance', minDistance);
    if (maxPerCity) bffParams.set('maxPerCity', maxPerCity);
    if (scope) bffParams.set('scope', scope);
    if (scopeType) bffParams.set('scopeType', scopeType);

    // Try to call BFF service, fallback to mock data if unavailable
    const bffUrl = `${process.env.BFF_URL || 'http://localhost:3001'}/expansion/recommendations?${bffParams.toString()}`;
    
    let data;
    try {
      const response = await fetch(bffUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
      }

      data = await response.json();
    } catch (error) {
      console.warn('⚠️ BFF service unavailable, using mock data:', error instanceof Error ? error.message : 'Unknown error');
      console.log('🎯 Generating deterministic mock data at:', new Date().toISOString());
      
      // Deterministic hash function for consistent seeding
      const hashString = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
      };

      // Generate deterministic seed based on location, scope, and model version
      const generateDeterministicSeed = (lat: number, lng: number, scope: string, modelVersion: string): number => {
        const locationKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
        const seedString = `${locationKey}_${scope}_${modelVersion}`;
        return hashString(seedString);
      };

      // Seeded random number generator for consistent results
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

      // Generate cache key for consistent results including new parameters
      const cacheKey = hashString(`${scope || region || 'US'}_${target || 25}_${minDistance || 2.0}_${maxPerCity || 'unlimited'}_v0.3_${mode}`);
      console.log('🎯 Using cache key for deterministic results:', cacheKey, {
        scope: scope || region || 'US',
        target: target || 25,
        minDistance: minDistance || 2.0,
        maxPerCity: maxPerCity || 'unlimited',
        mode
      });

      // Parse parameters for filtering
      const minDistanceKm = minDistance ? parseFloat(minDistance) : 2.0;
      const maxPerCityLimit = maxPerCity ? parseInt(maxPerCity) : undefined;
      const targetCount = target ? parseInt(target) : 25;
      
      console.log('🎯 Applying expansion filters:', {
        minDistanceKm,
        maxPerCityLimit,
        targetCount
      });

      // Generate mock expansion data with deterministic seeding and filtering
      const allCandidates = Array.from({ length: Math.max(targetCount * 2, 50) }, (_, i) => {
        // Create more realistic confidence distribution
        let confidence;
        if (i < 3) confidence = 0.95; // High confidence (green)
        else if (i < 8) confidence = 0.8; // Medium confidence (amber)
        else if (i < 15) confidence = 0.6; // Low confidence (red)
        else if (i < 20) confidence = 0.4; // Very low confidence (red)
        else confidence = 0.2; // Very low confidence (red)
        
        const isAiRecommended = seededRandom(i * 100) > 0.8; // 20% chance, but consistent
        
        // Generate realistic land-based coordinates around NYC boroughs
        const nycAreas = [
          // Manhattan
          { lat: 40.7831, lng: -73.9712, name: 'Manhattan' },
          { lat: 40.7589, lng: -73.9851, name: 'Times Square' },
          { lat: 40.7505, lng: -73.9934, name: 'Midtown' },
          { lat: 40.7282, lng: -73.9942, name: 'Chelsea' },
          { lat: 40.7061, lng: -74.0087, name: 'SoHo' },
          // Brooklyn
          { lat: 40.6892, lng: -73.9442, name: 'Williamsburg' },
          { lat: 40.6782, lng: -73.9442, name: 'Brooklyn Heights' },
          { lat: 40.6501, lng: -73.9496, name: 'Park Slope' },
          // Queens
          { lat: 40.7282, lng: -73.7949, name: 'Long Island City' },
          { lat: 40.7505, lng: -73.8370, name: 'Astoria' },
          // Bronx
          { lat: 40.8448, lng: -73.8648, name: 'Bronx' },
          // Staten Island
          { lat: 40.5795, lng: -74.1502, name: 'Staten Island' },
          // New Jersey (across river)
          { lat: 40.7282, lng: -74.0776, name: 'Jersey City' },
          { lat: 40.7589, lng: -74.0431, name: 'Hoboken' }
        ];
        
        const baseArea = nycAreas[i % nycAreas.length];
        
        // Generate deterministic seed for this location
        const locationSeed = generateDeterministicSeed(
          baseArea.lat, 
          baseArea.lng, 
          region || 'US', 
          'v0.3'
        );
        
        // Use deterministic offsets based on the location seed
        const latOffset = (seededRandom(locationSeed + 1) - 0.5) * 0.02;
        const lngOffset = (seededRandom(locationSeed + 2) - 0.5) * 0.02;
        
        const finalLat = baseArea.lat + latOffset;
        const finalLng = baseArea.lng + lngOffset;
        
        // Calculate distance to nearest existing store (mock calculation)
        // Generate realistic distances that will allow some filtering but not remove everything
        const baseDistance = 0.5 + seededRandom(locationSeed + 110) * 8.0; // 0.5 to 8.5 km range
        const nearestStoreDistance = Math.max(baseDistance, 0.1);

        return {
          id: `mock-${i}`,
          lat: finalLat,
          lng: finalLng,
          region: baseArea.name,
          country: 'US',
          finalScore: seededRandom(locationSeed + 10) * 0.8 + 0.2, // Deterministic score
          confidence: confidence,
          isLive: mode === 'live' && seededRandom(locationSeed + 20) > 0.3,
          aiRecommended: isAiRecommended,
          demandScore: seededRandom(locationSeed + 30) * 0.8 + 0.2,
          competitionPenalty: seededRandom(locationSeed + 40) * 0.3,
          supplyPenalty: seededRandom(locationSeed + 50) * 0.3,
          population: Math.floor(seededRandom(locationSeed + 60) * 100000) + 50000,
          footfallIndex: seededRandom(locationSeed + 70) * 0.8 + 0.2,
          incomeIndex: seededRandom(locationSeed + 80) * 0.8 + 0.2,
          predictedAUV: Math.floor(seededRandom(locationSeed + 90) * 200000) + 300000,
          paybackPeriod: Math.floor(seededRandom(locationSeed + 100) * 24) + 12,
          cacheKey: `cache_${cacheKey}_${i}`,
          modelVersion: 'v0.3',
          dataSnapshotDate: new Date().toISOString(),
          nearestStoreDistance: nearestStoreDistance
        };
      });

      // Apply anti-cannibalization filter
      const filteredCandidates = allCandidates.filter(candidate => 
        candidate.nearestStoreDistance >= minDistanceKm
      );

      console.log('🎯 Anti-cannibalization filtering:', {
        totalCandidates: allCandidates.length,
        afterMinDistanceFilter: filteredCandidates.length,
        minDistanceKm
      });

      // Apply max per city limit if specified
      let finalCandidates = filteredCandidates;
      if (maxPerCityLimit) {
        const cityGroups = new Map<string, typeof filteredCandidates>();
        
        filteredCandidates.forEach(candidate => {
          const city = candidate.region;
          if (!cityGroups.has(city)) {
            cityGroups.set(city, []);
          }
          cityGroups.get(city)!.push(candidate);
        });

        finalCandidates = [];
        cityGroups.forEach((candidates, city) => {
          // Sort by score and take top N per city
          const topCandidates = candidates
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, maxPerCityLimit);
          finalCandidates.push(...topCandidates);
        });

        console.log('🎯 Max per city filtering:', {
          cities: cityGroups.size,
          maxPerCity: maxPerCityLimit,
          afterCityLimit: finalCandidates.length
        });
      }

      // Sort by score and take top N
      const mockRecommendations = finalCandidates
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, targetCount);

      data = {
        data: {
          recommendations: mockRecommendations,
          metadata: {
            total: mockRecommendations.length,
            mode: mode,
            generatedAt: new Date().toISOString(),
            source: 'mock'
          }
        }
      };
    }
    
    console.info('✅ API: Expansion recommendations fetched successfully', {
      count: data.data?.recommendations?.length || 0
    });

    // Extract the nested data structure and return it in the expected format
    const responseData = {
      recommendations: data.data?.recommendations || [],
      metadata: { 
        ...data.data?.metadata || { total: 0, mode: 'live' },
        generatedAt: new Date().toISOString(),
        cacheBuster: Date.now(), // Force cache busting
        country: country || 'all' // Include country in response for debugging
      }
    };

    const response = NextResponse.json(responseData);
    
    // Add cache-busting headers to prevent browser caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('❌ API: Failed to fetch expansion recommendations:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch expansion recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}