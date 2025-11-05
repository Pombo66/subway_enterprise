'use client';

import { useState, useCallback } from 'react';
import { ExpansionSuggestion } from '../components/expansion/types';

interface PipelineItem {
  id: string;
  suggestion: ExpansionSuggestion;
  addedAt: Date;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  notes?: string;
}

interface UsePipelineIntegrationProps {
  onPipelineUpdate?: (items: PipelineItem[]) => void;
  maxPipelineItems?: number;
}

export const usePipelineIntegration = ({
  onPipelineUpdate,
  maxPipelineItems = 50
}: UsePipelineIntegrationProps = {}) => {
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add suggestion to pipeline
  const sendToPipeline = useCallback(async (suggestion: ExpansionSuggestion) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if suggestion is already in pipeline
      const existingItem = pipelineItems.find(item => item.suggestion.id === suggestion.id);
      if (existingItem) {
        setError('This suggestion is already in the pipeline');
        setIsLoading(false);
        return false;
      }

      // Check pipeline capacity
      if (pipelineItems.length >= maxPipelineItems) {
        setError(`Pipeline is full (maximum ${maxPipelineItems} items)`);
        setIsLoading(false);
        return false;
      }

      // Create new pipeline item
      const newItem: PipelineItem = {
        id: `pipeline_${suggestion.id}_${Date.now()}`,
        suggestion,
        addedAt: new Date(),
        status: 'pending'
      };

      // In a real implementation, this would make an API call
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Add to pipeline
      const updatedItems = [...pipelineItems, newItem];
      setPipelineItems(updatedItems);
      onPipelineUpdate?.(updatedItems);

      // Emit telemetry event
      console.info('📊 Suggestion sent to pipeline', {
        suggestionId: suggestion.id,
        pipelineSize: updatedItems.length,
        dataMode: suggestion.dataMode,
        finalScore: suggestion.finalScore
      });

      setIsLoading(false);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send to pipeline';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Failed to send suggestion to pipeline:', err);
      return false;
    }
  }, [pipelineItems, maxPipelineItems, onPipelineUpdate]);

  // Remove item from pipeline
  const removeFromPipeline = useCallback((itemId: string) => {
    const updatedItems = pipelineItems.filter(item => item.id !== itemId);
    setPipelineItems(updatedItems);
    onPipelineUpdate?.(updatedItems);

    console.info('📊 Item removed from pipeline', {
      itemId,
      pipelineSize: updatedItems.length
    });
  }, [pipelineItems, onPipelineUpdate]);

  // Update item status
  const updateItemStatus = useCallback((itemId: string, status: PipelineItem['status'], notes?: string) => {
    const updatedItems = pipelineItems.map(item => 
      item.id === itemId 
        ? { ...item, status, notes }
        : item
    );
    setPipelineItems(updatedItems);
    onPipelineUpdate?.(updatedItems);

    console.info('📊 Pipeline item status updated', {
      itemId,
      status,
      hasNotes: !!notes
    });
  }, [pipelineItems, onPipelineUpdate]);

  // Clear all pipeline items
  const clearPipeline = useCallback(() => {
    setPipelineItems([]);
    onPipelineUpdate?.([]);
    console.info('📊 Pipeline cleared');
  }, [onPipelineUpdate]);

  // Get pipeline statistics
  const getPipelineStats = useCallback(() => {
    const stats = {
      total: pipelineItems.length,
      pending: pipelineItems.filter(item => item.status === 'pending').length,
      reviewing: pipelineItems.filter(item => item.status === 'reviewing').length,
      approved: pipelineItems.filter(item => item.status === 'approved').length,
      rejected: pipelineItems.filter(item => item.status === 'rejected').length,
      capacity: maxPipelineItems,
      remaining: maxPipelineItems - pipelineItems.length
    };

    return stats;
  }, [pipelineItems, maxPipelineItems]);

  // Check if suggestion is in pipeline
  const isInPipeline = useCallback((suggestionId: string): boolean => {
    return pipelineItems.some(item => item.suggestion.id === suggestionId);
  }, [pipelineItems]);

  // Export pipeline data
  const exportPipeline = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      items: pipelineItems.map(item => ({
        id: item.id,
        suggestionId: item.suggestion.id,
        coordinates: {
          lat: item.suggestion.lat,
          lng: item.suggestion.lng
        },
        scores: {
          final: item.suggestion.finalScore,
          confidence: item.suggestion.confidence,
          demand: item.suggestion.demandScore,
          cannibalization: item.suggestion.cannibalizationPenalty,
          opsFit: item.suggestion.opsFitScore
        },
        metadata: {
          dataMode: item.suggestion.dataMode,
          modelVersion: item.suggestion.modelVersion,
          nearestSubwayDistance: item.suggestion.nearestSubwayDistance,
          topPOIs: item.suggestion.topPOIs
        },
        pipeline: {
          addedAt: item.addedAt.toISOString(),
          status: item.status,
          notes: item.notes
        }
      })),
      stats: getPipelineStats()
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expansion-pipeline-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.info('📊 Pipeline exported', {
      itemCount: pipelineItems.length,
      filename: link.download
    });
  }, [pipelineItems, getPipelineStats]);

  return {
    pipelineItems,
    isLoading,
    error,
    sendToPipeline,
    removeFromPipeline,
    updateItemStatus,
    clearPipeline,
    getPipelineStats,
    isInPipeline,
    exportPipeline,
    
    // Computed values
    pipelineStats: getPipelineStats(),
    isPipelineFull: pipelineItems.length >= maxPipelineItems,
    hasPipelineItems: pipelineItems.length > 0
  };
};

export default usePipelineIntegration;