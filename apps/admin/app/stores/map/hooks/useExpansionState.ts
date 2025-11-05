'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { 
  ExpansionRecommendation, 
  RegionConfig, 
  DEFAULT_REGION_CONFIGS, 
  DEFAULT_EXPANSION_MODE 
} from '../components/expansion/types';

export interface UseExpansionStateReturn {
  isExpansionMode: boolean;
  currentMode: 'live' | 'model';
  regionConfigs: RegionConfig[];
  selectedRecommendation: ExpansionRecommendation | null;
  setExpansionMode: (enabled: boolean) => void;
  setCurrentMode: (mode: 'live' | 'model') => void;
  setRegionTarget: (region: string, target: number) => void;
  setSelectedRecommendation: (recommendation: ExpansionRecommendation | null) => void;
}

/**
 * Hook for managing expansion predictor state with URL persistence
 */
export function useExpansionState(): UseExpansionStateReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL parameters
  const [isExpansionMode, setIsExpansionModeState] = useState(() => {
    const expansionParam = searchParams.get('expansion');
    console.log('🎯 Initializing expansion mode from URL:', expansionParam, 'Result:', expansionParam === 'true');
    return expansionParam === 'true';
  });

  const [currentMode, setCurrentModeState] = useState<'live' | 'model'>(() => {
    const mode = searchParams.get('expansionMode');
    return mode === 'model' ? 'model' : DEFAULT_EXPANSION_MODE;
  });

  const [regionConfigs, setRegionConfigs] = useState<RegionConfig[]>(() => {
    // Try to restore region targets from URL
    const restoredConfigs = DEFAULT_REGION_CONFIGS.map(config => {
      const urlTarget = searchParams.get(`${config.name.toLowerCase()}Target`);
      const target = urlTarget ? parseInt(urlTarget, 10) : config.target;
      
      return {
        ...config,
        target: isNaN(target) ? config.target : Math.min(Math.max(0, target), config.maxStores),
        gap: target - config.current
      };
    });
    
    return restoredConfigs;
  });

  const [selectedRecommendation, setSelectedRecommendation] = useState<ExpansionRecommendation | null>(null);

  // Monitor URL parameter changes
  useEffect(() => {
    const expansionParam = searchParams.get('expansion');
    const shouldBeExpansionMode = expansionParam === 'true';
    console.log('🎯 URL params changed - expansion param:', expansionParam, 'Should be expansion mode:', shouldBeExpansionMode, 'Current state:', isExpansionMode);
    
    // Only sync from URL to state if the URL explicitly has expansion=true or expansion=false
    // Don't turn off expansion mode just because the parameter is missing (null)
    if (expansionParam !== null && shouldBeExpansionMode !== isExpansionMode) {
      console.log('🎯 URL and state mismatch! Updating state to match URL');
      setIsExpansionModeState(shouldBeExpansionMode);
    } else if (expansionParam === null && isExpansionMode) {
      console.log('🎯 Expansion parameter missing from URL but expansion mode is active. Restoring URL parameter.');
      // Restore the expansion parameter to the URL if it's missing but we're in expansion mode
      const params = new URLSearchParams(searchParams.toString());
      params.set('expansion', 'true');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, isExpansionMode, pathname, router]);

  // Update URL when expansion mode changes
  const setExpansionMode = useCallback((enabled: boolean) => {
    console.log('🎯 setExpansionMode called with:', enabled, 'Stack trace:', new Error().stack);
    setIsExpansionModeState(enabled);
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (enabled) {
      params.set('expansion', 'true');
    } else {
      params.delete('expansion');
      // Clear expansion-related parameters when disabling
      params.delete('expansionMode');
      regionConfigs.forEach(config => {
        params.delete(`${config.name.toLowerCase()}Target`);
      });
    }
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router, regionConfigs]);

  // Update URL when mode changes
  const setCurrentMode = useCallback((mode: 'live' | 'model') => {
    setCurrentModeState(mode);
    
    if (isExpansionMode) {
      const params = new URLSearchParams(searchParams.toString());
      
      if (mode !== DEFAULT_EXPANSION_MODE) {
        params.set('expansionMode', mode);
      } else {
        params.delete('expansionMode');
      }
      
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [isExpansionMode, searchParams, pathname, router]);

  // Update region target and URL
  const setRegionTarget = useCallback((region: string, target: number) => {
    setRegionConfigs(prev => {
      const updated = prev.map(config => {
        if (config.name === region) {
          const clampedTarget = Math.min(Math.max(0, target), config.maxStores);
          return {
            ...config,
            target: clampedTarget,
            gap: clampedTarget - config.current
          };
        }
        return config;
      });
      
      // Update URL with new target
      if (isExpansionMode) {
        const params = new URLSearchParams(searchParams.toString());
        const defaultConfig = DEFAULT_REGION_CONFIGS.find(c => c.name === region);
        
        if (defaultConfig && target !== defaultConfig.target) {
          params.set(`${region.toLowerCase()}Target`, target.toString());
        } else {
          params.delete(`${region.toLowerCase()}Target`);
        }
        
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
      
      return updated;
    });
  }, [isExpansionMode, searchParams, pathname, router]);

  // Update current store counts (this would typically come from an API)
  const updateCurrentCounts = useCallback((counts: Record<string, number>) => {
    setRegionConfigs(prev => 
      prev.map(config => ({
        ...config,
        current: counts[config.name] || config.current,
        gap: config.target - (counts[config.name] || config.current)
      }))
    );
  }, []);

  // Sync with URL changes (for browser back/forward)
  useEffect(() => {
    const expansionEnabled = searchParams.get('expansion') === 'true';
    const mode = searchParams.get('expansionMode');
    
    setIsExpansionModeState(expansionEnabled);
    setCurrentModeState(mode === 'model' ? 'model' : DEFAULT_EXPANSION_MODE);
    
    // Update region targets from URL
    setRegionConfigs(prev => 
      prev.map(config => {
        const urlTarget = searchParams.get(`${config.name.toLowerCase()}Target`);
        if (urlTarget) {
          const target = parseInt(urlTarget, 10);
          if (!isNaN(target)) {
            return {
              ...config,
              target: Math.min(Math.max(0, target), config.maxStores),
              gap: target - config.current
            };
          }
        }
        return config;
      })
    );
  }, [searchParams]);

  return {
    isExpansionMode,
    currentMode,
    regionConfigs,
    selectedRecommendation,
    setExpansionMode,
    setCurrentMode,
    setRegionTarget,
    setSelectedRecommendation
  };
}