import { FileParserService } from '../../lib/services/file-parser';
import { FileParsingError } from '../../lib/errors/upload-errors';

describe('FileParserService', () => {
  let fileParser: FileParserService;

  beforeEach(() => {
    fileParser = new FileParserService();
  });

  describe('parseCSV', () => {
    it('should parse simple CSV data correctly', async () => {
      const csvData = 'Name,Address,City,Country\nStore 1,123 Main St,New York,USA\nStore 2,456 Oak Ave,London,UK';
      const buffer = Buffer.from(csvData, 'utf8');

      const result = await fileParser.parseCSV(buffer);

      expect(result.headers).toEqual(['Name', 'Address', 'City', 'Country']);
      expect(result.totalRows).toBe(2);
      expect(result.rows).toEqual([
        ['Store 1', '123 Main St', 'New York', 'USA'],
        ['Store 2', '456 Oak Ave', 'London', 'UK']
      ]);
    });

    it('should handle CSV with quoted fields', async () => {
      const csvData = 'Name,Address,City\n"Store, Inc","123 Main St, Suite 1","New York"';
      const buffer = Buffer.from(csvData, 'utf8');

      const result = await fileParser.parseCSV(buffer);

      expect(result.headers).toEqual(['Name', 'Address', 'City']);
      expect(result.rows[0]).toEqual(['Store, Inc', '123 Main St, Suite 1', 'New York']);
    });

    it('should handle different delimiters', async () => {
      const csvData = 'Name;Address;City\nStore 1;123 Main St;New York';
      const buffer = Buffer.from(csvData, 'utf8');

      const result = await fileParser.parseCSV(buffer);

      expect(result.headers).toEqual(['Name', 'Address', 'City']);
      expect(result.rows[0]).toEqual(['Store 1', '123 Main St', 'New York']);
    });

    it('should throw error for empty CSV', async () => {
      const buffer = Buffer.from('', 'utf8');

      await expect(fileParser.parseCSV(buffer)).rejects.toThrow(FileParsingError);
    });

    it('should filter out empty rows', async () => {
      const csvData = 'Name,Address\nStore 1,123 Main St\n\n,\nStore 2,456 Oak Ave';
      const buffer = Buffer.from(csvData, 'utf8');

      const result = await fileParser.parseCSV(buffer);

      expect(result.totalRows).toBe(2);
      expect(result.rows).toEqual([
        ['Store 1', '123 Main St'],
        ['Store 2', '456 Oak Ave']
      ]);
    });
  });

  describe('suggestMapping', () => {
    it('should suggest correct mappings for common headers', () => {
      const headers = ['Restaurant', 'Street Address', 'Town', 'Country Code', 'Lat', 'Lng'];

      const mapping = fileParser.suggestMapping(headers);

      expect(mapping).toEqual({
        name: 'Restaurant',
        address: 'Street Address',
        city: 'Town',
        country: 'Country Code',
        latitude: 'Lat',
        longitude: 'Lng'
      });
    });

    it('should handle case-insensitive matching', () => {
      const headers = ['STORE_NAME', 'address', 'City', 'COUNTRY'];

      const mapping = fileParser.suggestMapping(headers);

      expect(mapping.name).toBe('STORE_NAME');
      expect(mapping.address).toBe('address');
      expect(mapping.city).toBe('City');
      expect(mapping.country).toBe('COUNTRY');
    });

    it('should handle headers with spaces and special characters', () => {
      const headers = ['Store Name', 'Street-Address', 'PostCode', 'External ID'];

      const mapping = fileParser.suggestMapping(headers);

      expect(mapping.name).toBe('Store Name');
      expect(mapping.address).toBe('Street-Address');
      expect(mapping.postcode).toBe('PostCode');
      expect(mapping.externalId).toBe('External ID');
    });

    it('should return empty mapping for unrecognized headers', () => {
      const headers = ['Unknown1', 'Unknown2', 'Unknown3'];

      const mapping = fileParser.suggestMapping(headers);

      expect(Object.keys(mapping)).toHaveLength(0);
    });
  });

  describe('validateFile', () => {
    it('should accept valid Excel files', () => {
      const file = new File([''], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(() => fileParser.validateFile(file, 10)).not.toThrow();
    });

    it('should accept valid CSV files', () => {
      const file = new File([''], 'test.csv', { type: 'text/csv' });

      expect(() => fileParser.validateFile(file, 10)).not.toThrow();
    });

    it('should reject files that are too large', () => {
      const file = new File(['x'.repeat(11 * 1024 * 1024)], 'test.csv', { type: 'text/csv' });

      expect(() => fileParser.validateFile(file, 10)).toThrow(FileParsingError);
    });

    it('should reject invalid file types', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });

      expect(() => fileParser.validateFile(file, 10)).toThrow(FileParsingError);
    });
  });

  describe('getSampleRows', () => {
    it('should return specified number of sample rows', () => {
      const rows = [
        ['Row 1'],
        ['Row 2'],
        ['Row 3'],
        ['Row 4'],
        ['Row 5']
      ];

      const sample = fileParser.getSampleRows(rows, 3);

      expect(sample).toHaveLength(3);
      expect(sample).toEqual([['Row 1'], ['Row 2'], ['Row 3']]);
    });

    it('should return all rows if fewer than requested', () => {
      const rows = [['Row 1'], ['Row 2']];

      const sample = fileParser.getSampleRows(rows, 5);

      expect(sample).toHaveLength(2);
      expect(sample).toEqual(rows);
    });
  });
});