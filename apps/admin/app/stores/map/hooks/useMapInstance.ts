/**
 * useMapInstance - Hook for managing map instance with refs to prevent re-renders
 * Uses SingletonMapManager to ensure single map instance per page lifecycle
 */

import { useRef, useEffect, useCallback } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import { mapManager } from '../lib/SingletonMapManager';
import { StoreWithActivity } from '../types';

export interface UseMapInstanceReturn {
  mapRef: React.RefObject<HTMLDivElement>;
  getMapInstance: () => MapLibreMap | null;
  updateStores: (stores: StoreWithActivity[]) => void;
  isInitialized: () => boolean;
}

/**
 * Hook that manages map instance using refs to prevent render loops
 * Returns stable references that don't change on re-renders
 */
export function useMapInstance(): UseMapInstanceReturn {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const isInitializedRef = useRef(false);
  const initializationAttemptedRef = useRef(false);

  // Stable callback to get map instance
  const getMapInstance = useCallback((): MapLibreMap | null => {
    return mapInstanceRef.current;
  }, []);

  // Stable callback to update stores
  const updateStores = useCallback((stores: StoreWithActivity[]) => {
    if (mapInstanceRef.current && isInitializedRef.current) {
      mapManager.updateDataSource(stores);
    }
  }, []);

  // Stable callback to check initialization status
  const isInitialized = useCallback((): boolean => {
    return isInitializedRef.current && mapInstanceRef.current !== null;
  }, []);

  // Single initialization effect that only runs once per container
  useEffect(() => {
    const container = mapRef.current;
    
    // Only initialize if we have a container and haven't attempted initialization
    if (!container || initializationAttemptedRef.current) {
      return;
    }

    initializationAttemptedRef.current = true;

    const initializeMap = async () => {
      try {
        console.log('🗺️ Starting map initialization...');
        
        const mapInstance = await mapManager.initializeMap(container);
        
        // Store references without triggering re-renders
        mapInstanceRef.current = mapInstance;
        isInitializedRef.current = true;
        
        console.log('✅ Map instance ready');
        
        // Emit telemetry for map readiness
        const initTime = performance.now() - (performance as any).mapInitStart || 0;
        if (typeof window !== 'undefined') {
          const { mapTelemetry } = await import('../lib/MapTelemetry');
          mapTelemetry.trackMapReady(0, initTime); // Store count will be updated when stores load
        }
        
      } catch (error) {
        console.error('❌ Map initialization failed:', error);
        
        // Reset refs on failure
        mapInstanceRef.current = null;
        isInitializedRef.current = false;
        initializationAttemptedRef.current = false;
        
        // Emit error telemetry
        if (typeof window !== 'undefined') {
          const { mapTelemetry } = await import('../lib/MapTelemetry');
          mapTelemetry.trackError(
            error instanceof Error ? error : new Error('Unknown map initialization error'),
            'map_initialization'
          );
        }
        
        // Could show fallback UI here or emit error to parent component
        throw error;
      }
    };

    initializeMap();

    // Cleanup function - only runs on unmount
    return () => {
      console.log('🧹 useMapInstance cleanup');
      
      // Clean up map manager
      mapManager.cleanup();
      
      // Reset all refs
      mapInstanceRef.current = null;
      isInitializedRef.current = false;
      initializationAttemptedRef.current = false;
    };
  }, []); // Empty dependency array - only run once per component lifecycle

  return {
    mapRef,
    getMapInstance,
    updateStores,
    isInitialized
  };
}