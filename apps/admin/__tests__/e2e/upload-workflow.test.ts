/**
 * End-to-end test for the complete store upload workflow
 * This test simulates the entire process from file upload to database insertion
 */

import { NextRequest } from 'next/server';
import { POST as uploadPOST } from '../../app/api/stores/upload/route';
import { POST as ingestPOST } from '../../app/api/stores/ingest/route';

// Mock Prisma client
const mockPrismaStore = {
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
};

const mockPrisma = {
  store: mockPrismaStore,
  $transaction: jest.fn()
};

jest.mock('../../lib/db', () => mockPrisma);

// Mock geocoding service
jest.mock('../../lib/services/geocoding', () => ({
  GeocodingService: jest.fn().mockImplementation(() => ({
    batchGeocode: jest.fn().mockResolvedValue([
      {
        latitude: 40.7128,
        longitude: -74.0060,
        provider: 'nominatim',
        status: 'success'
      }
    ])
  }))
}));

// Mock configuration
jest.mock('../../lib/config/upload-config', () => ({
  validateServerAccess: jest.fn(),
  getUploadConfig: jest.fn(() => ({
    maxFileSizeMB: 10,
    maxRowsPerUpload: 2000,
    geocodingBatchSize: 20,
    geocodingDelayMs: 250
  }))
}));

describe('Complete Upload Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full workflow from CSV upload to database insertion', async () => {
    // Step 1: Upload and parse CSV file
    const csvContent = 'Name,Address,City,Country\nTest Store,123 Main St,New York,USA';
    const file = new File([csvContent], 'stores.csv', { type: 'text/csv' });
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const uploadRequest = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: uploadFormData
    });

    const uploadResponse = await uploadPOST(uploadRequest);
    const uploadData = await uploadResponse.json();

    // Verify upload response
    expect(uploadResponse.status).toBe(200);
    expect(uploadData.success).toBe(true);
    expect(uploadData.data.headers).toEqual(['Name', 'Address', 'City', 'Country']);
    expect(uploadData.data.totalRows).toBe(1);
    expect(uploadData.data.suggestedMapping).toEqual({
      name: 'Name',
      address: 'Address',
      city: 'City',
      country: 'Country'
    });

    // Step 2: Ingest data with column mapping
    const ingestPayload = {
      mapping: uploadData.data.suggestedMapping,
      rows: uploadData.data.sampleRows.map((row: any) => row.data)
    };

    const ingestRequest = new NextRequest('http://localhost/api/stores/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingestPayload)
    });

    // Mock database operations
    mockPrismaStore.findFirst.mockResolvedValue(null); // No existing store
    mockPrismaStore.create.mockResolvedValue({
      id: 'new-store-id',
      name: 'Test Store',
      address: '123 Main St',
      city: 'New York',
      country: 'USA'
    });

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });

    const ingestResponse = await ingestPOST(ingestRequest);
    const ingestData = await ingestResponse.json();

    // Verify ingest response
    expect(ingestResponse.status).toBe(200);
    expect(ingestData.success).toBe(true);
    expect(ingestData.data.inserted).toBe(1);
    expect(ingestData.data.updated).toBe(0);
    expect(ingestData.data.failed).toBe(0);

    // Verify database operations were called
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrismaStore.findFirst).toHaveBeenCalledWith({
      where: {
        name: 'Test Store',
        city: 'New York',
        country: 'United States' // Should be normalized
      }
    });
    expect(mockPrismaStore.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test Store',
        city: 'New York',
        country: 'United States',
        region: 'AMER', // Should be inferred
        latitude: 40.7128, // Should be geocoded
        longitude: -74.0060
      })
    });
  });

  it('should handle duplicate detection and update existing stores', async () => {
    // Step 1: Upload CSV with duplicate store
    const csvContent = 'Name,Address,City,Country\nExisting Store,456 Oak Ave,Boston,USA';
    const file = new File([csvContent], 'stores.csv', { type: 'text/csv' });
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const uploadRequest = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: uploadFormData
    });

    const uploadResponse = await uploadPOST(uploadRequest);
    const uploadData = await uploadResponse.json();

    // Step 2: Ingest with existing store in database
    const ingestPayload = {
      mapping: uploadData.data.suggestedMapping,
      rows: uploadData.data.sampleRows.map((row: any) => row.data)
    };

    const ingestRequest = new NextRequest('http://localhost/api/stores/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingestPayload)
    });

    // Mock existing store in database
    mockPrismaStore.findFirst.mockResolvedValue({
      id: 'existing-store-id',
      name: 'Existing Store',
      city: 'Boston',
      country: 'USA'
    });

    mockPrismaStore.update.mockResolvedValue({
      id: 'existing-store-id',
      name: 'Existing Store',
      city: 'Boston',
      country: 'USA'
    });

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });

    const ingestResponse = await ingestPOST(ingestRequest);
    const ingestData = await ingestResponse.json();

    // Verify update operation
    expect(ingestData.success).toBe(true);
    expect(ingestData.data.inserted).toBe(0);
    expect(ingestData.data.updated).toBe(1);
    expect(mockPrismaStore.update).toHaveBeenCalledWith({
      where: { id: 'existing-store-id' },
      data: expect.objectContaining({
        name: 'Existing Store',
        city: 'Boston',
        country: 'United States',
        updatedAt: expect.any(Date)
      })
    });
  });

  it('should handle geocoding failures gracefully', async () => {
    // Mock geocoding service to fail
    const { GeocodingService } = require('../../lib/services/geocoding');
    const mockGeocodingService = new GeocodingService();
    mockGeocodingService.batchGeocode.mockResolvedValue([
      {
        provider: 'nominatim',
        status: 'failed'
      }
    ]);

    // Upload and ingest data
    const csvContent = 'Name,Address,City,Country\nTest Store,Unknown Address,Unknown City,Unknown Country';
    const file = new File([csvContent], 'stores.csv', { type: 'text/csv' });
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const uploadRequest = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: uploadFormData
    });

    const uploadResponse = await uploadPOST(uploadRequest);
    const uploadData = await uploadResponse.json();

    const ingestPayload = {
      mapping: uploadData.data.suggestedMapping,
      rows: uploadData.data.sampleRows.map((row: any) => row.data)
    };

    const ingestRequest = new NextRequest('http://localhost/api/stores/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingestPayload)
    });

    mockPrismaStore.findFirst.mockResolvedValue(null);
    mockPrismaStore.create.mockResolvedValue({ id: 'new-store-id' });
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });

    const ingestResponse = await ingestPOST(ingestRequest);
    const ingestData = await ingestResponse.json();

    // Should still create store without coordinates
    expect(ingestData.success).toBe(true);
    expect(ingestData.data.inserted).toBe(1);
    expect(ingestData.data.pendingGeocode).toBe(1);
    expect(mockPrismaStore.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test Store',
        latitude: undefined,
        longitude: undefined
      })
    });
  });

  it('should handle validation errors', async () => {
    // Upload CSV with invalid data
    const csvContent = 'Name,Address,City,Country\n,123 Main St,New York,USA'; // Missing name
    const file = new File([csvContent], 'stores.csv', { type: 'text/csv' });
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const uploadRequest = new NextRequest('http://localhost/api/stores/upload', {
      method: 'POST',
      body: uploadFormData
    });

    const uploadResponse = await uploadPOST(uploadRequest);
    const uploadData = await uploadResponse.json();

    const ingestPayload = {
      mapping: uploadData.data.suggestedMapping,
      rows: uploadData.data.sampleRows.map((row: any) => row.data)
    };

    const ingestRequest = new NextRequest('http://localhost/api/stores/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingestPayload)
    });

    const ingestResponse = await ingestPOST(ingestRequest);
    const ingestData = await ingestResponse.json();

    // Should report validation failures
    expect(ingestData.success).toBe(true);
    expect(ingestData.data.inserted).toBe(0);
    expect(ingestData.data.failed).toBe(1);
  });
});