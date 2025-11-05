// Geocoding orchestration hook for Smart Store Importer v1
'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  GeocodeProgress, 
  GeocodeError, 
  ImportRow, 
  GeocodeProvider,
  GeocodeRequest,
  GeocodeResponse 
} from '../lib/import/types';
import { BatchProcessingUtils } from '../lib/import/batchProcessor';
import smartImportConfig from '../lib/import/config';

interface UseGeocodeImportOptions {
  batchSize?: number;
  onProgress?: (progress: GeocodeProgress) => void;
  onBatchComplete?: (batchIndex: number, batchResults: any[]) => void;
  onComplete?: (summary: { successful: number; failed: number; total: number }) => void;
  onError?: (error: Error) => void;
}

interface GeocodeImportState {
  isGeocoding: boolean;
  progress: GeocodeProgress | null;
  results: Array<{ row: ImportRow; success: boolean; error?: string }>;
  canCancel: boolean;
}

export function useGeocodeImport(options: UseGeocodeImportOptions = {}) {
  const [state, setState] = useState<GeocodeImportState>({
    isGeocoding: false,
    progress: null,
    results: [],
    canCancel: false
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const batchSize = options.batchSize || smartImportConfig.geocoding.batchSize;

  /**
   * Start geocoding process for import rows
   */
  const startGeocoding = useCallback(async (
    rows: ImportRow[],
    preferredProvider?: GeocodeProvider
  ): Promise<{
    successful: number;
    failed: number;
    total: number;
    results: Array<{ row: ImportRow; success: boolean; error?: string }>;
  }> => {
    // Reset state
    setState(prev => ({
      ...prev,
      isGeocoding: true,
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: true,
        errors: [],
        currentBatch: 0,
        totalBatches: 0
      },
      results: [],
      canCancel: true
    }));

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Filter rows that need geocoding
      const rowsToGeocode = rows.filter(row => 
        !row.latitude || !row.longitude || 
        isNaN(row.latitude) || isNaN(row.longitude)
      );

      const totalRows = rowsToGeocode.length;
      const totalBatches = Math.ceil(totalRows / batchSize);

      // Update initial progress
      const initialProgress: GeocodeProgress = {
        total: totalRows,
        completed: 0,
        failed: 0,
        inProgress: true,
        errors: [],
        currentBatch: 0,
        totalBatches
      };

      setState(prev => ({ ...prev, progress: initialProgress }));
      options.onProgress?.(initialProgress);

      // Process in batches
      const allResults: Array<{ row: ImportRow; success: boolean; error?: string }> = [];
      
      for (let i = 0; i < totalBatches; i++) {
        // Check for cancellation
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Geocoding cancelled by user');
        }

        const batchStart = i * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, totalRows);
        const batchRows = rowsToGeocode.slice(batchStart, batchEnd);

        // Process batch
        const batchResults = await processBatch(
          batchRows, 
          preferredProvider, 
          abortControllerRef.current.signal
        );

        allResults.push(...batchResults);

        // Update progress
        const completed = allResults.filter(r => r.success).length;
        const failed = allResults.filter(r => !r.success).length;
        const errors: GeocodeError[] = allResults
          .filter(r => !r.success && r.error)
          .map(r => ({
            rowId: r.row.id,
            address: buildAddressString(r.row),
            reason: r.error!,
            retryable: false // Simplified for now
          }));

        const updatedProgress: GeocodeProgress = {
          total: totalRows,
          completed,
          failed,
          inProgress: i < totalBatches - 1,
          errors,
          currentBatch: i + 1,
          totalBatches
        };

        setState(prev => ({ 
          ...prev, 
          progress: updatedProgress,
          results: allResults 
        }));
        
        options.onProgress?.(updatedProgress);
        options.onBatchComplete?.(i + 1, batchResults);

        // Add delay between batches
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Add rows that already had coordinates
      const skippedRows = rows.filter(row => 
        row.latitude && row.longitude && 
        !isNaN(row.latitude) && !isNaN(row.longitude)
      );

      for (const row of skippedRows) {
        allResults.push({ row, success: true });
      }

      const summary = {
        successful: allResults.filter(r => r.success).length,
        failed: allResults.filter(r => !r.success).length,
        total: rows.length,
        results: allResults
      };

      options.onComplete?.(summary);
      
      return summary;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown geocoding error');
      options.onError?.(errorObj);
      throw errorObj;
    } finally {
      setState(prev => ({
        ...prev,
        isGeocoding: false,
        canCancel: false,
        progress: prev.progress ? { ...prev.progress, inProgress: false } : null
      }));
      abortControllerRef.current = null;
    }
  }, [batchSize, options]);

  /**
   * Cancel ongoing geocoding
   */
  const cancelGeocoding = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Get estimated processing time
   */
  const getEstimatedTime = useCallback((rowCount: number) => {
    return BatchProcessingUtils.estimateProcessingTime(
      rowCount,
      batchSize,
      smartImportConfig.geocoding.rateLimit
    );
  }, [batchSize]);

  return {
    ...state,
    startGeocoding,
    cancelGeocoding,
    getEstimatedTime
  };
}

/**
 * Process a batch of rows through the BFF API
 */
async function processBatch(
  rows: ImportRow[],
  preferredProvider?: GeocodeProvider,
  signal?: AbortSignal
): Promise<Array<{ row: ImportRow; success: boolean; error?: string }>> {
  const request: GeocodeRequest = {
    providerPreference: preferredProvider,
    rows: rows.map(row => ({
      id: row.id,
      address: row.address,
      city: row.city,
      postcode: row.postcode,
      country: row.country || ''
    }))
  };

  try {
    const response = await fetch('/api/bff/import/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GeocodeResponse = await response.json();
    
    // Map results back to rows
    return rows.map(row => {
      const result = data.results.find(r => r.id === row.id);
      
      if (!result) {
        return { row, success: false, error: 'No result returned' };
      }

      if (result.error) {
        return { row, success: false, error: result.error };
      }

      if (result.lat && result.lng) {
        // Update row with geocoded coordinates
        row.latitude = result.lat;
        row.longitude = result.lng;
        row.geocodeStatus = 'success';
        row.geocodeProvider = result.provider;
        row.geocodePrecision = result.precision;
        
        return { row, success: true };
      }

      return { row, success: false, error: 'Invalid coordinates returned' };
    });

  } catch (error) {
    // Return error for all rows in batch
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return rows.map(row => ({ row, success: false, error: errorMessage }));
  }
}

/**
 * Build address string from row components
 */
function buildAddressString(row: ImportRow): string {
  const parts = [row.address, row.city, row.postcode, row.country]
    .filter(part => part && part.trim());
  return parts.join(', ');
}