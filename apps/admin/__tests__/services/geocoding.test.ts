import { GeocodingService } from '../../lib/services/geocoding';
import { GeocodeRequest } from '../../lib/validation/store-upload';

// Mock fetch globally
global.fetch = jest.fn();

describe('GeocodingService', () => {
  let geocodingService: GeocodingService;

  beforeEach(() => {
    geocodingService = new GeocodingService();
    jest.clearAllMocks();
  });

  describe('geocodeAddress', () => {
    const mockRequest: GeocodeRequest = {
      address: '123 Main St',
      city: 'New York',
      country: 'USA'
    };

    it('should successfully geocode with Mapbox when token is available', async () => {
      // Mock environment variable
      process.env.MAPBOX_TOKEN = 'test-token';

      const mockResponse = {
        features: [{
          center: [-74.0060, 40.7128],
          place_name: '123 Main St, New York, NY, USA',
          relevance: 0.9
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geocodingService.geocodeAddress(mockRequest);

      expect(result.status).toBe('success');
      expect(result.provider).toBe('mapbox');
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.accuracy).toBe('high');
    });

    it('should fallback to Google Maps when Mapbox fails', async () => {
      // Mock environment variables
      process.env.MAPBOX_TOKEN = 'test-token';
      process.env.GOOGLE_MAPS_API_KEY = 'test-key';

      // Mock Mapbox failure
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ features: [] })
        })
        // Mock Google success
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            results: [{
              geometry: {
                location: { lat: 40.7128, lng: -74.0060 }
              },
              formatted_address: '123 Main St, New York, NY, USA'
            }]
          })
        });

      const result = await geocodingService.geocodeAddress(mockRequest);

      expect(result.status).toBe('success');
      expect(result.provider).toBe('google');
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });

    it('should fallback to Nominatim when other providers fail', async () => {
      // No API keys set, should use Nominatim
      delete process.env.MAPBOX_TOKEN;
      delete process.env.GOOGLE_MAPS_API_KEY;

      const mockResponse = [{
        lat: '40.7128',
        lon: '-74.0060',
        display_name: '123 Main St, New York, NY, USA',
        importance: 0.8
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geocodingService.geocodeAddress(mockRequest);

      expect(result.status).toBe('success');
      expect(result.provider).toBe('nominatim');
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });

    it('should return failed status when all providers fail', async () => {
      delete process.env.MAPBOX_TOKEN;
      delete process.env.GOOGLE_MAPS_API_KEY;

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]) // Empty Nominatim response
      });

      const result = await geocodingService.geocodeAddress(mockRequest);

      expect(result.status).toBe('failed');
      expect(result.provider).toBe('nominatim');
    });

    it('should handle API errors gracefully', async () => {
      delete process.env.MAPBOX_TOKEN;
      delete process.env.GOOGLE_MAPS_API_KEY;

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodingService.geocodeAddress(mockRequest);

      expect(result.status).toBe('failed');
    });
  });

  describe('batchGeocode', () => {
    it('should process multiple addresses', async () => {
      delete process.env.MAPBOX_TOKEN;
      delete process.env.GOOGLE_MAPS_API_KEY;

      const requests: GeocodeRequest[] = [
        { address: '123 Main St', city: 'New York', country: 'USA' },
        { address: '456 Oak Ave', city: 'Boston', country: 'USA' }
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            lat: '40.7128',
            lon: '-74.0060',
            display_name: '123 Main St, New York, NY, USA',
            importance: 0.8
          }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            lat: '42.3601',
            lon: '-71.0589',
            display_name: '456 Oak Ave, Boston, MA, USA',
            importance: 0.7
          }])
        });

      const results = await geocodingService.batchGeocode(requests);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
    });

    it('should handle mixed success and failure results', async () => {
      delete process.env.MAPBOX_TOKEN;
      delete process.env.GOOGLE_MAPS_API_KEY;

      const requests: GeocodeRequest[] = [
        { address: '123 Main St', city: 'New York', country: 'USA' },
        { address: 'Invalid Address', city: 'Unknown', country: 'Unknown' }
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            lat: '40.7128',
            lon: '-74.0060',
            display_name: '123 Main St, New York, NY, USA',
            importance: 0.8
          }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]) // No results for invalid address
        });

      const results = await geocodingService.batchGeocode(requests);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('failed');
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(GeocodingService.validateCoordinates(40.7128, -74.0060)).toBe(true);
      expect(GeocodingService.validateCoordinates(0, 0)).toBe(true);
      expect(GeocodingService.validateCoordinates(90, 180)).toBe(true);
      expect(GeocodingService.validateCoordinates(-90, -180)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(GeocodingService.validateCoordinates(91, 0)).toBe(false);
      expect(GeocodingService.validateCoordinates(-91, 0)).toBe(false);
      expect(GeocodingService.validateCoordinates(0, 181)).toBe(false);
      expect(GeocodingService.validateCoordinates(0, -181)).toBe(false);
      expect(GeocodingService.validateCoordinates(NaN, 0)).toBe(false);
      expect(GeocodingService.validateCoordinates(0, NaN)).toBe(false);
    });
  });

  describe('normalizeAddress', () => {
    it('should normalize address components', () => {
      const request: GeocodeRequest = {
        address: '  123 Main St  ',
        city: '  New York  ',
        postcode: '  10001  ',
        country: '  USA  '
      };

      const normalized = GeocodingService.normalizeAddress(request);

      expect(normalized.address).toBe('123 Main St');
      expect(normalized.city).toBe('New York');
      expect(normalized.postcode).toBe('10001');
      expect(normalized.country).toBe('USA');
    });
  });
});