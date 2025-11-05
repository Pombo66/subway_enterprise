'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { ExpansionSuggestion } from './types';

interface ZoomAwareVisualizationProps {
  map: any; // MapLibre map instance
  suggestions: ExpansionSuggestion[];
  dataMode: 'live' | 'modelled';
  onSuggestionHover?: (suggestion: ExpansionSuggestion | null) => void;
  onSuggestionClick?: (suggestion: ExpansionSuggestion) => void;
}

export const ZoomAwareVisualization: React.FC<ZoomAwareVisualizationProps> = ({
  map,
  suggestions,
  dataMode,
  onSuggestionHover,
  onSuggestionClick
}) => {
  const currentZoomRef = useRef<number>(0);
  const currentLayerTypeRef = useRef<'heatmap' | 'clusters' | 'pins' | null>(null);

  // Convert suggestions to GeoJSON with null safety
  const createGeoJSONData = useCallback(() => {
    // Helper function to ensure numeric values are safe
    const safeNumeric = (value: any, defaultValue: number = 0): number => {
      const num = Number(value);
      return isNaN(num) || !isFinite(num) ? defaultValue : num;
    };

    return {
      type: 'FeatureCollection' as const,
      features: suggestions.slice(0, 300).map(suggestion => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [safeNumeric(suggestion.lng), safeNumeric(suggestion.lat)]
        },
        properties: {
          id: suggestion.id || `unknown-${Math.random()}`,
          score: safeNumeric(suggestion.finalScore, 0.5),
          confidence: safeNumeric(suggestion.confidence, 0.5),
          dataMode: suggestion.dataMode || 'modelled',
          weight: safeNumeric(suggestion.finalScore, 0.5), // for heatmap
          demandScore: safeNumeric(suggestion.demandScore),
          cannibalizationPenalty: safeNumeric(suggestion.cannibalizationPenalty),
          opsFitScore: safeNumeric(suggestion.opsFitScore),
          nearestSubwayDistance: safeNumeric(suggestion.nearestSubwayDistance),
          topPOIs: (suggestion.topPOIs || []).join(', ')
        }
      }))
    };
  }, [suggestions]);

  // Add or update data source
  const updateDataSource = useCallback(() => {
    if (!map) return;

    try {
      // Check if map is still valid
      if (!map.getStyle || !map.getStyle()) {
        return;
      }

      const geoJsonData = createGeoJSONData();
      
      if (map.getSource && map.getSource('expansion-suggestions')) {
        (map.getSource('expansion-suggestions') as any).setData(geoJsonData);
      } else if (map.addSource) {
        map.addSource('expansion-suggestions', {
          type: 'geojson',
          data: geoJsonData,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });
      }
    } catch (error) {
      console.debug('Failed to update data source:', error);
    }
  }, [map, createGeoJSONData]);

  // Remove all expansion layers
  const removeAllLayers = useCallback(() => {
    if (!map) return;

    try {
      // Check if map is still valid and has a style
      if (!map.getStyle || !map.getStyle()) {
        return;
      }

      const layersToRemove = [
        'expansion-heatmap',
        'expansion-clusters',
        'expansion-cluster-count',
        'expansion-pins',
        'expansion-pins-highlight'
      ];

      layersToRemove.forEach(layerId => {
        try {
          if (map.getLayer && map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        } catch (error) {
          // Silently ignore layer removal errors during cleanup
          console.debug(`Failed to remove layer ${layerId}:`, error);
        }
      });
    } catch (error) {
      // Silently ignore map access errors during cleanup
      console.debug('Failed to access map during layer cleanup:', error);
    }
  }, [map]);

  // Add heatmap layer (zoom ≤ 4)
  const addHeatmapLayer = useCallback(() => {
    if (!map) return;
    
    try {
      if (!map.getStyle || !map.getStyle() || !map.addLayer) return;
      if (map.getLayer && map.getLayer('expansion-heatmap')) return;

    map.addLayer({
      id: 'expansion-heatmap',
      type: 'heatmap',
      source: 'expansion-suggestions',
      paint: {
        // Increase the heatmap weight based on score
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'weight'], 0.5],
          0, 0,
          1, 1
        ],
        // Increase the heatmap color weight by zoom level
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          4, 3
        ],
        // Color ramp for heatmap
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          4, 20
        ],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 1,
          5, 0
        ]
      }
    });
    } catch (error) {
      console.debug('Failed to add heatmap layer:', error);
    }
  }, [map]);

  // Add cluster layers (zoom 5-7)
  const addClusterLayers = useCallback(() => {
    if (!map) return;

    try {
      if (!map.getStyle || !map.getStyle() || !map.addLayer) return;

      // Cluster circles
      if (!map.getLayer || !map.getLayer('expansion-clusters')) {
      map.addLayer({
        id: 'expansion-clusters',
        type: 'circle',
        source: 'expansion-suggestions',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'dataMode'], 'live'], '#22c55e', // Green for live
            '#3b82f6' // Blue for modelled
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // Default radius
            100, 30, // 100+ points
            750, 40  // 750+ points
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // Cluster count labels
    if (!map.getLayer || !map.getLayer('expansion-cluster-count')) {
      map.addLayer({
        id: 'expansion-cluster-count',
        type: 'symbol',
        source: 'expansion-suggestions',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Regular'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });
    }
    } catch (error) {
      console.debug('Failed to add cluster layers:', error);
    }
  }, [map]);

  // Add individual pin layers (zoom ≥ 8)
  const addPinLayers = useCallback(() => {
    if (!map) return;

    try {
      if (!map.getStyle || !map.getStyle() || !map.addLayer) return;

      // Individual pins
      if (!map.getLayer || !map.getLayer('expansion-pins')) {
      // Add the Subway icon if it doesn't exist
      if (!map.hasImage('subway-icon')) {
        // Create a simple Subway "S" icon using canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;
        
        if (ctx) {
          // Draw background circle
          ctx.fillStyle = '#00a651'; // Subway green
          ctx.beginPath();
          ctx.arc(16, 16, 15, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw white "S"
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('S', 16, 16);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          map.addImage('subway-icon', imageData);
        }
      }

      map.addLayer({
        id: 'expansion-pins',
        type: 'symbol',
        source: 'expansion-suggestions',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'subway-icon',
          'icon-size': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'score'], 0.5],
            0, 0.6,    // Small for low scores
            0.3, 0.7,  // Medium-small for medium-low scores
            0.6, 0.8,  // Medium for medium scores
            0.8, 1.0   // Full size for high scores
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
        paint: {
          'icon-opacity': 0.9,
          'icon-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'score'], 0.5],
            0, '#ef4444',    // Red tint for low scores
            0.3, '#f59e0b',  // Orange tint for medium-low scores
            0.6, '#eab308',  // Yellow tint for medium scores
            0.8, '#22c55e'   // Green tint for high scores (original Subway green)
          ]
        }
      });
    }

    // Highlight layer for hover effects
    if (!map.getLayer || !map.getLayer('expansion-pins-highlight')) {
      map.addLayer({
        id: 'expansion-pins-highlight',
        type: 'circle',
        source: 'expansion-suggestions',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-color': '#ffffff',
          'circle-radius': 16,
          'circle-opacity': 0.3,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#000000',
          'circle-stroke-opacity': 0.8
        }
      });
    }
    } catch (error) {
      console.debug('Failed to add pin layers:', error);
    }
  }, [map]);

  // Update visualization based on zoom level - simplified to always show pins for debugging
  const updateVisualization = useCallback((zoomLevel: number) => {
    if (!map) return;

    console.info('🎯 ZoomAwareVisualization: Updating visualization for zoom level:', zoomLevel);
    currentZoomRef.current = zoomLevel;
    removeAllLayers();

    // For now, always show pins to debug visibility issues
    // TODO: Re-enable zoom-aware logic once visibility is confirmed
    addPinLayers();
    currentLayerTypeRef.current = 'pins';
    
    console.info('🎯 ZoomAwareVisualization: Added pin layers for zoom level:', zoomLevel);

    // Original zoom-aware logic (commented out for debugging)
    /*
    if (zoomLevel <= 4) {
      // Heatmap for overview
      addHeatmapLayer();
      currentLayerTypeRef.current = 'heatmap';
    } else if (zoomLevel >= 5 && zoomLevel <= 7) {
      // Clusters for medium zoom
      addClusterLayers();
      currentLayerTypeRef.current = 'clusters';
    } else {
      // Individual pins for detailed view
      addPinLayers();
      currentLayerTypeRef.current = 'pins';
    }
    */
  }, [map, removeAllLayers, addHeatmapLayer, addClusterLayers, addPinLayers]);

  // Handle map interactions
  const setupInteractions = useCallback(() => {
    if (!map) return;

    try {
      if (!map.queryRenderedFeatures || !map.on) return;

      // Click handlers
      const handleClusterClick = (e: any) => {
        try {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['expansion-clusters']
          });

          if (features.length > 0) {
            const clusterId = features[0].properties.cluster_id;
            const source = map.getSource('expansion-suggestions') as any;
            
            if (source && source.getClusterExpansionZoom) {
              source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                if (err || !map.easeTo) return;
                
                map.easeTo({
                  center: features[0].geometry.coordinates,
                  zoom: zoom
                });
              });
            }
          }
        } catch (error) {
          console.debug('Cluster click error:', error);
        }
      };

      const handlePinClick = (e: any) => {
        try {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['expansion-pins']
          });

          if (features.length > 0) {
            const suggestionId = features[0].properties.id;
            const suggestion = suggestions.find(s => s.id === suggestionId);
            if (suggestion && onSuggestionClick) {
              onSuggestionClick(suggestion);
            }
          }
        } catch (error) {
          console.debug('Pin click error:', error);
        }
      };

      // Hover handlers
      const handlePinHover = (e: any) => {
        try {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['expansion-pins']
          });

          if (features.length > 0) {
            const suggestionId = features[0].properties.id;
            const suggestion = suggestions.find(s => s.id === suggestionId);
            
            // Update highlight layer
            if (map.setFilter) {
              map.setFilter('expansion-pins-highlight', ['==', ['get', 'id'], suggestionId]);
            }
            
            if (suggestion && onSuggestionHover) {
              onSuggestionHover(suggestion);
            }
            
            if (map.getCanvas) {
              const canvas = map.getCanvas();
              if (canvas && canvas.style) {
                canvas.style.cursor = 'pointer';
              }
            }
          }
        } catch (error) {
          console.debug('Pin hover error:', error);
        }
      };

      const handleMouseLeave = () => {
        try {
          if (map.setFilter) {
            map.setFilter('expansion-pins-highlight', ['==', ['get', 'id'], '']);
          }
          if (map.getCanvas) {
            const canvas = map.getCanvas();
            if (canvas && canvas.style) {
              canvas.style.cursor = '';
            }
          }
          if (onSuggestionHover) {
            onSuggestionHover(null);
          }
        } catch (error) {
          console.debug('Mouse leave error:', error);
        }
      };

      // Add event listeners
      if (map.on) {
        map.on('click', 'expansion-clusters', handleClusterClick);
        map.on('click', 'expansion-pins', handlePinClick);
        map.on('mouseenter', 'expansion-pins', handlePinHover);
        map.on('mouseleave', 'expansion-pins', handleMouseLeave);
      }

      // Cleanup function
      return () => {
        try {
          if (map && map.off) {
            map.off('click', 'expansion-clusters', handleClusterClick);
            map.off('click', 'expansion-pins', handlePinClick);
            map.off('mouseenter', 'expansion-pins', handlePinHover);
            map.off('mouseleave', 'expansion-pins', handleMouseLeave);
          }
        } catch (error) {
          console.debug('Event listener cleanup error:', error);
        }
      };
    } catch (error) {
      console.debug('Failed to setup interactions:', error);
      return () => {}; // Return empty cleanup function
    }
  }, [map, suggestions, onSuggestionClick, onSuggestionHover]);

  // Initialize and handle zoom changes
  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      const zoomLevel = map.getZoom();
      updateVisualization(zoomLevel);
    };

    // Initial setup
    updateDataSource();
    const initialZoom = map.getZoom();
    updateVisualization(initialZoom);
    
    // Setup interactions
    const cleanupInteractions = setupInteractions();

    // Listen for zoom changes
    map.on('zoomend', handleZoomEnd);

    return () => {
      try {
        if (map && map.off) {
          map.off('zoomend', handleZoomEnd);
        }
        cleanupInteractions?.();
        removeAllLayers();
        
        if (map && map.getSource && map.getSource('expansion-suggestions') && map.removeSource) {
          map.removeSource('expansion-suggestions');
        }
      } catch (error) {
        // Silently ignore cleanup errors when map is destroyed
        console.debug('Map cleanup error (expected during navigation):', error);
      }
    };
  }, [map, updateDataSource, updateVisualization, setupInteractions, removeAllLayers]);

  // Update data when suggestions change
  useEffect(() => {
    if (map && map.getSource('expansion-suggestions')) {
      updateDataSource();
    }
  }, [suggestions, updateDataSource]);

  return null; // This component only manages map layers
};

export default ZoomAwareVisualization;