import { bff, bffWithErrorHandling, submitForm } from '../api';
import { NetworkError, ApiError } from '../errors/base.error';
import { z } from 'zod';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock config
jest.mock('../config', () => ({
  config: {
    bffBaseUrl: 'http://localhost:3001',
  },
}));

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('bff function', () => {
    const testSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    test('should make successful API call without schema', async () => {
      const mockData = { id: '1', name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await bff('/test');
      
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockData);
    });

    test('should validate response with schema', async () => {
      const mockData = { id: '1', name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await bff('/test', testSchema);
      
      expect(result).toEqual(mockData);
    });

    test('should throw ApiError for invalid schema validation', async () => {
      const mockData = { id: 1, name: 'test' }; // id should be string
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      await expect(bff('/test', testSchema)).rejects.toThrow(ApiError);
    });

    test('should handle BFF success/error response pattern', async () => {
      const mockData = { id: '1', name: 'test' };
      const mockResponse = { success: true, data: mockData };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await bff('/test', testSchema);
      
      expect(result).toEqual(mockData);
    });

    test('should throw ApiError for BFF error response', async () => {
      const mockResponse = { success: false, error: 'Test error' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await expect(bff('/test')).rejects.toThrow(ApiError);
    });

    test('should throw NetworkError for HTTP error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      } as Response);

      await expect(bff('/test')).rejects.toThrow(NetworkError);
    });

    test('should throw ApiError for structured error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation failed' }),
      } as Response);

      await expect(bff('/test')).rejects.toThrow(ApiError);
    });

    test('should throw NetworkError for network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(bff('/test')).rejects.toThrow(NetworkError);
    });

    test('should pass custom headers', async () => {
      const mockData = { id: '1', name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      await bff('/test', undefined, {
        headers: { 'Authorization': 'Bearer token' },
      });
      
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
      });
    });
  });

  describe('bffWithErrorHandling function', () => {
    test('should return success result for successful call', async () => {
      const mockData = { id: '1', name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await bffWithErrorHandling('/test');
      
      expect(result).toEqual({ success: true, data: mockData });
    });

    test('should return error result for failed call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
      } as Response);

      const result = await bffWithErrorHandling('/test');
      
      expect(result).toEqual({ 
        success: false, 
        error: 'Bad request',
      });
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await bffWithErrorHandling('/test');
      
      expect(result).toEqual({ 
        success: false, 
        error: 'Network error: Network request failed: Network error',
      });
    });
  });

  describe('submitForm function', () => {
    const testSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    test('should submit form data successfully', async () => {
      const mockData = { id: '1', name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const formData = { name: 'test' };
      const result = await submitForm('/test', formData, testSchema);
      
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/test', {
        method: 'POST',
        body: JSON.stringify(formData),
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual({ success: true, data: mockData });
    });

    test('should handle validation errors in form submission', async () => {
      const mockResponse = { 
        error: 'Validation failed',
      };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      } as Response);

      const formData = { name: '' };
      const result = await submitForm('/test', formData, testSchema);
      
      expect(result).toEqual({ 
        success: false, 
        error: 'Validation failed',
        details: undefined,
      });
    });
  });
});