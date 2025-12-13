'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMapState } from '../hooks/useMapState';
import { useStores } from '../hooks/useStores';
import MapFilters from './MapFilters';
import StoreDrawer from './StoreDrawer';
import TabNavigation from '../../components/TabNavigation';
import { SimpleErrorBoundary } from './SimpleErrorBoundary';
import { MapLoadingSkeleton, FilterLoadingSkeleton, ErrorStateWithRetry } from './LoadingSkeletons';
import WorkingMapView from './WorkingMapView';
import StorePerformanceTable from './StorePerformanceTable';
import ExpansionControls, { ExpansionParams } from './ExpansionControls';
import SuggestionMarker, { ExpansionSuggestion } from './SuggestionMarker';
import SuggestionInfoCard from './SuggestionInfoCard';
import AIIndicatorLegend from './AIIndicatorLegend';
import StrategicAnalysisPanel from './StrategicAnalysisPanel';
import QuadrantSelector, { Quadrant } from './QuadrantSelector';
import StoreAnalysisControls, { StoreAnalysisParams } from './StoreAnalysisControls';
import StoreAnalysisResults from './StoreAnalysisResults';
import { filterStoresByQuadrant, countStoresByQuadrant, getQuadrantBounds } from '../utils/quadrant-utils';
import { onStoresImported } from '../../../../lib/events/store-events';
import { ExpansionJobRecovery } from '../../../../lib/utils/expansion-job-recovery';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import JobStatusIndicator from './JobStatusIndicator';
import { subMindContext, formatStoreDataForSubMind, formatExpansionDataForSubMind } from '../../../../lib/submind-context';


export default function ExpansionIntegratedMapPage() {
  const router = useRouter();
  
  // Use existing hooks for map state and store data
  const { viewport, filters, selectedStoreId, setViewport, setFilters, setSelectedStoreId } = useMapState();
  const { stores, loading: storesLoading, error: storesError, availableOptions, refetch, cacheStatus, invalidateCache } = useStores(filters);
  
  // Expansion-specific state
  const [expansionMode, setExpansionMode] = useState(false);
  const [suggestions, setSuggestions] = useState<ExpansionSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ExpansionSuggestion | null>(null);
  const [expansionLoading, setExpansionLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJobEstimate, setCurrentJobEstimate] = useState<{ tokens: number; cost: number } | null>(null);
  const [scenarios, setScenarios] = useState<Array<{ id: string; label: string; createdAt: Date }>>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [strategicAnalysis, setStrategicAnalysis] = useState<{ marketGaps: string; recommendations: string } | null>(null);
  
  // Competitor intelligence state - SIMPLE ARCHITECTURE WITHOUT CIRCULAR DEPENDENCIES
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Store analysis state
  const [analysisMode, setAnalysisMode] = useState(false);
  const [storeAnalyses, setStoreAnalyses] = useState<any[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [currentAnalysisJobId, setCurrentAnalysisJobId] = useState<string | null>(null);
  
  // Quadrant view state
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>('ALL');

  // Check for recoverable jobs on page load
  useEffect(() => {
    ExpansionJobRecovery.cleanup();
    const recoverableJobs = ExpansionJobRecovery.getRecoverableJobs();
    if (recoverableJobs.length > 0) {
      ExpansionJobRecovery.showRecoveryNotification(recoverableJobs);
    }
  }, []);

  // Fix map viewport when suggestion card opens/closes
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      // Trigger a window resize event to make Mapbox recalculate its viewport
      window.dispatchEvent(new Event('resize'));
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedSuggestion]); // Re-run when suggestion selection changes

  // Register context with SubMind so it can see real page data
  useEffect(() => {
    const storeData = formatStoreDataForSubMind(stores);
    const expansionData = expansionMode ? formatExpansionDataForSubMind(suggestions, filters.region) : null;
    
    subMindContext.setContext({
      screen: expansionMode ? 'expansion_map' : 'stores_map',
      data: {
        stores: storeData,
        expansion: expansionData,
        filters: {
          region: filters.region,
          country: filters.country,
          status: filters.status,
        },
        viewport: {
          center: [viewport.longitude, viewport.latitude],
          zoom: viewport.zoom,
        },
        quadrant: selectedQuadrant !== 'ALL' ? selectedQuadrant : null,
      },
      scope: {
        region: filters.region,
        country: filters.country,
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: cacheStatus?.source || 'api',
      },
    });

    return () => {
      // Clear context when component unmounts
      subMindContext.clearContext();
    };
  }, [stores, suggestions, expansionMode, filters, viewport, selectedQuadrant, cacheStatus]);

  // Smart competitor refresh function - refreshes current viewport area only
  const handleRefreshCompetitors = useCallback(async () => {
    if (competitorsLoading) {
      console.log('🏢 Competitor refresh already in progress, skipping');
      return;
    }
    
    // Check zoom level
    if (viewport.zoom < 12) {
      alert(`Please zoom in closer to refresh competitors.\n\nCurrent zoom: ${viewport.zoom.toFixed(1)}\nRequired: 12.0 or higher\n\nZoom in to city/neighborhood level to see competitor locations.`);
      return;
    }
    
    // Calculate smart refresh radius based on zoom level
    const refreshRadiusMeters = Math.min(5000, Math.max(500, 10000 / viewport.zoom));
    const refreshRadiusKm = (refreshRadiusMeters / 1000).toFixed(1);
    
    const confirmed = confirm(
      `Refresh competitor data for current viewport?\n\n` +
      `📍 Center: ${viewport.latitude.toFixed(4)}, ${viewport.longitude.toFixed(4)}\n` +
      `📏 Search radius: ${refreshRadiusKm}km\n` +
      `🔍 Zoom level: ${viewport.zoom.toFixed(1)}\n\n` +
      `This will search for QSR competitors (McDonald's, KFC, etc.) using Mapbox POI data. ` +
      `Only the visible area will be refreshed for optimal performance.`
    );
    
    if (!confirmed) return;
    
    console.log('🏢 Starting smart competitor refresh...', {
      center: [viewport.latitude, viewport.longitude],
      radiusMeters: refreshRadiusMeters,
      radiusKm: refreshRadiusKm,
      zoom: viewport.zoom
    });
    
    setCompetitorsLoading(true);
    try {
      const response = await fetch('/api/competitors/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: viewport.latitude,
          longitude: viewport.longitude,
          radiusMeters: refreshRadiusMeters,
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🏢 Smart competitor refresh result:', result);
        alert(`✅ Competitor refresh completed!\n\n📊 Results for ${refreshRadiusKm}km radius:\n• Found: ${result.result?.found || 0} QSR locations\n• Added: ${result.result?.added || 0} new competitors\n• Updated: ${result.result?.updated || 0} existing competitors\n\n🏢 Brands: McDonald's, KFC, Burger King, Starbucks, and other major QSR chains.`);
        
        // Reload competitors for current viewport
        await loadCompetitors();
      } else {
        const error = await response.json();
        console.error('❌ Competitor refresh failed:', error);
        alert(`❌ Competitor refresh failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Competitor refresh error:', error);
      alert('❌ Network error during competitor refresh');
    } finally {
      setCompetitorsLoading(false);
    }
  }, [competitorsLoading, viewport.latitude, viewport.longitude, viewport.zoom, loadCompetitors]);

  // Listen for store import events and refresh map data
  useEffect(() => {
    const unsubscribe = onStoresImported((event) => {
      console.log('🗺️ Expansion map: Received stores-imported event');
      refetch();
    });

    const handleStoreUpdate = (event: CustomEvent) => {
      console.log('🗺️ Expansion map: Received store-updated event');
      refetch();
    };

    const handleRefreshCompetitorsEvent = (event: CustomEvent) => {
      console.log('🏢 Expansion map: Received refreshCompetitors event');
      handleRefreshCompetitors();
    };

    window.addEventListener('store-updated', handleStoreUpdate as EventListener);
    window.addEventListener('refreshCompetitors', handleRefreshCompetitorsEvent as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener('store-updated', handleStoreUpdate as EventListener);
      window.removeEventListener('refreshCompetitors', handleRefreshCompetitorsEvent as EventListener);
    };
  }, [refetch, handleRefreshCompetitors]);

  const loadScenarios = async () => {
    try {
      const response = await fetch('/api/expansion/scenarios');
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios || []);
      }
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    }
  };

  // Load scenarios on mount
  useEffect(() => {
    loadScenarios();
  }, []);

  // Smart viewport-based competitor loading - only loads competitors in current view
  const loadCompetitors = useCallback(async () => {
    const shouldShowCompetitors = filters.statusFilters?.showCompetitors !== false;
    if (!shouldShowCompetitors) {
      setCompetitors([]);
      return;
    }
    
    // Only load competitors when zoomed in to city/neighborhood level (zoom >= 12)
    if (viewport.zoom < 12) {
      console.log('🏢 Competitors hidden - zoom level too low:', viewport.zoom, '(need >= 12)');
      setCompetitors([]);
      return;
    }
    
    setCompetitorsLoading(true);
    try {
      // Calculate viewport-based radius (adaptive based on zoom level)
      // Higher zoom = smaller radius for better performance
      const radiusKm = Math.min(50, Math.max(2, 100 / viewport.zoom)); // 2-50km range
      
      console.log('🏢 Loading competitors in viewport:', {
        center: [viewport.latitude, viewport.longitude],
        zoom: viewport.zoom,
        radiusKm: radiusKm.toFixed(1)
      });
      
      // Build query parameters for viewport-based loading
      const params = new URLSearchParams({
        lat: viewport.latitude.toString(),
        lng: viewport.longitude.toString(),
        radius: radiusKm.toString()
      });
      
      // Add brand/category filters if selected
      if (filters.competitorBrand) {
        params.append('brand', filters.competitorBrand);
      }
      if (filters.competitorCategory) {
        params.append('category', filters.competitorCategory);
      }
      
      const response = await fetch(`/api/competitors?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const viewportCompetitors = data.competitors || [];
        console.log('🏢 Loaded viewport competitors:', {
          count: viewportCompetitors.length,
          radiusKm: radiusKm.toFixed(1),
          center: `${viewport.latitude.toFixed(4)}, ${viewport.longitude.toFixed(4)}`,
          zoom: viewport.zoom.toFixed(1)
        });
        
        setCompetitors(viewportCompetitors);

        // Extract unique brands and categories from viewport data
        const uniqueBrands = [...new Set(viewportCompetitors.map((c: any) => c.brand).filter(Boolean))];
        const uniqueCategories = [...new Set(viewportCompetitors.map((c: any) => c.category).filter(Boolean))];
        setBrands(uniqueBrands);
        setCategories(uniqueCategories);
        
        if (viewportCompetitors.length === 0) {
          console.log('🏢 No competitors in viewport - try refreshing competitor data or zooming to a different area');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🏢 Failed to load viewport competitors:', response.status, errorData);
      }
    } catch (error) {
      console.error('Failed to load viewport competitors:', error);
    } finally {
      setCompetitorsLoading(false);
    }
  }, [filters.statusFilters?.showCompetitors, viewport.zoom, viewport.latitude, viewport.longitude, filters.competitorBrand, filters.competitorCategory]);

  // Update showCompetitors state when filter changes
  useEffect(() => {
    const shouldShowCompetitors = filters.statusFilters?.showCompetitors !== false;
    setShowCompetitors(shouldShowCompetitors);
  }, [filters.statusFilters?.showCompetitors]);

  // Debounced competitor loading to prevent excessive API calls during pan/zoom
  useEffect(() => {
    // Debounce viewport changes to avoid hammering the API
    const timeoutId = setTimeout(() => {
      loadCompetitors();
    }, 500); // 500ms delay after user stops panning/zooming
    
    return () => clearTimeout(timeoutId);
  }, [loadCompetitors]);

  const handleGenerate = useCallback(async (params: ExpansionParams) => {
    setExpansionLoading(true);
    
    // Check if this is country-wide generation
    const isCountryWide = params.region?.country && !params.region?.state;
    
    if (isCountryWide) {
      console.log('🇩🇪 Country-wide generation detected - using land mask');
    }
    
    try {
      // Generate idempotency key
      const idempotencyKey = globalThis.crypto?.randomUUID() || `${Date.now()}-${Math.random()}`;
      
      // Start the job
      const response = await fetch('/api/expansion/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        let errorMessage = data.message || 'Failed to generate suggestions';

        switch (data.code) {
          case 'NO_STORES':
            errorMessage = 'No stores found in the selected region. Try adjusting your filters or selecting a different area.';
            break;
          case 'DATABASE_UNAVAILABLE':
            errorMessage = 'Database connection failed. Please try again in a moment.';
            break;
          case 'DATABASE_ERROR':
            errorMessage = 'A database error occurred. Please try again.';
            break;
          case 'COST_LIMIT_EXCEEDED':
            errorMessage = `${data.message}\n\nEstimated cost: £${data.estimate.cost}`;
            break;
          case 'MISSING_IDEMPOTENCY_KEY':
            errorMessage = 'Request configuration error. Please refresh and try again.';
            break;
          case 'INTERNAL_ERROR':
            errorMessage = `An unexpected error occurred. Request ID: ${data.requestId}. Please contact support if this persists.`;
            break;
        }

        alert(errorMessage);
        console.error('Generation error:', data);
        return;
      }

      // Job started successfully - store job ID and poll for results
      const { jobId, isReused, estimate } = data;
      const storageKey = ExpansionJobRecovery.storeJob(jobId, params);
      
      setCurrentJobId(jobId);
      setCurrentJobEstimate(estimate || null);
      
      console.log(`🚀 Job ${isReused ? 'reused' : 'started'}: ${jobId}`, {
        estimate: estimate ? `${estimate.tokens} tokens, £${estimate.cost}` : 'N/A'
      });

      // Poll for job completion
      const result = await pollJobCompletion(jobId, storageKey);
      
      if (result) {
        setSuggestions(result.suggestions || []);

        // Capture strategic analysis if available
        if (result.metadata?.strategicAnalysis) {
          setStrategicAnalysis(result.metadata.strategicAnalysis);
          console.log('📊 Strategic analysis captured:', result.metadata.strategicAnalysis);
        }

        // Show success message with metadata
        const { metadata } = result;
        const isCountryWideResult = metadata.generationMode?.isCountryWide;
        
        console.log('✅ Generation successful:', {
          suggestions: result.suggestions.length,
          generationTimeMs: metadata.generationTimeMs,
          isCountryWide: isCountryWideResult,
          landMaskApplied: metadata.generationMode?.landMaskApplied,
          enhancedValidation: metadata.generationMode?.enhancedValidation,
          acceptanceRate: metadata.expansionStats?.acceptanceRate,
          cacheHitRate: metadata.cacheHitRate,
          hasStrategicAnalysis: !!metadata.strategicAnalysis
        });

        // Debug: Log the first suggestion to see its structure
        if (result.suggestions && result.suggestions.length > 0) {
          console.log('🔍 First suggestion structure:', result.suggestions[0]);
          console.log('🔍 Has locationContext:', !!result.suggestions[0].locationContext);
          console.log('🔍 Has aiInsights:', !!result.suggestions[0].aiInsights);
          console.log('🔍 Has intensityMetadata:', !!result.suggestions[0].intensityMetadata);
        }

        let successMessage = `Generated ${result.suggestions.length} suggestions in ${Math.round(metadata.generationTimeMs / 1000)}s`;
        
        if (isCountryWideResult) {
          successMessage += `\n🏝️ Country-wide generation used land mask - offshore tiles skipped`;
        }
        
        if (metadata.expansionStats?.acceptanceRate) {
          successMessage += `\n📊 Acceptance rate: ${metadata.expansionStats.acceptanceRate}%`;
        }

        alert(successMessage);
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      
      if (error.name === 'AbortError') {
        alert('Generation was cancelled due to network issues. The job may still be running in the background.');
      } else if (error.message?.includes('ERR_NETWORK_IO_SUSPENDED')) {
        alert('Connection paused; job continues in background. We\'ll resume when online.');
      } else {
        alert('Network error. Please check your connection and try again.');
      }
    } finally {
      setExpansionLoading(false);
      setCurrentJobId(null);
      setCurrentJobEstimate(null);
    }
  }, []);

  // Helper function to poll job completion
  const pollJobCompletion = async (jobId: string, storageKey: string): Promise<any> => {
    const maxAttempts = 180; // 15 minutes max (5s intervals) - country-wide expansions can take 8-10 minutes
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per request
        
        const response = await fetch(`/api/expansion/jobs/${jobId}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const jobData = await response.json();
        
        console.log(`📊 Job ${jobId} status: ${jobData.status}`, {
          attempt: attempts + 1,
          duration: jobData.duration ? `${Math.round(jobData.duration / 1000)}s` : 'N/A'
        });
        
        if (jobData.status === 'completed') {
          ExpansionJobRecovery.removeJob(storageKey);
          return jobData.result;
        }
        
        if (jobData.status === 'failed') {
          ExpansionJobRecovery.removeJob(storageKey);
          throw new Error(jobData.error || 'Job failed');
        }
        
        // Still running - wait and retry
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('⏰ Job poll timeout, retrying...');
          attempts++;
          continue;
        }
        
        // Network error - wait longer and retry
        console.warn('🔄 Network error polling job, retrying...', error.message);
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }
    
    // Timeout reached - but job may still be running
    console.warn(`⏰ Polling timeout for job ${jobId} after ${maxAttempts * 5}s. Job may still be processing.`);
    
    // Don't remove from recovery storage - user can check back later
    throw new Error(
      `Job is taking longer than expected (>${Math.floor(maxAttempts * 5 / 60)} minutes). ` +
      `Large country-wide expansions can take 10-15 minutes. ` +
      `The job is still running in the background. Please check back in a few minutes or refresh the page.`
    );
  };

  const handleSaveScenario = useCallback(async (label: string, params: ExpansionParams) => {
    try {
      const response = await fetch('/api/expansion/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          regionFilter: params.region,
          aggressionLevel: params.aggression,
          populationBias: params.populationBias,
          proximityBias: params.proximityBias,
          turnoverBias: params.turnoverBias,
          minDistanceM: params.minDistanceM,
          seed: params.seed,
          suggestions
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Save scenario failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || errorData.message || `Failed to save scenario (${response.status})`);
      }

      const result = await response.json();
      console.log('Scenario saved successfully:', result);
      alert('Scenario saved successfully!');
      await loadScenarios();
    } catch (error: any) {
      console.error('Save scenario error:', error);
      alert(`Failed to save scenario: ${error.message}`);
    }
  }, [suggestions]);

  const handleLoadScenario = useCallback(async (scenarioId: string) => {
    setExpansionLoading(true);
    
    try {
      const response = await fetch(`/api/expansion/scenarios/${scenarioId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load scenario');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      console.error('Load scenario error:', error);
      alert(`Failed to load scenario: ${error.message}`);
    } finally {
      setExpansionLoading(false);
    }
  }, []);

  const handleSaveAsPlannedStore = useCallback(async () => {
    if (!selectedSuggestion) return;

    try {
      const response = await fetch('/api/stores/planned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion: selectedSuggestion,
          scenarioId: null // Scenarios are separate from planned stores
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save as planned store');
      }

      const data = await response.json();
      console.log('✅ Saved as planned store:', data.store);

      // Close the info card
      setSelectedSuggestion(null);

      // Refresh stores to show the new planned store
      await refetch();

      alert(`✅ Saved as planned store!\n\nThe location will now appear on the map with a purple ring and will be considered in future expansion analysis.`);
    } catch (error: any) {
      console.error('Save as planned store error:', error);
      alert(`Failed to save as planned store: ${error.message}`);
    }
  }, [selectedSuggestion, refetch]);

  const handleStatusChange = useCallback(async (suggestionId: string, status: 'NEW' | 'APPROVED' | 'REJECTED' | 'HOLD') => {
    try {
      const response = await fetch(`/api/expansion/suggestions/${suggestionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setSuggestions(prev => prev.map(s => 
        s.id === suggestionId ? { ...s, status } : s
      ));

      if (selectedSuggestion?.id === suggestionId) {
        setSelectedSuggestion(prev => prev ? { ...prev, status } : null);
      }
    } catch (error: any) {
      console.error('Status update error:', error);
      alert(`Failed to update status: ${error.message}`);
    }
  }, [selectedSuggestion]);

  // Store Analysis Functions
  const handleAnalyzeStores = useCallback(async (params: StoreAnalysisParams) => {
    try {
      setAnalysisLoading(true);
      console.log('🔍 Starting store analysis:', params);

      const response = await fetch('/api/store-analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      setCurrentAnalysisJobId(result.jobId);
      
      console.log('✅ Analysis job created:', result.jobId);
      
      // Start polling for results
      pollAnalysisJob(result.jobId);
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setAnalysisLoading(false);
      alert('Failed to start analysis. Please try again.');
    }
  }, []);

  const pollAnalysisJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/store-analysis/jobs/${jobId}`);
      const job = await response.json();

      console.log(`📊 Analysis job ${jobId} status: ${job.status}`);

      if (job.status === 'completed') {
        setAnalysisLoading(false);
        setCurrentAnalysisJobId(null);
        
        if (job.result?.analyses) {
          setStoreAnalyses(job.result.analyses);
          console.log(`✅ Analysis completed: ${job.result.analyses.length} stores analyzed`);
        }
      } else if (job.status === 'failed') {
        setAnalysisLoading(false);
        setCurrentAnalysisJobId(null);
        console.error('❌ Analysis job failed:', job.error);
        alert(`Analysis failed: ${job.error}`);
      } else {
        // Still processing, poll again
        setTimeout(() => pollAnalysisJob(jobId), 3000);
      }
    } catch (error) {
      console.error('❌ Error polling analysis job:', error);
      setAnalysisLoading(false);
      setCurrentAnalysisJobId(null);
    }
  }, []);

  // Store selection handlers
  const handleStoreSelect = (store: any) => {
    setSelectedStoreId(store.id);
  };

  const handleCloseDrawer = () => {
    setSelectedStoreId(null);
  };

  const handleNavigateToDetails = (storeId: string) => {
    router.push(`/stores/${storeId}`);
  };

  // Filter stores by quadrant
  const filteredStores = useMemo(() => {
    return filterStoresByQuadrant(stores, selectedQuadrant, filters.country);
  }, [stores, selectedQuadrant, filters.country]);

  // Count stores in each quadrant
  const quadrantCounts = useMemo(() => {
    return countStoresByQuadrant(stores, filters.country);
  }, [stores, filters.country]);

  // Find the selected store
  const selectedStore = selectedStoreId ? stores.find(s => s.id === selectedStoreId) || null : null;

  // Debug expansion state
  console.log('🔍 ExpansionIntegratedMapPage state:', {
    expansionMode,
    suggestionsCount: suggestions.length,
    showExpansions: filters.statusFilters?.showExpansions,
    selectedSuggestion: selectedSuggestion?.id,
    suggestionsCountries: [],
    firstFewSuggestions: suggestions.slice(0, 3).map(s => ({ lat: s.lat, lng: s.lng, id: s.id }))
  });

  // Handle error state
  if (storesError) {
    return (
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Store Management</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Interactive map view of all store locations
            </p>
          </div>
        </div>

        <TabNavigation activeTab="map" />

        <div className="s-panel">
          <div className="s-panelCard">
            <ErrorStateWithRetry
              message={`Failed to load store data: ${storesError}`}
              onRetry={() => window.location.reload()}
              retryLabel="Reload Page"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="s-wrap">
      <NetworkStatusIndicator />
      <JobStatusIndicator 
        isLoading={expansionLoading}
        jobId={currentJobId || undefined}
        estimate={currentJobEstimate || undefined}
      />
      {!isFullscreen && (
        <>
          <div className="menu-header-section">
            <div>
              <h1 className="s-h1">Store Management</h1>
              <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
                Interactive map view of all store locations
                {cacheStatus && (
                  <span style={{ marginLeft: '12px', fontSize: '12px', opacity: 0.7 }}>
                    {cacheStatus === 'hit' && '📦 Loaded from cache'}
                    {cacheStatus === 'miss' && '🔄 Fetching from server...'}
                    {cacheStatus === 'stale' && '⏰ Refreshing in background...'}
                    {cacheStatus === 'disabled' && ''}
                  </span>
                )}
                {stores.length > 0 && (
                  <span style={{ marginLeft: '12px', fontSize: '12px', opacity: 0.7 }}>
                    • {stores.length} stores loaded
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => invalidateCache()}
                className="s-btn"
                title="Refresh store data (expansion suggestions will be preserved)"
                disabled={storesLoading}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  opacity: 0.8
                }}
              >
                Refresh
              </button>
              {expansionMode && suggestions.length > 0 && (
                <button
                  onClick={() => {
                    setSuggestions([]);
                    setSelectedSuggestion(null);
                    setStrategicAnalysis(null);
                    console.log('🧹 Cleared expansion suggestions');
                  }}
                  className="s-btn"
                  title="Clear expansion suggestions (they will be lost unless saved as a scenario)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#ef4444',
                    color: 'white'
                  }}
                >
                  🗑️ Clear Suggestions ({suggestions.length})
                </button>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setExpansionMode(false);
                    setAnalysisMode(false);
                  }}
                  style={{
                    background: !expansionMode && !analysisMode ? 'rgba(0,166,81,0.1)' : 'none',
                    border: `1px solid ${!expansionMode && !analysisMode ? 'rgba(0,166,81,0.3)' : 'rgba(0,166,81,0.2)'}`,
                    color: 'var(--s-accent)',
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!(!expansionMode && !analysisMode)) {
                      e.currentTarget.style.background = 'rgba(0,166,81,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(0,166,81,0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(!expansionMode && !analysisMode)) {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.borderColor = 'rgba(0,166,81,0.2)';
                    }
                  }}
                >
                  Stores
                </button>
                <button
                  onClick={() => {
                    setExpansionMode(true);
                    setAnalysisMode(false);
                    setStoreAnalyses([]);
                  }}
                  style={{
                    background: expansionMode ? 'rgba(96,165,250,0.1)' : 'none',
                    border: `1px solid ${expansionMode ? 'rgba(96,165,250,0.3)' : 'rgba(96,165,250,0.2)'}`,
                    color: '#60a5fa',
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!expansionMode) {
                      e.currentTarget.style.background = 'rgba(96,165,250,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(96,165,250,0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!expansionMode) {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.borderColor = 'rgba(96,165,250,0.2)';
                    }
                  }}
                >
                  Expansion
                </button>
                <button
                  onClick={() => {
                    setAnalysisMode(true);
                    setExpansionMode(false);
                    setSuggestions([]);
                  }}
                  style={{
                    background: analysisMode ? 'rgba(168,85,247,0.1)' : 'none',
                    border: `1px solid ${analysisMode ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.2)'}`,
                    color: '#a855f7',
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!analysisMode) {
                      e.currentTarget.style.background = 'rgba(168,85,247,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(168,85,247,0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!analysisMode) {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.borderColor = 'rgba(168,85,247,0.2)';
                    }
                  }}
                >
                  Analysis
                </button>

              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <TabNavigation activeTab="map" />

          {/* Filters */}
          {storesLoading && stores.length === 0 ? (
            <FilterLoadingSkeleton />
          ) : (
            <MapFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableOptions={{
                ...availableOptions,
                competitorBrands: brands,
                competitorCategories: categories
              }}
              loading={storesLoading}
            />
          )}
        </>
      )}

      <div className="s-panel" style={{ 
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : 'auto',
        height: isFullscreen ? '100vh' : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        margin: isFullscreen ? 0 : 'auto'
      }}>
        <div className="s-panelCard" style={{
          height: isFullscreen ? '100%' : 'auto',
          padding: isFullscreen ? 0 : 'auto',
          border: isFullscreen ? 'none' : 'auto',
          borderRadius: isFullscreen ? 0 : 'auto'
        }}>
          {!isFullscreen && (
            <div className="s-panelHeader">
              <div className="s-panelT">
                {storesLoading && stores.length === 0 ? (
                  <span>
                    Store Locations 
                    <span style={{ marginLeft: '8px' }}>
                      <span className="loading-spinner-small" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                    </span>
                  </span>
                ) : (
                  <>
                    Store Locations ({stores.length})
                    {storesLoading && <span style={{ color: 'var(--s-muted)', fontWeight: 'normal' }}> • Updating...</span>}
                    {expansionMode && suggestions.length > 0 && (
                      <span style={{ color: 'var(--s-accent)', fontWeight: 'normal' }}> • {suggestions.length} expansion opportunities</span>
                    )}
                  </>
                )}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                {storesLoading && stores.length === 0 ? (
                  <div className="skeleton-text" style={{ width: '200px', height: '14px' }} />
                ) : (
                  <>
                    Map view • Clustering enabled
                    {stores.some(s => s.recentActivity) && (
                      <span> • {stores.filter(s => s.recentActivity).length} active</span>
                    )}
                    {expansionMode && <span> • Expansion mode active</span>}
                  </>
                )}
              </div>
            </div>
          )}
          
          <div style={{ 
            height: isFullscreen ? '100%' : '750px', 
            position: 'relative',
            background: isFullscreen ? 'var(--s-panel, white)' : 'transparent'
          }}>
            <SimpleErrorBoundary
              onError={(error, errorInfo) => {
                console.error('Map error caught by boundary:', error, errorInfo);
              }}
            >
              <WorkingMapView
                key="main-map"
                stores={filteredStores}
                onStoreSelect={handleStoreSelect}
                viewport={viewport}
                onViewportChange={setViewport}
                loading={storesLoading}
                expansionSuggestions={
                  expansionMode && filters.statusFilters?.showExpansions !== false 
                    ? (console.log('🔍 Passing expansion suggestions to map:', {
                        expansionMode,
                        showExpansions: filters.statusFilters?.showExpansions,
                        suggestionsCount: suggestions.length,
                        suggestions: suggestions.slice(0, 2)
                      }), suggestions)
                    : (console.log('🔍 Not showing expansion suggestions:', {
                        expansionMode,
                        showExpansions: filters.statusFilters?.showExpansions,
                        suggestionsCount: suggestions.length
                      }), [])
                }
                onSuggestionSelect={setSelectedSuggestion}
                storeAnalyses={analysisMode ? storeAnalyses : []}
                competitors={showCompetitors ? competitors : []}
                onCompetitorSelect={(competitor) => {
                  console.log('🏢 Competitor selected:', competitor);
                  // Could open a competitor details modal here
                }}
              />
            </SimpleErrorBoundary>

            {/* Quadrant Selector */}
            {!isFullscreen && (
              <QuadrantSelector
                selected={selectedQuadrant}
                onSelect={setSelectedQuadrant}
                storeCounts={quadrantCounts}
              />
            )}

            {/* Fullscreen toggle button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'var(--s-panel, white)',
                border: '1px solid var(--s-border, #e5e7eb)',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                  Fullscreen
                </>
              )}
            </button>



            {/* Expansion controls sidebar - positioned over the map */}
            {expansionMode && (
              <ExpansionControls
                onGenerate={handleGenerate}
                onSaveScenario={handleSaveScenario}
                onLoadScenario={handleLoadScenario}
                loading={expansionLoading}
                scenarios={scenarios}
              />
            )}

            {/* Store Analysis controls sidebar */}
            {analysisMode && (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 10,
                maxWidth: '400px',
                maxHeight: 'calc(100vh - 200px)',
                overflowY: 'auto'
              }}>
                <StoreAnalysisControls
                  onAnalyze={handleAnalyzeStores}
                  loading={analysisLoading}
                  selectedStoreIds={[]}
                  currentRegion={filters.country || 'Germany'}
                />
                
                {storeAnalyses.length > 0 && (
                  <StoreAnalysisResults
                    analyses={storeAnalyses}
                    onStoreSelect={setSelectedStoreId}
                    selectedStoreId={selectedStoreId || undefined}
                  />
                )}
              </div>
            )}

            {/* AI Indicator Legend - show when we have suggestions */}
            {expansionMode && suggestions.length > 0 && (
              <AIIndicatorLegend 
                totalCandidates={suggestions.length}
                aiCandidates={suggestions.filter(s => s.hasAIAnalysis).length}
                estimatedSavings={currentJobEstimate?.cost ? Math.round(currentJobEstimate.cost * 0.3 * 100) / 100 : 0}
              />
            )}
          </div>
        </div>
      </div>



      {/* Store Details Drawer */}
      <StoreDrawer
        store={selectedStore}
        isOpen={!!selectedStoreId}
        onClose={handleCloseDrawer}
        onNavigateToDetails={handleNavigateToDetails}
      />

      {/* Expansion Info Card */}
      {selectedSuggestion && (
        <SuggestionInfoCard
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          onStatusChange={async (status) => await handleStatusChange(selectedSuggestion.id, status)}
          onSaveAsPlannedStore={handleSaveAsPlannedStore}
        />
      )}

      {/* Strategic Analysis Panel */}
      {strategicAnalysis && !isFullscreen && (
        <StrategicAnalysisPanel
          analysis={strategicAnalysis}
          onClose={() => setStrategicAnalysis(null)}
        />
      )}

      {/* Add CSS for loading states */}
      <style jsx global>{`
        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid var(--s-border);
          border-top: 2px solid var(--s-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .skeleton-text {
          background: linear-gradient(90deg, var(--s-panel) 25%, var(--s-border) 50%, var(--s-panel) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: 4px;
          display: inline-block;
        }

        /* Hide MapLibre attribution */
        .maplibregl-ctrl-attrib,
        .maplibregl-ctrl-bottom-right {
          display: none !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes skeleton-loading {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-spinner-small {
            animation: none;
            border-top-color: var(--s-border);
          }
          .skeleton-text {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
