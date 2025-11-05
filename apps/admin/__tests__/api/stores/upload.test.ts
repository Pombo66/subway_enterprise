import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/stores/upload/route';

// Mock the dependencies
jest.mock('../../../lib/config/upload-config', () => ({
  validateServerAccess: jest.fn(),
  getUploadConfig: jest.fn(() => ({
    maxFileSizeMB: 10,
    maxRowsPerUpload: 2000
  }))
}));

jest.mock('../../../lib/services/file-parser', () => ({
  FileParserService: jest.fn().mockImplementation(() => ({
    validateFile: jest.fn(),
    parseCSV: jest.fn(),
    parseExcel: jest.fn(),
    getSampleRows: jest.fn(),
    suggestMapping: jest.fn()
  }))
}));

describe('/api/stores/upload', () => {
  let mockFileParser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { FileParserService } = require('../../../lib/services/file-parser');
    mockFileParser = new FileParserService();
  });

  it('should successfully parse CSV file', async () => {
    const csvContent = 'Name,Address,City,Country\nStore 1,123 Main St,New York,USA';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: formData
    });

    // Mock file parser responses
    mockFileParser.parseCSV.mockResolvedValue({
      headers: ['Name', 'Address', 'City', 'Country'],
      rows: [['Store 1', '123 Main St', 'New York', 'USA']],
      totalRows: 1
    });

    mockFileParser.getSampleRows.mockReturnValue([
      ['Store 1', '123 Main St', 'New York', 'USA']
    ]);

    mockFileParser.suggestMapping.mockReturnValue({
      name: 'Name',
      address: 'Address',
      city: 'City',
      country: 'Country'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.headers).toEqual(['Name', 'Address', 'City', 'Country']);
    expect(data.data.totalRows).toBe(1);
    expect(data.data.suggestedMapping).toEqual({
      name: 'Name',
      address: 'Address',
      city: 'City',
      country: 'Country'
    });
  });

  it('should successfully parse Excel file', async () => {
    const file = new File(['mock excel content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: formData
    });

    // Mock file parser responses
    mockFileParser.parseExcel.mockResolvedValue({
      headers: ['Restaurant', 'Street', 'Town', 'Nation'],
      rows: [['Store 1', '123 Main St', 'New York', 'USA']],
      totalRows: 1
    });

    mockFileParser.getSampleRows.mockReturnValue([
      ['Store 1', '123 Main St', 'New York', 'USA']
    ]);

    mockFileParser.suggestMapping.mockReturnValue({
      name: 'Restaurant',
      address: 'Street',
      city: 'Town',
      country: 'Nation'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockFileParser.parseExcel).toHaveBeenCalled();
  });

  it('should reject request without file', async () => {
    const formData = new FormData();
    
    const request = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('No file provided');
  });

  it('should reject files with too many rows', async () => {
    const file = new File(['mock content'], 'test.csv', { type: 'text/csv' });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: formData
    });

    // Mock file parser to return too many rows
    mockFileParser.parseCSV.mockResolvedValue({
      headers: ['Name'],
      rows: new Array(3000).fill(['Store']),
      totalRows: 3000
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toContain('exceeds the maximum limit');
  });

  it('should handle file parsing errors', async () => {
    const file = new File(['invalid content'], 'test.csv', { type: 'text/csv' });
    
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: formData
    });

    // Mock file parser to throw error
    const { FileParsingError } = require('../../../lib/errors/upload-errors');
    mockFileParser.parseCSV.mockRejectedValue(new FileParsingError('Invalid CSV format'));

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid CSV format');
  });

  it('should reject unsupported HTTP methods', async () => {
    const request = new NextRequest('http://localhost/api/stores/upload', {
      method: 'GET'
    });

    const { GET } = require('../../../app/api/stores/upload/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(405);
    expect(data.error).toBe('Method not allowed');
  });
});