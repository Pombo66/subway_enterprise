'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MapViewport, 
  FilterState, 
  UseMapStateReturn, 
  DEFAULT_VIEWPORT, 
  DEFAULT_FILTERS,
  isValidViewport,
  isValidFilters
} from '../types';

/**
 * Custom hook for managing map state with URL synchronization
 * Handles viewport state, filter state, and selected store state
 * with debounced URL updates to prevent excessive history entries
 */
export const useMapState = (): UseMapStateReturn => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize state from URL parameters
  const initializeFromURL = useCallback(() => {
    const urlViewport = {
      latitude: parseFloat(searchParams.get('lat') || '') || DEFAULT_VIEWPORT.latitude,
      longitude: parseFloat(searchParams.get('lng') || '') || DEFAULT_VIEWPORT.longitude,
      zoom: parseFloat(searchParams.get('zoom') || '') || DEFAULT_VIEWPORT.zoom,
    };

    const urlFilters = {
      franchiseeId: searchParams.get('franchiseeId') || undefined,
      region: searchParams.get('region') || undefined,
      country: searchParams.get('country') || undefined,
    };

    const selectedStoreId = searchParams.get('selectedStore') || null;

    return {
      viewport: isValidViewport(urlViewport) ? urlViewport : DEFAULT_VIEWPORT,
      filters: isValidFilters(urlFilters) ? urlFilters : DEFAULT_FILTERS,
      selectedStoreId,
    };
  }, [searchParams]);

  // State initialization
  const initialState = initializeFromURL();
  const [viewport, setViewportState] = useState<MapViewport>(initialState.viewport);
  const [filters, setFiltersState] = useState<FilterState>(initialState.filters);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(initialState.selectedStoreId);

  // Debounced URL update function
  const updateURL = useCallback((
    newViewport: MapViewport,
    newFilters: FilterState,
    newSelectedStoreId: string | null
  ) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced update
    debounceTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();

      // Add viewport parameters
      params.set('lat', newViewport.latitude.toFixed(6));
      params.set('lng', newViewport.longitude.toFixed(6));
      params.set('zoom', newViewport.zoom.toFixed(2));

      // Add filter parameters
      if (newFilters.franchiseeId) {
        params.set('franchiseeId', newFilters.franchiseeId);
      }
      if (newFilters.region) {
        params.set('region', newFilters.region);
      }
      if (newFilters.country) {
        params.set('country', newFilters.country);
      }

      // Add selected store parameter
      if (newSelectedStoreId) {
        params.set('selectedStore', newSelectedStoreId);
      }

      // Update URL without triggering navigation
      const newURL = `${window.location.pathname}?${params.toString()}`;
      router.replace(newURL, { scroll: false });
    }, 300); // 300ms debounce delay
  }, [router]);

  // Viewport setter with URL sync
  const setViewport = useCallback((newViewport: MapViewport) => {
    if (!isValidViewport(newViewport)) {
      console.warn('Invalid viewport provided:', newViewport);
      return;
    }

    setViewportState(newViewport);
    updateURL(newViewport, filters, selectedStoreId);
  }, [filters, selectedStoreId, updateURL]);

  // Filters setter with URL sync
  const setFilters = useCallback((newFilters: FilterState) => {
    if (!isValidFilters(newFilters)) {
      console.warn('Invalid filters provided:', newFilters);
      return;
    }

    setFiltersState(newFilters);
    updateURL(viewport, newFilters, selectedStoreId);
  }, [viewport, selectedStoreId, updateURL]);

  // Selected store setter with URL sync
  const setSelectedStoreId = useCallback((newSelectedStoreId: string | null) => {
    setSelectedStoreIdState(newSelectedStoreId);
    updateURL(viewport, filters, newSelectedStoreId);
  }, [viewport, filters, updateURL]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newState = initializeFromURL();
      setViewportState(newState.viewport);
      setFiltersState(newState.filters);
      setSelectedStoreIdState(newState.selectedStoreId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initializeFromURL]);

  return {
    viewport,
    filters,
    selectedStoreId,
    setViewport,
    setFilters,
    setSelectedStoreId,
  };
};