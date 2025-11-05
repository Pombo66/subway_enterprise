'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { ScopeSelection, ExpansionSuggestion } from '../components/expansion/types';

// Worker message types (matching worker implementation)
interface CandidateSite {
  lat: number;
  lng: number;
  withinScope: boolean;
  subwayDensity: number;
  populationDensity: number;
  poiDensity: number;
  infrastructureScore: number;
  nearestSubwayDistance: number;
  population: number;
  footfallIndex: number;
  incomeIndex: number;
  competitorIdx: number;
}

interface CalculationRequest {
  scope: ScopeSelection;
  intensity: number;
  dataMode: 'live' | 'modelled';
  modelVersion: string;
  minDistance: number;
  maxPerCity?: number;
  candidateSites: CandidateSite[];
}

interface CalculationResult {
  suggestions: ExpansionSuggestion[];
  metadata: {
    totalCandidates: number;
    filteredCandidates: number;
    calculationTimeMs: number;
    cacheKey: string;
  };
}

interface UseExpansionWorkerProps {
  onCalculationComplete?: (result: CalculationResult) => void;
  onCalculationError?: (error: string) => void;
  fallbackToMainThread?: boolean;
}

export const useExpansionWorker = ({
  onCalculationComplete,
  onCalculationError,
  fallbackToMainThread = true
}: UseExpansionWorkerProps = {}) => {
  const workerRef = useRef<Worker | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [workerSupported, setWorkerSupported] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    lastCalculationTime: 0,
    averageCalculationTime: 0,
    totalCalculations: 0
  });

  // Initialize worker
  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setWorkerSupported(false);
      return;
    }

    try {
      // Create worker from the worker file
      workerRef.current = new Worker(
        new URL('../workers/expansionCalculator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      workerRef.current.onmessage = (event) => {
        const { type, payload } = event.data;
        
        if (type === 'CALCULATION_COMPLETE') {
          setIsCalculating(false);
          
          // Update performance metrics
          const calculationTime = payload.metadata.calculationTimeMs;
          setPerformanceMetrics(prev => {
            const newTotal = prev.totalCalculations + 1;
            const newAverage = (prev.averageCalculationTime * prev.totalCalculations + calculationTime) / newTotal;
            
            return {
              lastCalculationTime: calculationTime,
              averageCalculationTime: Math.round(newAverage),
              totalCalculations: newTotal
            };
          });
          
          onCalculationComplete?.(payload);
          
        } else if (type === 'CALCULATION_ERROR') {
          setIsCalculating(false);
          console.error('Worker calculation error:', payload.error);
          onCalculationError?.(payload.error);
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setIsCalculating(false);
        setWorkerSupported(false);
        onCalculationError?.('Worker execution failed');
      };

    } catch (error) {
      console.error('Failed to create worker:', error);
      setWorkerSupported(false);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [onCalculationComplete, onCalculationError]);

  // Main thread fallback calculation (simplified version)
  const calculateOnMainThread = useCallback(async (request: CalculationRequest): Promise<CalculationResult> => {
    const startTime = performance.now();
    
    // Simplified calculation for fallback
    const { candidateSites, intensity, scope, dataMode, modelVersion, minDistance } = request;
    
    // Filter candidates
    let filteredCandidates = candidateSites.filter(site => site.withinScope);
    filteredCandidates = filteredCandidates.filter(site => site.nearestSubwayDistance >= minDistance);
    
    // Simple scoring (without deterministic seeding for fallback)
    const scoredCandidates = filteredCandidates.map(candidate => {
      const demandScore = (candidate.population / 200000) * 0.5 + 
                         candidate.footfallIndex * 0.3 + 
                         candidate.incomeIndex * 0.2;
      
      const cannibalizationPenalty = candidate.nearestSubwayDistance > 0 
        ? 3.0 / candidate.nearestSubwayDistance 
        : 1.0;
      
      const finalScore = Math.max(0, Math.min(1, 
        0.6 * demandScore - 0.25 * cannibalizationPenalty - 0.15 * candidate.competitorIdx
      ));
      
      return { candidate, finalScore };
    });
    
    // Sort and select top suggestions
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);
    const targetCount = Math.min(300, Math.round((intensity / 100) * scoredCandidates.length));
    const topSuggestions = scoredCandidates.slice(0, targetCount);
    
    // Convert to ExpansionSuggestion format
    const suggestions: ExpansionSuggestion[] = topSuggestions.map((item, index) => ({
      id: `fallback_${item.candidate.lat}_${item.candidate.lng}_${index}`,
      lat: item.candidate.lat,
      lng: item.candidate.lng,
      finalScore: Number(item.finalScore.toFixed(3)),
      confidence: 0.7, // Lower confidence for fallback
      dataMode,
      demandScore: Number((item.candidate.populationDensity * 0.5).toFixed(3)),
      cannibalizationPenalty: Number((3.0 / Math.max(item.candidate.nearestSubwayDistance, 0.1)).toFixed(3)),
      opsFitScore: Number(item.candidate.infrastructureScore.toFixed(3)),
      nearestSubwayDistance: Number(item.candidate.nearestSubwayDistance.toFixed(1)),
      topPOIs: ['Shopping Center', 'Transit Hub', 'Office Complex'], // Static for fallback
      cacheKey: `fallback_${Date.now()}`,
      modelVersion,
      dataSnapshotDate: new Date().toISOString()
    }));
    
    const calculationTimeMs = performance.now() - startTime;
    
    return {
      suggestions,
      metadata: {
        totalCandidates: candidateSites.length,
        filteredCandidates: filteredCandidates.length,
        calculationTimeMs: Math.round(calculationTimeMs),
        cacheKey: `fallback_${Date.now()}`
      }
    };
  }, []);

  // Calculate suggestions
  const calculateSuggestions = useCallback(async (request: CalculationRequest) => {
    if (isCalculating) {
      console.warn('Calculation already in progress');
      return;
    }

    setIsCalculating(true);

    try {
      if (workerSupported && workerRef.current) {
        // Use Web Worker
        workerRef.current.postMessage({
          type: 'CALCULATE_SUGGESTIONS',
          payload: request
        });
      } else if (fallbackToMainThread) {
        // Fallback to main thread
        console.warn('Using main thread fallback for calculations');
        const result = await calculateOnMainThread(request);
        
        // Update metrics
        setPerformanceMetrics(prev => {
          const newTotal = prev.totalCalculations + 1;
          const newAverage = (prev.averageCalculationTime * prev.totalCalculations + result.metadata.calculationTimeMs) / newTotal;
          
          return {
            lastCalculationTime: result.metadata.calculationTimeMs,
            averageCalculationTime: Math.round(newAverage),
            totalCalculations: newTotal
          };
        });
        
        setIsCalculating(false);
        onCalculationComplete?.(result);
      } else {
        setIsCalculating(false);
        onCalculationError?.('Web Worker not supported and fallback disabled');
      }
    } catch (error) {
      setIsCalculating(false);
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      onCalculationError?.(errorMessage);
    }
  }, [isCalculating, workerSupported, fallbackToMainThread, calculateOnMainThread, onCalculationComplete, onCalculationError]);

  // Cancel current calculation
  const cancelCalculation = useCallback(() => {
    if (workerRef.current && isCalculating) {
      workerRef.current.terminate();
      
      // Recreate worker
      try {
        workerRef.current = new Worker(
          new URL('../workers/expansionCalculator.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (error) {
        console.error('Failed to recreate worker:', error);
        setWorkerSupported(false);
      }
    }
    
    setIsCalculating(false);
  }, [isCalculating]);

  return {
    calculateSuggestions,
    cancelCalculation,
    isCalculating,
    workerSupported,
    performanceMetrics,
    
    // Status helpers
    isWorkerReady: workerSupported && !!workerRef.current,
    canCalculate: !isCalculating && (workerSupported || fallbackToMainThread)
  };
};

export default useExpansionWorker;