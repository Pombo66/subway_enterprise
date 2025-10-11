/**
 * Map-specific TypeScript interfaces for the Living Map feature
 */

// Core map viewport interface
export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

// Filter state for store visibility
export interface FilterState {
  franchiseeId?: string;
  region?: string;
  country?: string;
}

// Available filter options
export interface FilterOptions {
  franchisees: Array<{ id: string; name: string }>;
  regions: string[];
  countries: string[];
}

// Store with activity indicators
export interface StoreWithActivity {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string;
  country: string;
  franchiseeId?: string;
  status?: 'active' | 'inactive';
  recentActivity: boolean;
  __mockActivity?: boolean; // Debug flag for mock data
}

// KPI data structure for store drawer
export interface StoreKPIs {
  ordersToday: number;
  revenueToday: number;
  lastOrderTime: string | null;
  lastOrderRelative: string; // e.g., "2 minutes ago"
}

// Recent orders response for activity computation
export interface RecentOrdersResponse {
  storeId: string;
  hasRecentActivity: boolean;
  lastOrderTime?: string;
  orderCount?: number;
}

// Telemetry event types for map interactions
export interface MapTelemetryEvents {
  map_view_opened: {
    timestamp: string;
    initialViewport: MapViewport;
    initialFilters: FilterState;
    storeCount: number;
  };
  
  map_filter_changed: {
    timestamp: string;
    changedKeys: string[];
    newFilters: FilterState;
    previousFilters: FilterState;
    resultingStoreCount: number;
  };
  
  map_store_opened: {
    timestamp: string;
    storeId: string;
    storeName: string;
    viewport: MapViewport;
    hasRecentActivity: boolean;
  };
  
  map_refresh_tick: {
    timestamp: string;
    visibleStoreCount: number;
    activeStoreCount: number;
    currentFilters: FilterState;
    refreshDuration: number;
  };
}

// Component prop interfaces
export interface MapViewProps {
  stores: StoreWithActivity[];
  onStoreSelect: (store: StoreWithActivity) => void;
  viewport: MapViewport;
  onViewportChange: (viewport: MapViewport) => void;
  loading?: boolean;
}

export interface MapFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableOptions: FilterOptions;
  loading?: boolean;
}

export interface StoreDrawerProps {
  store: StoreWithActivity | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDetails: (storeId: string) => void;
  kpis?: StoreKPIs;
  loadingKpis?: boolean;
}

// Hook return types
export interface UseMapStateReturn {
  viewport: MapViewport;
  filters: FilterState;
  selectedStoreId: string | null;
  setViewport: (viewport: MapViewport) => void;
  setFilters: (filters: FilterState) => void;
  setSelectedStoreId: (id: string | null) => void;
}

export interface UseStoresReturn {
  stores: StoreWithActivity[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  availableOptions: FilterOptions;
}

// Default values
export const DEFAULT_VIEWPORT: MapViewport = {
  latitude: 40.7128, // New York City as default center
  longitude: -74.0060,
  zoom: 4
};

export const DEFAULT_FILTERS: FilterState = {};

// Type guards
export const isValidViewport = (viewport: any): viewport is MapViewport => {
  return (
    typeof viewport === 'object' &&
    typeof viewport.latitude === 'number' &&
    typeof viewport.longitude === 'number' &&
    typeof viewport.zoom === 'number' &&
    viewport.latitude >= -90 &&
    viewport.latitude <= 90 &&
    viewport.longitude >= -180 &&
    viewport.longitude <= 180 &&
    viewport.zoom >= 0 &&
    viewport.zoom <= 20
  );
};

export const isValidFilters = (filters: any): filters is FilterState => {
  return (
    typeof filters === 'object' &&
    (filters.franchiseeId === undefined || typeof filters.franchiseeId === 'string') &&
    (filters.region === undefined || typeof filters.region === 'string') &&
    (filters.country === undefined || typeof filters.country === 'string')
  );
};