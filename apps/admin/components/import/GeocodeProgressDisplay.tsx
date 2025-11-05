// Geocoding progress display component
'use client';

import React from 'react';
import { GeocodeProgress } from '../../lib/import/types';
import { X, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface GeocodeProgressDisplayProps {
  progress: GeocodeProgress;
  onCancel?: () => void;
  showDetails?: boolean;
}

export function GeocodeProgressDisplay({ 
  progress, 
  onCancel, 
  showDetails = false 
}: GeocodeProgressDisplayProps) {
  const progressPercentage = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  const hasErrors = progress.errors.length > 0;
  const isComplete = !progress.inProgress;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Clock className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          <h3 className="text-sm font-medium text-gray-900">
            {isComplete ? 'Geocoding Complete' : 'Geocoding in Progress'}
          </h3>
        </div>
        
        {onCancel && !isComplete && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cancel geocoding"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isComplete 
                ? hasErrors 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <div className="text-lg font-semibold text-green-600">
            {progress.completed}
          </div>
          <div className="text-gray-500">Successful</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-red-600">
            {progress.failed}
          </div>
          <div className="text-gray-500">Failed</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-600">
            {progress.total}
          </div>
          <div className="text-gray-500">Total</div>
        </div>
      </div>

      {/* Batch Progress */}
      {progress.totalBatches && progress.totalBatches > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            Batch {progress.currentBatch} of {progress.totalBatches}
          </div>
        </div>
      )}

      {/* Error Summary */}
      {hasErrors && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {progress.errors.length} address{progress.errors.length !== 1 ? 'es' : ''} could not be geocoded
            </span>
          </div>
          
          {showDetails && progress.errors.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto">
              {progress.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-xs text-gray-600 py-1">
                  <span className="font-medium">{error.address}:</span> {error.reason}
                </div>
              ))}
              {progress.errors.length > 5 && (
                <div className="text-xs text-gray-500 italic">
                  ... and {progress.errors.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completion Message */}
      {isComplete && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            {hasErrors ? (
              <>
                Geocoding completed with some issues. 
                {progress.errors.length > 0 && (
                  <span className="ml-1">
                    {progress.errors.length} address{progress.errors.length !== 1 ? 'es' : ''} need manual review.
                  </span>
                )}
              </>
            ) : (
              'All addresses geocoded successfully!'
            )}
          </div>
        </div>
      )}
    </div>
  );
}