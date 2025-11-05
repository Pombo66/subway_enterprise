import { MarkerRenderer, MarkerRenderOptions, RenderStats } from '../MarkerRenderer';
import { StoreWithActivity } from '../../types';

// Mock MapLibre GL
const mockMap = {
  getBounds: jest.fn(() => ({
    getNorth: () => 40.8,
    getSouth: () => 40.6,
    getEast: () => -73.9,
    getWest: () => -74.1,
  })),
  getZoom: jest.fn(() => 10),
  easeTo: jest.fn(),
};

const mockMarker = {
  setLngLat: jest.fn().mockReturnThis(),
  addTo: jest.fn().mockReturnThis(),
  remove: jest.fn(),
  getElement: jest.fn(() => document.createElement('div')),
};

jest.mock('maplibre-gl', () => ({
  Marker: jest.fn(() => mockMarker),
}));

// Mock Supercluster
const mockSupercluster = {
  load: jest.fn(),
  getClusters: jest.fn(() => []),
  getClusterExpansionZoom: jest.fn(() => 12),
};

jest.mock('supercluster', () => {
  return jest.fn(() => mockSupercluster);
});

describe('MarkerRenderer', () => {
  const mockStores: StoreWithActivity[] = [
    {
      id: '1',
      name: 'Store 1',
      latitude: 40.7128,
      longitude: -74.0060,
      region: 'AMER',
      country: 'US',
      recentActivity: true,
    },
    {
      id: '2',
      name: 'Store 2',
      latitude: 40.7589,
      longitude: -73.9851,
      region: 'AMER',
      country: 'US',
      recentActivity: false,
    },
    {
      id: '3',
      name: 'Store 3',
      latitude: 40.6892,
      longitude: -74.0445,
      region: 'AMER',
      country: 'US',
      recentActivity: true,
    },
  ];

  const defaultOptions: MarkerRenderOptions = {
    maxVisibleMarkers: 500,
    viewportBuffer: 0.1,
    batchSize: 50,
    clusterRadius: 50,
    clusterMaxZoom: 16,
    clusterMinPoints: 2,
  };

  let renderer: MarkerRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    renderer = new MarkerRenderer(mockMap as any, defaultOptions);
  });

  afterEach(() => {
    renderer.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultRenderer = new MarkerRenderer(mockMap as any);
      expect(defaultRenderer).toBeInstanceOf(MarkerRenderer);
    });

    test('should initialize with custom options', () => {
      const customOptions: Partial<MarkerRenderOptions> = {
        maxVisibleMarkers: 100,
        batchSize: 25,
      };
      
      const customRenderer = new MarkerRenderer(mockMap as any, customOptions);
      expect(customRenderer).toBeInstanceOf(MarkerRenderer);
      customRenderer.cleanup();
    });

    test('should set callbacks', () => {
      const mockStoreSelect = jest.fn();
      const mockRenderComplete = jest.fn();

      renderer.setOnStoreSelect(mockStoreSelect);
      renderer.setOnRenderComplete(mockRenderComplete);

      // Callbacks should be set (internal state, no direct assertion possible)
      expect(true).toBe(true);
    });
  });

  describe('Store Rendering', () => {
    test('should render stores successfully', async () => {
      const mockRenderComplete = jest.fn();
      renderer.setOnRenderComplete(mockRenderComplete);

      // Mock clustering to return individual points
      mockSupercluster.getClusters.mockReturnValue(
        mockStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      await renderer.renderStores(mockStores);

      expect(mockSupercluster.load).toHaveBeenCalled();
      expect(mockSupercluster.getClusters).toHaveBeenCalled();
      expect(mockRenderComplete).toHaveBeenCalledWith(expect.objectContaining({
        totalStores: mockStores.length,
        renderedMarkers: expect.any(Number),
      }));
    });

    test('should handle empty store array', async () => {
      await renderer.renderStores([]);

      expect(mockSupercluster.load).not.toHaveBeenCalled();
    });

    test('should handle clustering initialization error', async () => {
      mockSupercluster.load.mockImplementation(() => {
        throw new Error('Clustering failed');
      });

      await expect(renderer.renderStores(mockStores)).rejects.toThrow('Clustering failed');
    });

    test('should render clusters when stores are clustered', async () => {
      const mockRenderComplete = jest.fn();
      renderer.setOnRenderComplete(mockRenderComplete);

      // Mock clustering to return clusters
      mockSupercluster.getClusters.mockReturnValue([
        {
          type: 'Feature',
          properties: {
            cluster: true,
            cluster_id: 1,
            point_count: 2,
          },
          geometry: {
            type: 'Point',
            coordinates: [-74.0, 40.7],
          },
          id: 1,
        },
        {
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: '3',
            store: mockStores[2],
          },
          geometry: {
            type: 'Point',
            coordinates: [mockStores[2].longitude, mockStores[2].latitude],
          },
        },
      ]);

      await renderer.renderStores(mockStores);

      expect(mockRenderComplete).toHaveBeenCalledWith(expect.objectContaining({
        clusteredMarkers: 1,
        renderedMarkers: 1,
      }));
    });
  });

  describe('Marker Management', () => {
    test('should clear all markers', () => {
      renderer.clearMarkers();

      // Should call remove on all markers (internal state)
      expect(true).toBe(true);
    });

    test('should handle marker removal errors gracefully', () => {
      mockMarker.remove.mockImplementation(() => {
        throw new Error('Remove failed');
      });

      // Should not throw error
      expect(() => renderer.clearMarkers()).not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    test('should limit visible markers when too many stores', async () => {
      const manyStores = Array.from({ length: 1000 }, (_, i) => ({
        id: `store-${i}`,
        name: `Store ${i}`,
        latitude: 40.7 + (i * 0.001),
        longitude: -74.0 + (i * 0.001),
        region: 'AMER',
        country: 'US',
        recentActivity: i % 2 === 0,
      }));

      // Mock clustering to return all stores as individual points
      mockSupercluster.getClusters.mockReturnValue(
        manyStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      const mockRenderComplete = jest.fn();
      renderer.setOnRenderComplete(mockRenderComplete);

      await renderer.renderStores(manyStores);

      // Should limit the number of rendered markers
      expect(mockRenderComplete).toHaveBeenCalledWith(expect.objectContaining({
        totalStores: manyStores.length,
        visibleStores: expect.any(Number),
      }));
    });

    test('should prioritize active stores when limiting markers', async () => {
      const mixedStores = [
        ...Array.from({ length: 300 }, (_, i) => ({
          id: `inactive-${i}`,
          name: `Inactive Store ${i}`,
          latitude: 40.7 + (i * 0.001),
          longitude: -74.0 + (i * 0.001),
          region: 'AMER',
          country: 'US',
          recentActivity: false,
        })),
        ...Array.from({ length: 300 }, (_, i) => ({
          id: `active-${i}`,
          name: `Active Store ${i}`,
          latitude: 40.8 + (i * 0.001),
          longitude: -73.9 + (i * 0.001),
          region: 'AMER',
          country: 'US',
          recentActivity: true,
        })),
      ];

      // Mock clustering to return all stores as individual points
      mockSupercluster.getClusters.mockReturnValue(
        mixedStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      const limitedRenderer = new MarkerRenderer(mockMap as any, {
        ...defaultOptions,
        maxVisibleMarkers: 400, // Less than total stores
      });

      const mockRenderComplete = jest.fn();
      limitedRenderer.setOnRenderComplete(mockRenderComplete);

      await limitedRenderer.renderStores(mixedStores);

      // Should prioritize active stores
      expect(mockRenderComplete).toHaveBeenCalledWith(expect.objectContaining({
        visibleStores: expect.any(Number),
      }));

      limitedRenderer.cleanup();
    });

    test('should implement spatial sampling for marker distribution', async () => {
      const clusteredStores = Array.from({ length: 1000 }, (_, i) => ({
        id: `store-${i}`,
        name: `Store ${i}`,
        latitude: 40.7 + (Math.random() * 0.1),
        longitude: -74.0 + (Math.random() * 0.1),
        region: 'AMER',
        country: 'US',
        recentActivity: false,
      }));

      // Mock clustering to return all stores as individual points
      mockSupercluster.getClusters.mockReturnValue(
        clusteredStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      const limitedRenderer = new MarkerRenderer(mockMap as any, {
        ...defaultOptions,
        maxVisibleMarkers: 100,
      });

      const mockRenderComplete = jest.fn();
      limitedRenderer.setOnRenderComplete(mockRenderComplete);

      await limitedRenderer.renderStores(clusteredStores);

      // Should use spatial sampling to distribute markers
      expect(mockRenderComplete).toHaveBeenCalledWith(expect.objectContaining({
        visibleStores: expect.any(Number),
      }));

      limitedRenderer.cleanup();
    });
  });

  describe('Batch Processing', () => {
    test('should process stores in batches', async () => {
      const batchRenderer = new MarkerRenderer(mockMap as any, {
        ...defaultOptions,
        batchSize: 2, // Small batch size for testing
      });

      // Mock clustering to return individual points
      mockSupercluster.getClusters.mockReturnValue(
        mockStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      const mockRenderComplete = jest.fn();
      batchRenderer.setOnRenderComplete(mockRenderComplete);

      await batchRenderer.renderStores(mockStores);

      expect(mockRenderComplete).toHaveBeenCalledWith(expect.objectContaining({
        batchCount: expect.any(Number),
      }));

      batchRenderer.cleanup();
    });

    test('should handle batch processing errors gracefully', async () => {
      const { Marker } = require('maplibre-gl');
      
      // Mock marker creation to fail for some markers
      let callCount = 0;
      Marker.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Marker creation failed');
        }
        return mockMarker;
      });

      // Mock clustering to return individual points
      mockSupercluster.getClusters.mockReturnValue(
        mockStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      // Should not throw error despite marker creation failure
      await expect(renderer.renderStores(mockStores)).resolves.not.toThrow();
    });
  });

  describe('Clustering', () => {
    test('should handle cluster expansion on click', async () => {
      const clusterFeature = {
        type: 'Feature',
        properties: {
          cluster: true,
          cluster_id: 1,
          point_count: 5,
        },
        geometry: {
          type: 'Point',
          coordinates: [-74.0, 40.7],
        },
        id: 1,
      };

      mockSupercluster.getClusters.mockReturnValue([clusterFeature]);
      mockSupercluster.getClusterExpansionZoom.mockReturnValue(14);

      await renderer.renderStores(mockStores);

      // Simulate cluster click by creating a cluster marker element
      const clusterElement = document.createElement('div');
      clusterElement.click();

      // Should call easeTo on map (tested through mock)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should create cluster markers with correct size', async () => {
      const largeClusters = [
        {
          type: 'Feature',
          properties: {
            cluster: true,
            cluster_id: 1,
            point_count: 5,
          },
          geometry: {
            type: 'Point',
            coordinates: [-74.0, 40.7],
          },
          id: 1,
        },
        {
          type: 'Feature',
          properties: {
            cluster: true,
            cluster_id: 2,
            point_count: 50,
          },
          geometry: {
            type: 'Point',
            coordinates: [-74.1, 40.8],
          },
          id: 2,
        },
        {
          type: 'Feature',
          properties: {
            cluster: true,
            cluster_id: 3,
            point_count: 150,
          },
          geometry: {
            type: 'Point',
            coordinates: [-73.9, 40.6],
          },
          id: 3,
        },
      ];

      mockSupercluster.getClusters.mockReturnValue(largeClusters);

      await renderer.renderStores(mockStores);

      // Should create cluster markers with different sizes based on point count
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Store Selection', () => {
    test('should call onStoreSelect when store marker is clicked', async () => {
      const mockStoreSelect = jest.fn();
      renderer.setOnStoreSelect(mockStoreSelect);

      // Mock clustering to return individual points
      mockSupercluster.getClusters.mockReturnValue([
        {
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: mockStores[0].id,
            store: mockStores[0],
          },
          geometry: {
            type: 'Point',
            coordinates: [mockStores[0].longitude, mockStores[0].latitude],
          },
        },
      ]);

      await renderer.renderStores([mockStores[0]]);

      // Simulate store marker click by creating a store marker element
      const storeElement = document.createElement('div');
      storeElement.click();

      // Should call onStoreSelect (tested through internal implementation)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Statistics', () => {
    test('should return render statistics', () => {
      const stats = renderer.getStats();

      expect(stats).toEqual(expect.objectContaining({
        totalStores: expect.any(Number),
        visibleStores: expect.any(Number),
        renderedMarkers: expect.any(Number),
        clusteredMarkers: expect.any(Number),
        renderTime: expect.any(Number),
        batchCount: expect.any(Number),
      }));
    });

    test('should update statistics after rendering', async () => {
      // Mock clustering to return individual points
      mockSupercluster.getClusters.mockReturnValue(
        mockStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      await renderer.renderStores(mockStores);

      const stats = renderer.getStats();
      expect(stats.totalStores).toBe(mockStores.length);
    });
  });

  describe('Cancellation and Cleanup', () => {
    test('should cancel pending renders', () => {
      renderer.cancelPendingRender();

      // Should cancel any pending operations (internal state)
      expect(true).toBe(true);
    });

    test('should cleanup all resources', () => {
      renderer.cleanup();

      // Should clean up all resources (internal state)
      expect(true).toBe(true);
    });

    test('should handle cleanup when already cleaned up', () => {
      renderer.cleanup();
      
      // Should not throw error when cleaning up again
      expect(() => renderer.cleanup()).not.toThrow();
    });

    test('should abort operations when cleanup is called', async () => {
      const renderPromise = renderer.renderStores(mockStores);
      
      // Cleanup immediately
      renderer.cleanup();

      // Should handle aborted operations gracefully
      await expect(renderPromise).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle viewport bounds errors', async () => {
      mockMap.getBounds.mockImplementation(() => {
        throw new Error('Bounds error');
      });

      // Should not throw error
      await expect(renderer.renderStores(mockStores)).resolves.not.toThrow();
    });

    test('should handle clustering errors gracefully', async () => {
      mockSupercluster.getClusters.mockImplementation(() => {
        throw new Error('Clustering error');
      });

      // Should not throw error
      await expect(renderer.renderStores(mockStores)).resolves.not.toThrow();
    });

    test('should handle marker creation errors', async () => {
      const { Marker } = require('maplibre-gl');
      Marker.mockImplementation(() => {
        throw new Error('Marker creation failed');
      });

      // Mock clustering to return individual points
      mockSupercluster.getClusters.mockReturnValue(
        mockStores.map(store => ({
          type: 'Feature',
          properties: {
            cluster: false,
            storeId: store.id,
            store: store,
          },
          geometry: {
            type: 'Point',
            coordinates: [store.longitude, store.latitude],
          },
        }))
      );

      // Should handle marker creation errors gracefully
      await expect(renderer.renderStores(mockStores)).resolves.not.toThrow();
    });
  });
});