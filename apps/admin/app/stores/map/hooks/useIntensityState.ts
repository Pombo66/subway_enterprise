'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface UseIntensityStateProps {
  onIntensityChange?: (intensity: number) => void;
  onRecomputeNeeded?: (intensity: number) => void;
  debounceMs?: number;
  defaultIntensity?: number;
}

export const useIntensityState = ({
  onIntensityChange,
  onRecomputeNeeded,
  debounceMs = 500, // 400-600ms as specified
  defaultIntensity = 50
}: UseIntensityStateProps = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize intensity from URL or default
  const [intensity, setIntensity] = useState(() => {
    const urlIntensity = searchParams.get('intensity');
    return urlIntensity ? parseInt(urlIntensity, 10) : defaultIntensity;
  });
  
  const [isLocked, setIsLocked] = useState(false);
  const [isRecomputeNeeded, setIsRecomputeNeeded] = useState(false);
  const [capacityEstimate, setCapacityEstimate] = useState(0);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastIntensityRef = useRef(intensity);

  // Update URL when intensity changes
  const updateURL = useCallback((newIntensity: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('intensity', newIntensity.toString());
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    router.replace(newURL, { scroll: false });
  }, [router, searchParams]);

  // Debounced intensity change handler
  const handleIntensityChange = useCallback((newIntensity: number) => {
    // Clamp intensity to valid range
    const clampedIntensity = Math.max(0, Math.min(100, newIntensity));
    
    // Don't process if locked or no change
    if (isLocked || clampedIntensity === intensity) {
      return;
    }

    setIntensity(clampedIntensity);
    updateURL(clampedIntensity);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set up debounced callback
    debounceTimeoutRef.current = setTimeout(() => {
      if (clampedIntensity !== lastIntensityRef.current) {
        lastIntensityRef.current = clampedIntensity;
        setIsRecomputeNeeded(true);
        onIntensityChange?.(clampedIntensity);
      }
    }, debounceMs);
  }, [intensity, isLocked, debounceMs, onIntensityChange, updateURL]);

  // Manual recompute trigger
  const triggerRecompute = useCallback(() => {
    if (isLocked) return;
    
    // Clear any pending debounced calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    setIsRecomputeNeeded(false);
    onRecomputeNeeded?.(intensity);
  }, [intensity, isLocked, onRecomputeNeeded]);

  // Toggle lock state
  const toggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    
    // If unlocking and there's a pending change, trigger it
    if (isLocked && isRecomputeNeeded) {
      setTimeout(() => {
        triggerRecompute();
      }, 100);
    }
  }, [isLocked, isRecomputeNeeded, triggerRecompute]);

  // Calculate target suggestions based on intensity and capacity
  const calculateTargetSuggestions = useCallback((intensityValue: number, capacity: number): number => {
    if (capacity === 0) return 0;
    
    // Linear scaling: 0% = 0 suggestions, 100% = full capacity
    const targetCount = Math.round((intensityValue / 100) * capacity);
    
    // Apply absolute cap of 300 visible suggestions
    return Math.min(targetCount, 300);
  }, []);

  // Update capacity estimate (would be called from parent component)
  const updateCapacityEstimate = useCallback((newCapacity: number) => {
    setCapacityEstimate(Math.max(0, newCapacity));
  }, []);

  // Get current target suggestions
  const targetSuggestions = calculateTargetSuggestions(intensity, capacityEstimate);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Auto-trigger recompute when needed (after debounce period)
  useEffect(() => {
    if (isRecomputeNeeded && !isLocked) {
      const autoRecomputeTimeout = setTimeout(() => {
        triggerRecompute();
      }, 100); // Small delay to allow for UI updates

      return () => clearTimeout(autoRecomputeTimeout);
    }
  }, [isRecomputeNeeded, isLocked, triggerRecompute]);

  return {
    intensity,
    isLocked,
    isRecomputeNeeded,
    capacityEstimate,
    targetSuggestions,
    handleIntensityChange,
    triggerRecompute,
    toggleLock,
    updateCapacityEstimate,
    
    // Computed values
    isAtMinimum: intensity === 0,
    isAtMaximum: intensity === 100,
    intensityLevel: intensity < 30 ? 'conservative' : intensity < 70 ? 'balanced' : 'aggressive',
    
    // Helper functions
    setIntensityDirect: (value: number) => {
      const clampedValue = Math.max(0, Math.min(100, value));
      setIntensity(clampedValue);
      updateURL(clampedValue);
    },
    
    resetToDefault: () => {
      handleIntensityChange(defaultIntensity);
    }
  };
};

export default useIntensityState;