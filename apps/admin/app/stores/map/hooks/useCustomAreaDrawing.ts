'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  calculatePolygonArea, 
  generateCustomAreaName, 
  validateCustomArea,
  customAreaDrawOptions 
} from '../components/expansion/utils/areaCalculation';

// MapboxDraw type definitions (simplified)
interface MapboxDraw {
  add: (feature: any) => void;
  delete: (id: string) => void;
  deleteAll: () => void;
  getAll: () => { features: any[] };
  changeMode: (mode: string) => void;
}

interface UseCustomAreaDrawingProps {
  map: any; // MapLibre map instance
  onAreaDrawn?: (polygon: GeoJSON.Polygon, area: number, name: string) => void;
  onAreaCleared?: () => void;
  enabled?: boolean;
}

export const useCustomAreaDrawing = ({
  map,
  onAreaDrawn,
  onAreaCleared,
  enabled = false
}: UseCustomAreaDrawingProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [currentArea, setCurrentArea] = useState<number>(0);
  const [currentName, setCurrentName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const drawRef = useRef<MapboxDraw | null>(null);
  const mapRef = useRef(map);

  // Update map ref when map changes
  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  // Initialize MapboxDraw when enabled
  useEffect(() => {
    if (!enabled || !map || drawRef.current) return;

    // Dynamically import MapboxDraw to avoid SSR issues
    const initializeDraw = async () => {
      try {
        const MapboxDraw = (await import('@mapbox/mapbox-gl-draw')).default;
        
        const draw = new MapboxDraw(customAreaDrawOptions);
        drawRef.current = draw;
        
        map.addControl(draw, 'top-left');

        // Event handlers
        const handleDrawCreate = (e: any) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            if (feature.geometry.type === 'Polygon') {
              handlePolygonCreated(feature.geometry);
            }
          }
        };

        const handleDrawUpdate = (e: any) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            if (feature.geometry.type === 'Polygon') {
              handlePolygonCreated(feature.geometry);
            }
          }
        };

        const handleDrawDelete = () => {
          handlePolygonCleared();
        };

        map.on('draw.create', handleDrawCreate);
        map.on('draw.update', handleDrawUpdate);
        map.on('draw.delete', handleDrawDelete);

        // Cleanup function
        return () => {
          map.off('draw.create', handleDrawCreate);
          map.off('draw.update', handleDrawUpdate);
          map.off('draw.delete', handleDrawDelete);
          
          if (drawRef.current) {
            map.removeControl(drawRef.current);
            drawRef.current = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize MapboxDraw:', error);
        setError('Failed to initialize drawing tools');
      }
    };

    initializeDraw();
  }, [enabled, map]);

  // Handle polygon creation/update
  const handlePolygonCreated = useCallback((polygon: GeoJSON.Polygon) => {
    const validation = validateCustomArea(polygon);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid polygon');
      return;
    }

    const area = calculatePolygonArea(polygon);
    const name = generateCustomAreaName(polygon);

    setCurrentPolygon(polygon);
    setCurrentArea(area);
    setCurrentName(name);
    setIsDrawing(false);
    setError(null);

    onAreaDrawn?.(polygon, area, name);
  }, [onAreaDrawn]);

  // Handle polygon clearing
  const handlePolygonCleared = useCallback(() => {
    setCurrentPolygon(null);
    setCurrentArea(0);
    setCurrentName('');
    setIsDrawing(false);
    setError(null);

    onAreaCleared?.();
  }, [onAreaCleared]);

  // Start drawing mode
  const startDrawing = useCallback(() => {
    if (!drawRef.current) return;

    try {
      drawRef.current.changeMode('draw_polygon');
      setIsDrawing(true);
      setError(null);
    } catch (error) {
      console.error('Failed to start drawing:', error);
      setError('Failed to start drawing mode');
    }
  }, []);

  // Clear current polygon
  const clearPolygon = useCallback(() => {
    if (!drawRef.current) return;

    try {
      drawRef.current.deleteAll();
      handlePolygonCleared();
    } catch (error) {
      console.error('Failed to clear polygon:', error);
      setError('Failed to clear polygon');
    }
  }, [handlePolygonCleared]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      if (drawRef.current && mapRef.current) {
        try {
          mapRef.current.removeControl(drawRef.current);
        } catch (error) {
          // Ignore errors during cleanup
        }
        drawRef.current = null;
      }
    };
  }, []);

  return {
    isDrawing,
    currentPolygon,
    currentArea,
    currentName,
    error,
    startDrawing,
    clearPolygon,
    isEnabled: enabled && !!drawRef.current
  };
};

export default useCustomAreaDrawing;