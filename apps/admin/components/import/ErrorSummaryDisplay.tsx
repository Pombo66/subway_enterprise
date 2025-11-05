// Error summary and recovery UI component
'use client';

import React, { useState } from 'react';
import { GeocodeError } from '../../lib/import/types';
import { AlertTriangle, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorSummaryDisplayProps {
  errors: GeocodeError[];
  onRetry?: (errorIds: string[]) => void;
  onDownloadCsv?: () => void;
  showDetails?: boolean;
}

export function ErrorSummaryDisplay({ 
  errors, 
  onRetry, 
  onDownloadCsv,
  showDetails = true 
}: ErrorSummaryDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());

  if (errors.length === 0) {
    return null;
  }

  const retryableErrors = errors.filter(error => error.retryable);
  const nonRetryableErrors = errors.filter(error => !error.retryable);

  const handleSelectAll = () => {
    if (selectedErrors.size === retryableErrors.length) {
      setSelectedErrors(new Set());
    } else {
      setSelectedErrors(new Set(retryableErrors.map(error => error.rowId)));
    }
  };

  const handleSelectError = (rowId: string) => {
    const newSelected = new Set(selectedErrors);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedErrors(newSelected);
  };

  const handleRetrySelected = () => {
    if (onRetry && selectedErrors.size > 0) {
      onRetry(Array.from(selectedErrors));
    }
  };

  const generateCsvContent = () => {
    const headers = ['Row ID', 'Address', 'Error Reason', 'Retryable', 'Provider'];
    const rows = errors.map(error => [
      error.rowId,
      error.address,
      error.reason,
      error.retryable ? 'Yes' : 'No',
      error.provider || 'Unknown'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  };

  const downloadCsv = () => {
    const csvContent = generateCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `geocoding-errors-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    onDownloadCsv?.();
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-medium text-red-800">
            Geocoding Issues ({errors.length} address{errors.length !== 1 ? 'es' : ''})
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          {onDownloadCsv && (
            <button
              onClick={downloadCsv}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors"
              title="Download error details as CSV"
            >
              <Download className="h-3 w-3 mr-1" />
              Download CSV
            </button>
          )}

          {showDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show Details
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div>
          <span className="text-red-600 font-medium">{retryableErrors.length}</span>
          <span className="text-red-700 ml-1">can be retried</span>
        </div>
        <div>
          <span className="text-red-600 font-medium">{nonRetryableErrors.length}</span>
          <span className="text-red-700 ml-1">need manual review</span>
        </div>
      </div>

      {/* Retry Controls */}
      {retryableErrors.length > 0 && onRetry && (
        <div className="mb-3 p-2 bg-red-100 rounded border border-red-200">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-red-700">
              <input
                type="checkbox"
                checked={selectedErrors.size === retryableErrors.length && retryableErrors.length > 0}
                onChange={handleSelectAll}
                className="mr-2 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              Select all retryable errors ({retryableErrors.length})
            </label>

            <button
              onClick={handleRetrySelected}
              disabled={selectedErrors.size === 0}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry Selected ({selectedErrors.size})
            </button>
          </div>
        </div>
      )}

      {/* Error Details */}
      {isExpanded && showDetails && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-2 bg-white rounded border border-red-200"
            >
              {error.retryable && onRetry && (
                <input
                  type="checkbox"
                  checked={selectedErrors.has(error.rowId)}
                  onChange={() => handleSelectError(error.rowId)}
                  className="mt-1 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-800 truncate">
                    {error.address}
                  </p>
                  <div className="flex items-center space-x-2 ml-2">
                    {error.provider && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {error.provider}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      error.retryable 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {error.retryable ? 'Retryable' : 'Manual Review'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  {error.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-3 pt-3 border-t border-red-200">
        <p className="text-xs text-red-600">
          {retryableErrors.length > 0 && (
            <>Retryable errors are usually due to temporary network issues or rate limits. </>
          )}
          {nonRetryableErrors.length > 0 && (
            <>Addresses needing manual review may have incomplete or invalid address information.</>
          )}
        </p>
      </div>
    </div>
  );
}