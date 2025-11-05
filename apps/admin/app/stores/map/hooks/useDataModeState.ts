'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DataModeMetadata {
  modelVersion: string;
  dataSnapshotDate: string;
  generatedAt: string;
  cacheHit?: boolean;
}

interface UseDataModeStateProps {
  onModeChange?: (mode: 'live' | 'modelled', metadata: DataModeMetadata) => void;
  defaultMode?: 'live' | 'modelled';
  defaultMetadata?: Partial<DataModeMetadata>;
}

export const useDataModeState = ({
  onModeChange,
  defaultMode = 'live',
  defaultMetadata = {}
}: UseDataModeStateProps = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize mode from URL or default
  const [dataMode, setDataMode] = useState<'live' | 'modelled'>(() => {
    const urlMode = searchParams.get('dataMode') as 'live' | 'modelled' | null;
    return urlMode && ['live', 'modelled'].includes(urlMode) ? urlMode : defaultMode;
  });

  // Initialize metadata with defaults
  const [metadata, setMetadata] = useState<DataModeMetadata>(() => ({
    modelVersion: defaultMetadata.modelVersion || 'v0.3',
    dataSnapshotDate: defaultMetadata.dataSnapshotDate || new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    cacheHit: defaultMetadata.cacheHit || false
  }));

  const [isLoading, setIsLoading] = useState(false);

  // Update URL when mode changes
  const updateURL = useCallback((mode: 'live' | 'modelled') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dataMode', mode);
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    router.replace(newURL, { scroll: false });
  }, [router, searchParams]);

  // Handle mode change
  const handleModeChange = useCallback(async (newMode: 'live' | 'modelled') => {
    if (newMode === dataMode) return;

    setIsLoading(true);
    
    try {
      // Update URL immediately for responsive UI
      setDataMode(newMode);
      updateURL(newMode);

      // Generate new metadata for the mode change
      const newMetadata: DataModeMetadata = {
        modelVersion: newMode === 'live' ? 'v0.3' : 'v0.2', // Different versions for different modes
        dataSnapshotDate: newMode === 'live' 
          ? new Date().toISOString() 
          : '2025-10-01T00:00:00Z', // Fixed snapshot for modelled data
        generatedAt: new Date().toISOString(),
        cacheHit: false // New computation
      };

      setMetadata(newMetadata);
      
      // Notify parent component
      onModeChange?.(newMode, newMetadata);
      
    } catch (error) {
      console.error('Failed to change data mode:', error);
      // Revert on error
      setDataMode(dataMode);
      updateURL(dataMode);
    } finally {
      setIsLoading(false);
    }
  }, [dataMode, updateURL, onModeChange]);

  // Update metadata (called by parent when new data is received)
  const updateMetadata = useCallback((newMetadata: Partial<DataModeMetadata>) => {
    setMetadata(prev => ({
      ...prev,
      ...newMetadata,
      generatedAt: new Date().toISOString()
    }));
  }, []);

  // Get mode-specific configuration
  const getModeConfig = useCallback(() => {
    return {
      live: {
        icon: '🔴',
        title: 'Live Data',
        description: 'Current Subway network, openings, closures, performance',
        color: 'red',
        refreshInterval: 300000, // 5 minutes
        cacheTTL: 60000 // 1 minute
      },
      modelled: {
        icon: '📘',
        title: 'Modelled',
        description: 'Cached demographic or POI proxy data',
        color: 'blue',
        refreshInterval: 3600000, // 1 hour
        cacheTTL: 1800000 // 30 minutes
      }
    }[dataMode];
  }, [dataMode]);

  // Check if data is stale
  const isDataStale = useCallback((): boolean => {
    const config = getModeConfig();
    const generatedTime = new Date(metadata.generatedAt).getTime();
    const now = Date.now();
    
    return (now - generatedTime) > config.refreshInterval;
  }, [metadata.generatedAt, getModeConfig]);

  // Format metadata for display
  const getFormattedMetadata = useCallback(() => {
    return {
      modelVersion: metadata.modelVersion,
      dataSnapshotDate: metadata.dataSnapshotDate,
      generatedAt: metadata.generatedAt,
      formattedSnapshotDate: new Date(metadata.dataSnapshotDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      formattedGeneratedAt: new Date(metadata.generatedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      isStale: isDataStale(),
      cacheStatus: metadata.cacheHit ? 'hit' : 'miss'
    };
  }, [metadata, isDataStale]);

  // Validate mode
  const isValidMode = useCallback((mode: string): mode is 'live' | 'modelled' => {
    return mode === 'live' || mode === 'modelled';
  }, []);

  // Reset to default mode
  const resetToDefault = useCallback(() => {
    handleModeChange(defaultMode);
  }, [handleModeChange, defaultMode]);

  return {
    dataMode,
    metadata,
    isLoading,
    handleModeChange,
    updateMetadata,
    getModeConfig,
    isDataStale,
    getFormattedMetadata,
    isValidMode,
    resetToDefault,
    
    // Computed values
    isLiveMode: dataMode === 'live',
    isModelledMode: dataMode === 'modelled',
    modeConfig: getModeConfig(),
    formattedMetadata: getFormattedMetadata()
  };
};

export default useDataModeState;