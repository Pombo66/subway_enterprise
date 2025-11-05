// Enhanced Import Modal with Smart Store Importer v1 features
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { 
  AutoMapResult, 
  CountryInference, 
  ImportRow, 
  GeocodeProgress,
  FieldAlias,
  FIELD_ALIASES 
} from '../../lib/import/types';
import { autoMapper } from '../../lib/import/autoMap';
import { countryInferrer } from '../../lib/import/countryInference';
import { useGeocodeImport } from '../../hooks/useGeocodeImport';
import { ConfidenceBadge } from './ConfidenceBadge';
import { CountryInferenceDisplay } from './CountryInferenceDisplay';
import { GeocodeProgressDisplay } from './GeocodeProgressDisplay';
import { ErrorSummaryDisplay } from './ErrorSummaryDisplay';

interface SmartImportModalProps {
  isOpen: boolean;
  filename: string;
  headers: string[];
  sampleRows: any[][];
  totalRows: number;
  onClose: () => void;
  onImport: (data: {
    mapping: Record<string, string>;
    countryInference: CountryInference;
    rows: ImportRow[];
  }) => Promise<void>;
}

export function SmartImportModal({
  isOpen,
  filename,
  headers,
  sampleRows,
  totalRows,
  onClose,
  onImport
}: SmartImportModalProps) {
  const [autoMapResult, setAutoMapResult] = useState<AutoMapResult | null>(null);
  const [countryInference, setCountryInference] = useState<CountryInference | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const {
    isGeocoding,
    progress,
    startGeocoding,
    cancelGeocoding,
    getEstimatedTime
  } = useGeocodeImport({
    onProgress: (progress) => {
      // Progress is handled by the hook's internal state
    },
    onComplete: (summary) => {
      console.log('Geocoding completed:', summary);
    },
    onError: (error) => {
      console.error('Geocoding error:', error);
    }
  });

  // Auto-map columns and infer country when modal opens
  useEffect(() => {
    if (isOpen && headers.length > 0 && sampleRows.length > 0) {
      try {
        // Generate auto-mapping
        const mapResult = autoMapper.generateMappings(headers, sampleRows);
        setAutoMapResult(mapResult);

        // Create initial column mapping from auto-mapping results
        const initialMapping: Record<string, string> = {};
        Object.entries(mapResult.mappings).forEach(([field, mapping]) => {
          if (mapping.suggestedColumn) {
            initialMapping[field] = mapping.suggestedColumn;
          }
        });
        setColumnMapping(initialMapping);

        // Infer country
        const existingCountryColumn = mapResult.mappings.country?.suggestedColumn;
        const inference = countryInferrer.inferCountry(
          filename,
          sampleRows,
          undefined, // userRegion - could be passed from props
          existingCountryColumn
        );
        setCountryInference(inference);
        setSelectedCountry(inference.country);

      } catch (error) {
        console.error('Error during auto-mapping or country inference:', error);
      }
    }
  }, [isOpen, headers, sampleRows, filename]);

  // Build import rows from current data
  const importRows = useMemo(() => {
    if (!headers.length || !sampleRows.length) return [];

    return sampleRows.map((row, index) => {
      const importRow: ImportRow = {
        id: `row-${index}`,
        country: selectedCountry
      };

      // Map data based on column mapping
      Object.entries(columnMapping).forEach(([field, columnName]) => {
        const columnIndex = headers.indexOf(columnName);
        if (columnIndex >= 0 && row[columnIndex] != null) {
          const value = row[columnIndex];
          switch (field as FieldAlias) {
            case 'name':
              importRow.name = String(value);
              break;
            case 'address':
              importRow.address = String(value);
              break;
            case 'city':
              importRow.city = String(value);
              break;
            case 'postcode':
              importRow.postcode = String(value);
              break;
            case 'latitude':
              const lat = parseFloat(value);
              if (!isNaN(lat)) importRow.latitude = lat;
              break;
            case 'longitude':
              const lng = parseFloat(value);
              if (!isNaN(lng)) importRow.longitude = lng;
              break;
            case 'status':
              importRow.status = String(value);
              break;
            case 'externalId':
              importRow.externalId = String(value);
              break;
          }
        }
      });

      return importRow;
    });
  }, [headers, sampleRows, columnMapping, selectedCountry]);

  const handleMappingChange = useCallback((field: string, columnName: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: columnName
    }));
  }, []);

  const handleCountryChange = useCallback((country: string) => {
    setSelectedCountry(country);
  }, []);

  const handleImportAndGeocode = useCallback(async () => {
    if (!countryInference || isProcessing) return;

    try {
      setIsProcessing(true);

      // Validate required fields
      const requiredFields = ['name', 'country'];
      const missingFields = requiredFields.filter(field => 
        field === 'country' ? !selectedCountry : !columnMapping[field]
      );

      if (missingFields.length > 0) {
        alert(`Please provide the following required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Start geocoding for rows that need it
      const rowsNeedingGeocode = importRows.filter(row => 
        !row.latitude || !row.longitude || isNaN(row.latitude) || isNaN(row.longitude)
      );

      if (rowsNeedingGeocode.length > 0) {
        await startGeocoding(importRows);
      }

      // Call the import handler
      await onImport({
        mapping: columnMapping,
        countryInference: {
          ...countryInference,
          country: selectedCountry
        },
        rows: importRows
      });

    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [countryInference, columnMapping, selectedCountry, importRows, startGeocoding, onImport, isProcessing]);

  const estimatedTime = useMemo(() => {
    const rowsNeedingGeocode = importRows.filter(row => 
      !row.latitude || !row.longitude || isNaN(row.latitude) || isNaN(row.longitude)
    ).length;
    
    return getEstimatedTime(rowsNeedingGeocode);
  }, [importRows, getEstimatedTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Smart Store Import</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filename} • {totalRows} rows • Auto-mapped with AI assistance
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing || isGeocoding}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Auto-mapping Results */}
          {autoMapResult && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Field Mapping</h3>
                <div className="text-sm text-gray-600">
                  {autoMapResult.confidenceSummary.high} 🟢 
                  {autoMapResult.confidenceSummary.medium} 🟡 
                  {autoMapResult.confidenceSummary.low} 🔴
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(FIELD_ALIASES).map(([fieldName, aliases]) => {
                  const mapping = autoMapResult.mappings[fieldName];
                  const currentValue = columnMapping[fieldName] || '';

                  return (
                    <div key={fieldName} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 capitalize">
                        {fieldName.replace(/([A-Z])/g, ' $1').trim()}
                        {['name', 'country'].includes(fieldName) && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      
                      <div className="flex items-center space-x-2">
                        <select
                          value={currentValue}
                          onChange={(e) => handleMappingChange(fieldName, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Select Column --</option>
                          {headers.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                        
                        {mapping && (
                          <ConfidenceBadge
                            confidence={mapping.confidence}
                            reason={mapping.reason}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Country Inference */}
          {countryInference && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Country Detection</h3>
              <CountryInferenceDisplay
                inference={countryInference}
                editable={true}
                onCountryChange={handleCountryChange}
              />
            </div>
          )}

          {/* Data Preview */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data Preview</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.slice(0, 6).map(header => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                      {headers.length > 6 && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ... +{headers.length - 6} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sampleRows.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        {row.slice(0, 6).map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                            {cell || '-'}
                          </td>
                        ))}
                        {headers.length > 6 && (
                          <td className="px-4 py-3 text-sm text-gray-500">
                            ...
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {sampleRows.length > 5 && (
              <p className="text-sm text-gray-600 mt-2">
                Showing 5 of {totalRows} rows
              </p>
            )}
          </div>

          {/* Geocoding Progress */}
          {(isGeocoding || progress) && progress && (
            <GeocodeProgressDisplay
              progress={progress}
              onCancel={cancelGeocoding}
              showDetails={true}
            />
          )}

          {/* Error Summary */}
          {progress?.errors && progress.errors.length > 0 && (
            <ErrorSummaryDisplay
              errors={progress.errors}
              onDownloadCsv={() => {
                // CSV download is handled by the component
              }}
            />
          )}

          {/* Geocoding Info */}
          {!isGeocoding && estimatedTime.batchCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Geocoding Information</p>
                  <p>
                    {estimatedTime.batchCount} rows need geocoding. 
                    Estimated time: ~{estimatedTime.estimatedMinutes}m {estimatedTime.estimatedSeconds}s
                  </p>
                  <p className="mt-1 text-blue-600">
                    Rows with existing coordinates will be skipped.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing || isGeocoding}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleImportAndGeocode}
              disabled={isProcessing || isGeocoding || !selectedCountry}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isProcessing || isGeocoding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Import & Geocode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}