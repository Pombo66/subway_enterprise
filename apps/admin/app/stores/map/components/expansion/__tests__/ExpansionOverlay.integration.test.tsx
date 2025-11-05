/**
 * Integration tests for ExpansionOverlay component
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import ExpansionOverlay from '../ExpansionOverlay';
import { ExpansionRecommendation } from '../types';

// Mock MapLibre GL
const mockMap = {
  isStyleLoaded: jest.fn(() => true),
  on: jest.fn(),
  off: jest.fn(),
  addSource: jest.fn(),
  addLayer: jest.fn(),
  getSource: jest.fn(),
  getLayer: jest.fn(),
  setLayoutProperty: jest.fn(),
  queryRenderedFeatures: jest.fn(),
  easeTo: jest.fn(),
  getCanvas: jest.fn(() => ({
    style: { cursor: '' }
  })),
};

const mockSource = {
  setData: jest.fn(),
  getClusterExpansionZoom: jest.fn((clusterId, callback) => {
    callback(null, 10);
  }),
};

// Mock expansion data
const mockExpansionData: ExpansionRecommendation[] = [
  {
    id: 'exp-1',
    lat: 40.7128,
    lng: -74.0060,
    region: 'AMER',
    country: 'US',
    finalScore: 0.85,
    confidence: 0.9,
    isLive: true,
    demandScore: 0.8,
    competitionPenalty: 0.2,
    supplyPenalty: 0.1,
    population: 100000,
    footfallIndex: 0.85,
    incomeIndex: 0.8,
    predictedAUV: 1200000,
    paybackPeriod: 18,
  },
  {
    id: 'exp-2',
    lat: 34.0522,
    lng: -118.2437,
    region: 'AMER',
    country: 'US',
    finalScore: 0.72,
    confidence: 0.75,
    isLive: false,
    demandScore: 0.7,
    competitionPenalty: 0.25,
    supplyPenalty: 0.15,
    population: 80000,
    footfallIndex: 0.7,
    incomeIndex: 0.75,
    predictedAUV: 950000,
    paybackPeriod: 24,
  },
];

describe('ExpansionOverlay Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMap.getSource.mockReturnValue(mockSource);
    mockMap.getLayer.mockReturnValue(null);
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize expansion layers when expansion mode is enabled', async () => {
    const mockOnMarkerClick = jest.fn();

    render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalledWith('expansion', expect.objectContaining({
        type: 'geojson',
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      }));
    });

    expect(mockMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'expansion-clusters',
      type: 'circle',
      source: 'expansion',
    }));

    expect(mockMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'expansion-cluster-count',
      type: 'symbol',
      source: 'expansion',
    }));

    expect(mockMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'expansion-markers',
      type: 'circle',
      source: 'expansion',
    }));
  });

  it('should not initialize layers when expansion mode is disabled', () => {
    const mockOnMarkerClick = jest.fn();

    render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={false}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });

  it('should update expansion data when data changes', async () => {
    const mockOnMarkerClick = jest.fn();

    const { rerender } = render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={[]}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    // Wait for initial setup
    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalled();
    });

    // Clear mocks and update with data
    jest.clearAllMocks();
    mockMap.getSource.mockReturnValue(mockSource);

    rerender(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockSource.setData).toHaveBeenCalledWith({
        type: 'FeatureCollection',
        features: expect.arrayContaining([
          expect.objectContaining({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-74.0060, 40.7128],
            },
            properties: expect.objectContaining({
              id: 'exp-1',
              finalScore: 0.85,
              confidence: 0.9,
              isLive: true,
            }),
          }),
        ]),
      });
    });
  });

  it('should limit markers to maxMarkers parameter', async () => {
    const mockOnMarkerClick = jest.fn();
    const largeDataset = Array.from({ length: 600 }, (_, i) => ({
      ...mockExpansionData[0],
      id: `exp-${i}`,
      lat: 40 + (i * 0.01),
      lng: -74 + (i * 0.01),
    }));

    render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={largeDataset}
        onMarkerClick={mockOnMarkerClick}
        maxMarkers={500}
      />
    );

    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSource.setData).toHaveBeenCalledWith({
        type: 'FeatureCollection',
        features: expect.arrayContaining([]),
      });
    });

    // Verify that only 500 features were passed
    const setDataCall = mockSource.setData.mock.calls[0][0];
    expect(setDataCall.features).toHaveLength(500);
  });

  it('should handle cluster click events', async () => {
    const mockOnMarkerClick = jest.fn();

    render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockMap.on).toHaveBeenCalledWith('click', 'expansion-clusters', expect.any(Function));
    });

    // Simulate cluster click
    const clusterClickHandler = mockMap.on.mock.calls.find(
      call => call[0] === 'click' && call[1] === 'expansion-clusters'
    )[2];

    const mockEvent = {
      point: { x: 100, y: 100 },
    };

    const mockFeatures = [{
      properties: { cluster_id: 123 },
      geometry: { coordinates: [-74.0060, 40.7128] },
    }];

    mockMap.queryRenderedFeatures.mockReturnValue(mockFeatures);

    act(() => {
      clusterClickHandler(mockEvent);
    });

    expect(mockMap.queryRenderedFeatures).toHaveBeenCalledWith(
      mockEvent.point,
      { layers: ['expansion-clusters'] }
    );

    expect(mockSource.getClusterExpansionZoom).toHaveBeenCalledWith(
      123,
      expect.any(Function)
    );

    expect(mockMap.easeTo).toHaveBeenCalledWith({
      center: [-74.0060, 40.7128],
      zoom: 10,
    });
  });

  it('should handle marker click events', async () => {
    const mockOnMarkerClick = jest.fn();

    render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockMap.on).toHaveBeenCalledWith('click', 'expansion-markers', expect.any(Function));
    });

    // Simulate marker click
    const markerClickHandler = mockMap.on.mock.calls.find(
      call => call[0] === 'click' && call[1] === 'expansion-markers'
    )[2];

    const mockEvent = {
      point: { x: 100, y: 100 },
    };

    const mockFeatures = [{
      properties: {
        id: 'exp-1',
        lat: 40.7128,
        lng: -74.0060,
        region: 'AMER',
        country: 'US',
        finalScore: 0.85,
        confidence: 0.9,
        isLive: true,
        demandScore: 0.8,
        competitionPenalty: 0.2,
        supplyPenalty: 0.1,
        population: 100000,
        footfallIndex: 0.85,
        incomeIndex: 0.8,
        predictedAUV: 1200000,
        paybackPeriod: 18,
      },
    }];

    mockMap.queryRenderedFeatures.mockReturnValue(mockFeatures);

    act(() => {
      markerClickHandler(mockEvent);
    });

    expect(mockOnMarkerClick).toHaveBeenCalledWith({
      id: 'exp-1',
      lat: 40.7128,
      lng: -74.0060,
      region: 'AMER',
      country: 'US',
      finalScore: 0.85,
      confidence: 0.9,
      isLive: true,
      demandScore: 0.8,
      competitionPenalty: 0.2,
      supplyPenalty: 0.1,
      population: 100000,
      footfallIndex: 0.85,
      incomeIndex: 0.8,
      predictedAUV: 1200000,
      paybackPeriod: 18,
    });
  });

  it('should hide layers when expansion mode is disabled', async () => {
    const mockOnMarkerClick = jest.fn();

    const { rerender } = render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalled();
    });

    // Mock that layers exist
    mockMap.getLayer.mockReturnValue({ id: 'expansion-markers' });

    rerender(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={false}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith('expansion-clusters', 'visibility', 'none');
      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith('expansion-cluster-count', 'visibility', 'none');
      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith('expansion-markers', 'visibility', 'none');
    });

    expect(mockSource.setData).toHaveBeenCalledWith({
      type: 'FeatureCollection',
      features: [],
    });
  });

  it('should handle hover events for cursor changes', async () => {
    const mockOnMarkerClick = jest.fn();
    const mockCanvas = { style: { cursor: '' } };
    mockMap.getCanvas.mockReturnValue(mockCanvas);

    render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockMap.on).toHaveBeenCalledWith('mouseenter', 'expansion-markers', expect.any(Function));
      expect(mockMap.on).toHaveBeenCalledWith('mouseleave', 'expansion-markers', expect.any(Function));
    });

    // Test mouseenter
    const mouseEnterHandler = mockMap.on.mock.calls.find(
      call => call[0] === 'mouseenter' && call[1] === 'expansion-markers'
    )[2];

    act(() => {
      mouseEnterHandler();
    });

    expect(mockCanvas.style.cursor).toBe('pointer');

    // Test mouseleave
    const mouseLeaveHandler = mockMap.on.mock.calls.find(
      call => call[0] === 'mouseleave' && call[1] === 'expansion-markers'
    )[2];

    act(() => {
      mouseLeaveHandler();
    });

    expect(mockCanvas.style.cursor).toBe('');
  });

  it('should clean up event listeners on unmount', async () => {
    const mockOnMarkerClick = jest.fn();

    const { unmount } = render(
      <ExpansionOverlay
        map={mockMap}
        isExpansionMode={true}
        expansionData={mockExpansionData}
        onMarkerClick={mockOnMarkerClick}
      />
    );

    await waitFor(() => {
      expect(mockMap.on).toHaveBeenCalled();
    });

    unmount();

    expect(mockMap.off).toHaveBeenCalledWith('click', 'expansion-clusters');
    expect(mockMap.off).toHaveBeenCalledWith('click', 'expansion-markers');
    expect(mockMap.off).toHaveBeenCalledWith('mouseenter', 'expansion-markers');
    expect(mockMap.off).toHaveBeenCalledWith('mouseleave', 'expansion-markers');
  });
});