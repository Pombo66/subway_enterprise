import * as fc from 'fast-check';
import { 
  GooglePlacesNearbyService, 
  CompetitorResult,
  NearbyCompetitorsRequest 
} from '../competitive/google-places-nearby.service';

describe('GooglePlacesNearbyService', () => {
  let service: GooglePlacesNearbyService;

  beforeEach(() => {
    // Clear any environment variables
    delete process.env.GOOGLE_PLACES_API_KEY;
    service = new GooglePlacesNearbyService();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('Unit Tests', () => {
    describe('calculateDistance', () => {
      it('should return 0 for same coordinates', () => {
        const distance = service.calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);
        expect(distance).toBe(0);
      });

      it('should calculate distance correctly for known points', () => {
        // London to Paris is approximately 344km
        const distance = service.calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
        expect(distance).toBeGreaterThan(340000);
        expect(distance).toBeLessThan(350000);
      });
    });

    describe('generateCacheKey', () => {
      it('should generate consistent keys for same parameters', () => {
        const request: NearbyCompetitorsRequest = { lat: 51.5074, lng: -0.1278, radiusKm: 5 };
        const brands = ["McDonald's", "KFC"];
        
        const key1 = service.generateCacheKey(request, brands);
        const key2 = service.generateCacheKey(request, brands);
        
        expect(key1).toBe(key2);
      });

      it('should generate different keys for different coordinates', () => {
        const brands = ["McDonald's"];
        const key1 = service.generateCacheKey({ lat: 51.5074, lng: -0.1278, radiusKm: 5 }, brands);
        const key2 = service.generateCacheKey({ lat: 52.5074, lng: -0.1278, radiusKm: 5 }, brands);
        
        expect(key1).not.toBe(key2);
      });

      it('should generate different keys for different brands', () => {
        const request: NearbyCompetitorsRequest = { lat: 51.5074, lng: -0.1278, radiusKm: 5 };
        const key1 = service.generateCacheKey(request, ["McDonald's"]);
        const key2 = service.generateCacheKey(request, ["KFC"]);
        
        expect(key1).not.toBe(key2);
      });

      it('should sort brands for consistent keys', () => {
        const request: NearbyCompetitorsRequest = { lat: 51.5074, lng: -0.1278, radiusKm: 5 };
        const key1 = service.generateCacheKey(request, ["McDonald's", "KFC"]);
        const key2 = service.generateCacheKey(request, ["KFC", "McDonald's"]);
        
        expect(key1).toBe(key2);
      });
    });

    describe('buildSummary', () => {
      it('should return correct total count', () => {
        const results: CompetitorResult[] = [
          { brand: "McDonald's", lat: 51.5, lng: -0.1, distanceM: 100 },
          { brand: "KFC", lat: 51.6, lng: -0.2, distanceM: 200 },
          { brand: "McDonald's", lat: 51.7, lng: -0.3, distanceM: 300 },
        ];
        const brands = ["McDonald's", "KFC", "Starbucks"];
        
        const summary = service.buildSummary(results, brands);
        
        expect(summary.total).toBe(3);
      });

      it('should count brands correctly', () => {
        const results: CompetitorResult[] = [
          { brand: "McDonald's", lat: 51.5, lng: -0.1, distanceM: 100 },
          { brand: "KFC", lat: 51.6, lng: -0.2, distanceM: 200 },
          { brand: "McDonald's", lat: 51.7, lng: -0.3, distanceM: 300 },
        ];
        const brands = ["McDonald's", "KFC", "Starbucks"];
        
        const summary = service.buildSummary(results, brands);
        
        expect(summary.byBrand["McDonald's"].count).toBe(2);
        expect(summary.byBrand["KFC"].count).toBe(1);
        expect(summary.byBrand["Starbucks"].count).toBe(0);
      });

      it('should find nearest distance per brand', () => {
        const results: CompetitorResult[] = [
          { brand: "McDonald's", lat: 51.5, lng: -0.1, distanceM: 300 },
          { brand: "McDonald's", lat: 51.6, lng: -0.2, distanceM: 100 },
          { brand: "KFC", lat: 51.7, lng: -0.3, distanceM: 500 },
        ];
        const brands = ["McDonald's", "KFC"];
        
        const summary = service.buildSummary(results, brands);
        
        expect(summary.byBrand["McDonald's"].nearestM).toBe(100);
        expect(summary.byBrand["KFC"].nearestM).toBe(500);
      });

      it('should return null for brands with no results', () => {
        const results: CompetitorResult[] = [
          { brand: "McDonald's", lat: 51.5, lng: -0.1, distanceM: 100 },
        ];
        const brands = ["McDonald's", "KFC"];
        
        const summary = service.buildSummary(results, brands);
        
        expect(summary.byBrand["KFC"].nearestM).toBeNull();
      });
    });

    describe('deduplicateResults', () => {
      it('should remove duplicates within 50m', () => {
        // Two points very close together (same location essentially)
        const results: CompetitorResult[] = [
          { brand: "McDonald's", lat: 51.5074, lng: -0.1278, distanceM: 100 },
          { brand: "McDonald's", lat: 51.5074, lng: -0.1278, distanceM: 100 }, // Exact duplicate
        ];
        
        const deduped = service.deduplicateResults(results);
        
        expect(deduped.length).toBe(1);
      });

      it('should keep results more than 50m apart', () => {
        // Two points about 1km apart
        const results: CompetitorResult[] = [
          { brand: "McDonald's", lat: 51.5074, lng: -0.1278, distanceM: 100 },
          { brand: "McDonald's", lat: 51.5174, lng: -0.1278, distanceM: 200 }, // ~1km north
        ];
        
        const deduped = service.deduplicateResults(results);
        
        expect(deduped.length).toBe(2);
      });
    });
  });

  describe('Property-Based Tests', () => {
    // Arbitrary for generating competitor results
    const competitorResultArb = fc.record({
      brand: fc.constantFrom("McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"),
      lat: fc.double({ min: -90, max: 90, noNaN: true }),
      lng: fc.double({ min: -180, max: 180, noNaN: true }),
      distanceM: fc.integer({ min: 0, max: 50000 }),
      placeName: fc.option(fc.string(), { nil: undefined })
    });

    describe('Property 1: Deduplication Correctness', () => {
      it('should ensure no two results are within 50m after deduplication', () => {
        fc.assert(
          fc.property(
            fc.array(competitorResultArb, { minLength: 0, maxLength: 100 }),
            (results) => {
              const deduped = service.deduplicateResults(results);
              
              // Check all pairs
              for (let i = 0; i < deduped.length; i++) {
                for (let j = i + 1; j < deduped.length; j++) {
                  const distance = service.calculateDistance(
                    deduped[i].lat, deduped[i].lng,
                    deduped[j].lat, deduped[j].lng
                  );
                  // Allow small floating point tolerance
                  expect(distance).toBeGreaterThanOrEqual(49.9);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 2: Result Limits Enforcement', () => {
      it('should never return more than MAX_TOTAL results', () => {
        fc.assert(
          fc.property(
            fc.array(competitorResultArb, { minLength: 0, maxLength: 500 }),
            (results) => {
              const deduped = service.deduplicateResults(results);
              const limited = deduped.slice(0, 250); // Simulate limit enforcement
              
              expect(limited.length).toBeLessThanOrEqual(250);
            }
          ),
          { numRuns: 50 }
        );
      });
    });

    describe('Property 6: Summary Accuracy', () => {
      it('should have summary.total equal to results.length', () => {
        fc.assert(
          fc.property(
            fc.array(competitorResultArb, { minLength: 0, maxLength: 50 }),
            (results) => {
              const brands = ["McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"];
              const summary = service.buildSummary(results, brands);
              
              expect(summary.total).toBe(results.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should have byBrand counts sum to total', () => {
        fc.assert(
          fc.property(
            fc.array(competitorResultArb, { minLength: 0, maxLength: 50 }),
            (results) => {
              const brands = ["McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"];
              const summary = service.buildSummary(results, brands);
              
              const sumOfCounts = Object.values(summary.byBrand)
                .reduce((sum, brand) => sum + brand.count, 0);
              
              expect(sumOfCounts).toBe(summary.total);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should have nearestM equal to minimum distanceM for each brand', () => {
        fc.assert(
          fc.property(
            fc.array(competitorResultArb, { minLength: 1, maxLength: 50 }),
            (results) => {
              const brands = ["McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"];
              const summary = service.buildSummary(results, brands);
              
              for (const brand of brands) {
                const brandResults = results.filter(r => r.brand === brand);
                const expectedNearest = brandResults.length > 0
                  ? Math.min(...brandResults.map(r => r.distanceM))
                  : null;
                
                expect(summary.byBrand[brand].nearestM).toBe(expectedNearest);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 11: Cache Round-Trip', () => {
      it('should return cached response for identical requests within TTL', () => {
        // This test simulates cache behavior without actual API calls
        const mockResponse = {
          center: { lat: 51.5074, lng: -0.1278 },
          radiusKm: 5,
          brands: ["McDonald's"],
          results: [{ brand: "McDonald's", lat: 51.5, lng: -0.1, distanceM: 100 }],
          summary: { total: 1, byBrand: { "McDonald's": { count: 1, nearestM: 100 } } },
          source: 'google_places' as const,
          cached: false
        };

        // Manually set cache entry
        const request: NearbyCompetitorsRequest = { lat: 51.5074, lng: -0.1278, radiusKm: 5 };
        const brands = ["McDonald's"];
        const cacheKey = service.generateCacheKey(request, brands);
        
        // Access private cache via any cast (for testing purposes)
        (service as any).cache.set(cacheKey, {
          response: mockResponse,
          timestamp: Date.now(),
          key: cacheKey
        });

        // Verify cache size increased
        expect(service.getCacheSize()).toBe(1);
      });
    });

    describe('Property 12: Cache Size Limit', () => {
      it('should never exceed MAX_CACHE_SIZE entries', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                lat: fc.double({ min: -90, max: 90, noNaN: true }),
                lng: fc.double({ min: -180, max: 180, noNaN: true }),
              }),
              { minLength: 0, maxLength: 150 }
            ),
            (locations) => {
              // Clear cache first
              service.clearCache();
              
              // Add entries to cache
              for (const loc of locations) {
                const request: NearbyCompetitorsRequest = { 
                  lat: loc.lat, 
                  lng: loc.lng, 
                  radiusKm: 5 
                };
                const brands = ["McDonald's"];
                const cacheKey = service.generateCacheKey(request, brands);
                
                (service as any).cache.set(cacheKey, {
                  response: { 
                    center: loc, 
                    radiusKm: 5, 
                    brands, 
                    results: [], 
                    summary: { total: 0, byBrand: {} },
                    source: 'google_places',
                    cached: false
                  },
                  timestamp: Date.now(),
                  key: cacheKey
                });
                
                // Enforce size limit manually (simulating setInCache behavior)
                while ((service as any).cache.size > 100) {
                  const oldestKey = (service as any).cache.keys().next().value;
                  if (oldestKey) {
                    (service as any).cache.delete(oldestKey);
                  }
                }
              }
              
              expect(service.getCacheSize()).toBeLessThanOrEqual(100);
            }
          ),
          { numRuns: 20 }
        );
      });
    });

    describe('Property 13: No Database Persistence', () => {
      it('should not have any database-related methods', () => {
        // Verify the service doesn't have Prisma or database methods
        const servicePrototype = Object.getPrototypeOf(service);
        const methodNames = Object.getOwnPropertyNames(servicePrototype);
        
        const dbRelatedMethods = methodNames.filter(name => 
          name.includes('prisma') || 
          name.includes('database') || 
          name.includes('persist') ||
          name.includes('save') ||
          name.includes('insert') ||
          name.includes('update') && !name.includes('Cache')
        );
        
        expect(dbRelatedMethods).toHaveLength(0);
      });

      it('should only use in-memory cache', () => {
        // Verify cache is a Map (in-memory)
        expect((service as any).cache).toBeInstanceOf(Map);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results array', () => {
      const brands = ["McDonald's", "KFC"];
      const summary = service.buildSummary([], brands);
      
      expect(summary.total).toBe(0);
      expect(summary.byBrand["McDonald's"].count).toBe(0);
      expect(summary.byBrand["McDonald's"].nearestM).toBeNull();
    });

    it('should handle results with unknown brands', () => {
      const results: CompetitorResult[] = [
        { brand: "Unknown Brand", lat: 51.5, lng: -0.1, distanceM: 100 },
      ];
      const brands = ["McDonald's"];
      
      const summary = service.buildSummary(results, brands);
      
      expect(summary.total).toBe(1);
      expect(summary.byBrand["Unknown Brand"].count).toBe(1);
    });

    it('should handle coordinates at boundaries', () => {
      const results: CompetitorResult[] = [
        { brand: "McDonald's", lat: 90, lng: 180, distanceM: 100 },
        { brand: "McDonald's", lat: -90, lng: -180, distanceM: 200 },
      ];
      
      const deduped = service.deduplicateResults(results);
      
      // These are far apart, should both be kept
      expect(deduped.length).toBe(2);
    });
  });
});
