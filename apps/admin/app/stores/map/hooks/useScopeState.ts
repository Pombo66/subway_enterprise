'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScopeSelection } from '../components/expansion/types';
import { validateCustomArea } from '../components/expansion/utils/areaCalculation';

interface UseScopeStateProps {
  onScopeChange?: (scope: ScopeSelection) => void;
  onRecomputeNeeded?: () => void;
}

export const useScopeState = ({
  onScopeChange,
  onRecomputeNeeded
}: UseScopeStateProps = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize scope from URL or default
  const [selectedScope, setSelectedScope] = useState<ScopeSelection>(() => {
    const scopeType = searchParams.get('scopeType') as 'country' | 'state' | 'custom_area' | null;
    const scopeValue = searchParams.get('scopeValue') || '';
    const scopePolygon = searchParams.get('scopePolygon');
    const scopeArea = searchParams.get('scopeArea');

    if (scopeType && ['country', 'state', 'custom_area'].includes(scopeType)) {
      let polygon: GeoJSON.Polygon | undefined;
      let area: number | undefined;

      // Parse custom area data from URL
      if (scopeType === 'custom_area' && scopePolygon && scopeArea) {
        try {
          polygon = JSON.parse(decodeURIComponent(scopePolygon));
          area = parseFloat(scopeArea);
          
          // Validate the polygon
          const validation = validateCustomArea(polygon);
          if (!validation.isValid) {
            console.warn('Invalid polygon from URL:', validation.error);
            polygon = undefined;
            area = undefined;
          }
        } catch (error) {
          console.warn('Failed to parse polygon from URL:', error);
        }
      }

      return {
        type: scopeType,
        value: scopeValue,
        polygon,
        area
      };
    }

    // Default scope
    return {
      type: 'country',
      value: '',
      polygon: undefined,
      area: undefined
    };
  });

  const [isRecomputeNeeded, setIsRecomputeNeeded] = useState(false);

  // Update URL when scope changes
  const updateURL = useCallback((scope: ScopeSelection) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Set basic scope parameters
    params.set('scopeType', scope.type);
    params.set('scopeValue', scope.value);
    
    // Handle custom area parameters
    if (scope.type === 'custom_area' && scope.polygon && scope.area) {
      params.set('scopePolygon', encodeURIComponent(JSON.stringify(scope.polygon)));
      params.set('scopeArea', scope.area.toString());
    } else {
      params.delete('scopePolygon');
      params.delete('scopeArea');
    }

    // Update URL without triggering navigation
    const newURL = `${window.location.pathname}?${params.toString()}`;
    router.replace(newURL, { scroll: false });
  }, [router, searchParams]);

  // Handle scope changes
  const handleScopeChange = useCallback((newScope: ScopeSelection) => {
    const hasChanged = (
      newScope.type !== selectedScope.type ||
      newScope.value !== selectedScope.value ||
      JSON.stringify(newScope.polygon) !== JSON.stringify(selectedScope.polygon)
    );

    if (hasChanged) {
      setSelectedScope(newScope);
      updateURL(newScope);
      setIsRecomputeNeeded(true);
      onScopeChange?.(newScope);
    }
  }, [selectedScope, updateURL, onScopeChange]);

  // Handle recompute trigger
  const triggerRecompute = useCallback(() => {
    if (isRecomputeNeeded) {
      setIsRecomputeNeeded(false);
      onRecomputeNeeded?.(selectedScope);
    }
  }, [isRecomputeNeeded, onRecomputeNeeded, selectedScope]);

  // Validate current scope
  const validateScope = useCallback((): { isValid: boolean; error?: string } => {
    if (!selectedScope.value && selectedScope.type !== 'custom_area') {
      return { isValid: false, error: 'Please select a scope' };
    }

    if (selectedScope.type === 'custom_area') {
      if (!selectedScope.polygon) {
        return { isValid: false, error: 'Please draw a custom area' };
      }
      return validateCustomArea(selectedScope.polygon);
    }

    return { isValid: true };
  }, [selectedScope]);

  // Get scope display name
  const getScopeDisplayName = useCallback((): string => {
    if (selectedScope.type === 'custom_area' && selectedScope.area) {
      return `Custom Area (${selectedScope.area.toFixed(0)} km²)`;
    }
    
    if (selectedScope.value) {
      return selectedScope.value;
    }
    
    return 'No scope selected';
  }, [selectedScope]);

  // Clear scope
  const clearScope = useCallback(() => {
    const defaultScope: ScopeSelection = {
      type: 'country',
      value: '',
      polygon: undefined,
      area: undefined
    };
    handleScopeChange(defaultScope);
  }, [handleScopeChange]);

  // Check if scope is ready for analysis
  const isScopeReady = useCallback((): boolean => {
    const validation = validateScope();
    return validation.isValid;
  }, [validateScope]);

  return {
    selectedScope,
    isRecomputeNeeded,
    handleScopeChange,
    triggerRecompute,
    validateScope,
    getScopeDisplayName,
    clearScope,
    isScopeReady
  };
};

export default useScopeState;