import { FeatureFlagService } from '../feature-flag.service';
import { bff, bffWithErrorHandling } from '../../api';
import { FeatureFlag, FeatureFlagQuery, CreateFeatureFlagRequest, UpdateFeatureFlagRequest } from '../../types/feature-flag.types';

// Mock the API functions
jest.mock('../../api');
const mockBff = bff as jest.MockedFunction<typeof bff>;
const mockBffWithErrorHandling = bffWithErrorHandling as jest.MockedFunction<typeof bffWithErrorHandling>;

describe('FeatureFlagService', () => {
  beforeEach(() => {
    mockBff.mockClear();
    mockBffWithErrorHandling.mockClear();
  });

  describe('getFeatureFlags', () => {
    test('should fetch feature flags with query parameters', async () => {
      const mockResponse = {
        flags: [
          {
            id: '1',
            key: 'TEST_FLAG',
            enabled: true,
            description: 'Test flag',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockBff.mockResolvedValueOnce(mockResponse);

      const query: FeatureFlagQuery = {
        search: 'test',
        enabled: true,
        page: 1,
        limit: 20,
      };

      const result = await FeatureFlagService.getFeatureFlags(query);

      expect(mockBff).toHaveBeenCalledWith(
        '/settings/flags?search=test&enabled=true&page=1&limit=20',
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    test('should handle query without optional parameters', async () => {
      const mockResponse = {
        flags: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      mockBff.mockResolvedValueOnce(mockResponse);

      const query: FeatureFlagQuery = {
        page: 1,
        limit: 20,
      };

      await FeatureFlagService.getFeatureFlags(query);

      expect(mockBff).toHaveBeenCalledWith(
        '/settings/flags?page=1&limit=20',
        expect.any(Object)
      );
    });
  });

  describe('getFeatureFlagById', () => {
    test('should fetch feature flag by ID', async () => {
      const mockFlag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        enabled: true,
        description: 'Test flag',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockBff.mockResolvedValueOnce(mockFlag);

      const result = await FeatureFlagService.getFeatureFlagById('1');

      expect(mockBff).toHaveBeenCalledWith('/settings/flags/1', expect.any(Object));
      expect(result).toEqual(mockFlag);
    });
  });

  describe('createFeatureFlag', () => {
    test('should create feature flag successfully', async () => {
      const mockFlag: FeatureFlag = {
        id: '1',
        key: 'NEW_FLAG',
        enabled: false,
        description: 'New flag',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: true,
        data: mockFlag,
      });

      const createData: CreateFeatureFlagRequest = {
        key: 'NEW_FLAG',
        enabled: false,
        description: 'New flag',
      };

      const result = await FeatureFlagService.createFeatureFlag(createData);

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/settings/flags',
        expect.any(Object),
        {
          method: 'POST',
          body: JSON.stringify(createData),
        }
      );
      expect(result).toEqual({ success: true, flag: mockFlag });
    });

    test('should handle creation failure', async () => {
      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: false,
        error: 'Flag key already exists',
      });

      const createData: CreateFeatureFlagRequest = {
        key: 'EXISTING_FLAG',
        enabled: false,
      };

      const result = await FeatureFlagService.createFeatureFlag(createData);

      expect(result).toEqual({ success: false, error: 'Flag key already exists' });
    });
  });

  describe('updateFeatureFlag', () => {
    test('should update feature flag successfully', async () => {
      const mockFlag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        enabled: true,
        description: 'Updated description',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z',
      };

      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: true,
        data: mockFlag,
      });

      const updateData: UpdateFeatureFlagRequest = {
        enabled: true,
        description: 'Updated description',
      };

      const result = await FeatureFlagService.updateFeatureFlag('1', updateData);

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/settings/flags/1',
        expect.any(Object),
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }
      );
      expect(result).toEqual({ success: true, flag: mockFlag });
    });

    test('should handle update failure', async () => {
      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: false,
        error: 'Flag not found',
      });

      const updateData: UpdateFeatureFlagRequest = {
        enabled: true,
      };

      const result = await FeatureFlagService.updateFeatureFlag('999', updateData);

      expect(result).toEqual({ success: false, error: 'Flag not found' });
    });
  });

  describe('toggleFeatureFlag', () => {
    test('should toggle feature flag to enabled', async () => {
      const mockFlag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        enabled: true,
        description: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z',
      };

      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: true,
        data: mockFlag,
      });

      const result = await FeatureFlagService.toggleFeatureFlag('1', true);

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/settings/flags/1',
        expect.any(Object),
        {
          method: 'PATCH',
          body: JSON.stringify({ enabled: true }),
        }
      );
      expect(result).toEqual({ success: true, flag: mockFlag });
    });

    test('should toggle feature flag to disabled', async () => {
      const mockFlag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        enabled: false,
        description: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z',
      };

      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: true,
        data: mockFlag,
      });

      const result = await FeatureFlagService.toggleFeatureFlag('1', false);

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/settings/flags/1',
        expect.any(Object),
        {
          method: 'PATCH',
          body: JSON.stringify({ enabled: false }),
        }
      );
      expect(result).toEqual({ success: true, flag: mockFlag });
    });
  });

  describe('deleteFeatureFlag', () => {
    test('should delete feature flag successfully', async () => {
      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const result = await FeatureFlagService.deleteFeatureFlag('1');

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/settings/flags/1',
        expect.any(Object),
        {
          method: 'DELETE',
        }
      );
      expect(result).toEqual({ success: true, data: {} });
    });

    test('should handle deletion failure', async () => {
      mockBffWithErrorHandling.mockResolvedValueOnce({
        success: false,
        error: 'Flag not found',
      });

      const result = await FeatureFlagService.deleteFeatureFlag('999');

      expect(result).toEqual({ success: false, error: 'Flag not found' });
    });
  });

  describe('getRecentEvents', () => {
    test('should fetch recent events with default limit', async () => {
      const mockEvents = [
        {
          id: '1',
          flagKey: 'TEST_FLAG',
          action: 'ENABLED' as const,
          actor: 'admin@example.com',
          timestamp: '2024-01-01T00:00:00Z',
          previousValue: false,
          newValue: true,
        },
      ];

      mockBff.mockResolvedValueOnce(mockEvents);

      const result = await FeatureFlagService.getRecentEvents();

      expect(mockBff).toHaveBeenCalledWith(
        '/settings/flags/events?limit=10',
        expect.any(Object)
      );
      expect(result).toEqual(mockEvents);
    });

    test('should fetch recent events with custom limit', async () => {
      const mockEvents = [
        {
          id: '1',
          flagKey: 'TEST_FLAG',
          action: 'DISABLED' as const,
          actor: 'admin@example.com',
          timestamp: '2024-01-01T00:00:00Z',
          previousValue: true,
          newValue: false,
        },
      ];

      mockBff.mockResolvedValueOnce(mockEvents);

      const result = await FeatureFlagService.getRecentEvents(5);

      expect(mockBff).toHaveBeenCalledWith(
        '/settings/flags/events?limit=5',
        expect.any(Object)
      );
      expect(result).toEqual(mockEvents);
    });
  });
});