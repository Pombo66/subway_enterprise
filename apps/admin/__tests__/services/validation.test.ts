import { ValidationService } from '../../lib/services/validation';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateStoreData', () => {
    const validMapping = {
      name: 'Name',
      address: 'Address',
      city: 'City',
      country: 'Country'
    };

    it('should validate correct store data', () => {
      const data = {
        Name: 'Test Store',
        Address: '123 Main St',
        City: 'New York',
        Country: 'USA'
      };

      const result = validationService.validateStoreData(data, validMapping);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject data with missing required fields', () => {
      const data = {
        Name: 'Test Store',
        Address: '123 Main St'
        // Missing City and Country
      };

      const result = validationService.validateStoreData(data, validMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('city'))).toBe(true);
      expect(result.errors.some(error => error.includes('country'))).toBe(true);
    });

    it('should validate coordinates when provided', () => {
      const mapping = {
        ...validMapping,
        latitude: 'Lat',
        longitude: 'Lng'
      };

      const data = {
        Name: 'Test Store',
        Address: '123 Main St',
        City: 'New York',
        Country: 'USA',
        Lat: 40.7128,
        Lng: -74.0060
      };

      const result = validationService.validateStoreData(data, mapping);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const mapping = {
        ...validMapping,
        latitude: 'Lat',
        longitude: 'Lng'
      };

      const data = {
        Name: 'Test Store',
        Address: '123 Main St',
        City: 'New York',
        Country: 'USA',
        Lat: 200, // Invalid latitude
        Lng: -74.0060
      };

      const result = validationService.validateStoreData(data, mapping);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('latitude'))).toBe(true);
    });
  });

  describe('normalizeStoreData', () => {
    const mapping = {
      name: 'Name',
      address: 'Address',
      city: 'City',
      country: 'Country',
      postcode: 'PostCode'
    };

    it('should normalize text fields correctly', () => {
      const data = {
        Name: '  test store  ',
        Address: 'MAIN STREET',
        City: 'new york',
        Country: 'usa',
        PostCode: 'ny 10001'
      };

      const result = validationService.normalizeStoreData(data, mapping);

      expect(result.name).toBe('test store');
      expect(result.city).toBe('New York');
      expect(result.country).toBe('United States');
      expect(result.postcode).toBe('NY 10001');
    });

    it('should infer region from country', () => {
      const data = {
        Name: 'Test Store',
        Address: '123 Main St',
        City: 'London',
        Country: 'United Kingdom'
      };

      const result = validationService.normalizeStoreData(data, mapping);

      expect(result.region).toBe('EMEA');
    });

    it('should handle missing optional fields', () => {
      const data = {
        Name: 'Test Store',
        Address: '123 Main St',
        City: 'New York',
        Country: 'USA'
        // No PostCode
      };

      const result = validationService.normalizeStoreData(data, mapping);

      expect(result.postcode).toBeUndefined();
      expect(result.name).toBe('Test Store');
    });

    it('should normalize coordinates', () => {
      const mappingWithCoords = {
        ...mapping,
        latitude: 'Lat',
        longitude: 'Lng'
      };

      const data = {
        Name: 'Test Store',
        Address: '123 Main St',
        City: 'New York',
        Country: 'USA',
        Lat: '40.7128',
        Lng: '-74.0060'
      };

      const result = validationService.normalizeStoreData(data, mappingWithCoords);

      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });
  });

  describe('detectDuplicates', () => {
    it('should detect duplicates by external ID', () => {
      const stores = [
        {
          name: 'Store 1',
          address: '123 Main St',
          city: 'New York',
          country: 'USA',
          externalId: 'STORE001'
        },
        {
          name: 'Store 2',
          address: '456 Oak Ave',
          city: 'Boston',
          country: 'USA',
          externalId: 'STORE001' // Duplicate external ID
        }
      ];

      const duplicates = validationService.detectDuplicates(stores);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].rowIndex).toBe(1);
      expect(duplicates[0].matchType).toBe('external_id');
      expect(duplicates[0].confidence).toBe(1.0);
    });

    it('should detect duplicates by address matching', () => {
      const stores = [
        {
          name: 'Main Street Store',
          address: '123 Main Street',
          city: 'New York',
          country: 'USA'
        },
        {
          name: 'Main St Store',
          address: '123 Main St',
          city: 'New York',
          country: 'USA'
        }
      ];

      const duplicates = validationService.detectDuplicates(stores);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].matchType).toBe('address_match');
      expect(duplicates[0].confidence).toBeGreaterThan(0.8);
    });

    it('should not detect false positives', () => {
      const stores = [
        {
          name: 'Store 1',
          address: '123 Main St',
          city: 'New York',
          country: 'USA'
        },
        {
          name: 'Store 2',
          address: '456 Oak Ave',
          city: 'Boston',
          country: 'USA'
        }
      ];

      const duplicates = validationService.detectDuplicates(stores);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('batch operations', () => {
    const mapping = {
      name: 'Name',
      address: 'Address',
      city: 'City',
      country: 'Country'
    };

    it('should validate multiple rows', () => {
      const dataRows = [
        { Name: 'Store 1', Address: '123 Main St', City: 'New York', Country: 'USA' },
        { Name: 'Store 2', Address: '456 Oak Ave', City: 'Boston', Country: 'USA' },
        { Name: '', Address: '789 Pine St', City: 'Chicago', Country: 'USA' } // Invalid
      ];

      const results = validationService.validateBatch(dataRows, mapping);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[2].isValid).toBe(false);
    });

    it('should normalize multiple rows', () => {
      const dataRows = [
        { Name: '  store 1  ', Address: '123 Main St', City: 'new york', Country: 'usa' },
        { Name: 'STORE 2', Address: '456 Oak Ave', City: 'BOSTON', Country: 'US' }
      ];

      const results = validationService.normalizeBatch(dataRows, mapping);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('store 1');
      expect(results[0].city).toBe('New York');
      expect(results[0].country).toBe('United States');
      expect(results[1].name).toBe('STORE 2');
      expect(results[1].city).toBe('Boston');
    });
  });
});