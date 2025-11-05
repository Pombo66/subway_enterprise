'use client';

import { useState, useCallback, useEffect } from 'react';
import { PreviewModalProps, ParsedRow, ProgressUpdate } from '../../../lib/types/store-upload';
import { HEADER_SYNONYMS } from '../../../lib/types/store-upload';
import { useToast } from '../../components/ToastProvider';
import ProgressIndicator from './ProgressIndicator';
import CountryInferenceDisplay from './CountryInferenceDisplay';
import { countryInferrer } from '../../../lib/import/countryInference';
import { CountryInference } from '../../../lib/import/types';
import { telemetryService } from '../../../lib/import/telemetry';

export default function PreviewModal({
  isOpen,
  detectedHeaders,
  sampleRows,
  suggestedMapping,
  totalRows,
  filename,
  onClose,
  onImport
}: PreviewModalProps) {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(suggestedMapping);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate>({
    step: 'parse',
    progress: 0,
    message: 'Ready to import'
  });
  const [countryInference, setCountryInference] = useState<CountryInference | null>(null);
  const [manualCountryOverride, setManualCountryOverride] = useState<string | null>(null);
  const { showError, showInfo } = useToast();

  // Reset mapping when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setColumnMapping(suggestedMapping);
      setManualCountryOverride(null);
    }
  }, [isOpen, suggestedMapping]);

  // Run country inference when modal opens
  useEffect(() => {
    if (isOpen && filename && sampleRows.length > 0) {
      try {
        // Validate that countryInferrer is available
        if (!countryInferrer || typeof countryInferrer.inferCountry !== 'function') {
          throw new Error('Country inferrer not available');
        }
        
        const inference = countryInferrer.inferCountry(
          filename,
          sampleRows.map(row => Object.values(row.data)),
          undefined // Could pass user region from context if available
        );
        setCountryInference(inference);
        
        // Emit telemetry event
        if (telemetryService && typeof telemetryService.emitCountryInferred === 'function') {
          telemetryService.emitCountryInferred(inference);
        }
      } catch (error) {
        console.error('Country inference error:', error);
        console.error('Filename:', filename);
        console.error('Sample rows count:', sampleRows.length);
        
        // Set a fallback inference
        const fallbackInference = {
          country: 'DE',
          confidence: 'low' as const,
          method: 'fallback' as const,
          displayText: 'Default: Germany 🇩🇪 (inference unavailable)',
          countryCode: 'DE',
          flagEmoji: '🇩🇪'
        };
        setCountryInference(fallbackInference);
        
        if (telemetryService && typeof telemetryService.emitCountryInferred === 'function') {
          telemetryService.emitCountryInferred(fallbackInference);
        }
      }
    }
  }, [isOpen, filename, sampleRows]);

  const handleMappingChange = useCallback((field: string, column: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: column
    }));
  }, []);

  const handleCountryChange = useCallback((country: string) => {
    setManualCountryOverride(country);
  }, []);

  const handleImport = useCallback(async () => {
    if (isImporting) return;

    // Validate required mappings
    const requiredFields = ['name', 'address', 'city'];
    
    // Country is only required if confidence is low AND no column mapped AND no manual override
    const hasInferredCountry = countryInference && 
      (countryInference.confidence === 'high' || countryInference.confidence === 'medium');
    const hasColumnMapping = !!columnMapping['country'];
    const hasManualOverride = !!manualCountryOverride;
    
    if (!hasInferredCountry && !hasColumnMapping && !hasManualOverride) {
      requiredFields.push('country');
      
      // Emit telemetry for country validation failure
      telemetryService.emitCustomEvent('country_validation_failed', {
        reason: 'low_confidence_no_column',
        filename,
        confidence: countryInference?.confidence || 'none'
      });
    }
    
    const missingFields = requiredFields.filter(field => !columnMapping[field]);

    if (missingFields.length > 0) {
      showError(`Please map the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Determine final country value
    const finalCountry = manualCountryOverride 
      || countryInference?.country 
      || columnMapping['country']
      || 'DE'; // Fallback to Germany

    try {
      setIsImporting(true);
      
      // Simulate progress updates
      setProgress({ step: 'validate', progress: 20, message: 'Validating data...' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress({ step: 'geocode', progress: 40, message: 'Geocoding addresses...' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress({ step: 'upsert', progress: 70, message: 'Saving to database...' });
      await onImport(columnMapping, finalCountry);
      
      // Emit telemetry for successful import with inferred country
      telemetryService.emitCustomEvent('import_with_inferred_country', {
        country: finalCountry,
        rowCount: sampleRows.length,
        inferenceConfidence: countryInference?.confidence,
        wasManualOverride: !!manualCountryOverride,
        filename
      });
      
      setProgress({ step: 'refresh', progress: 100, message: 'Refreshing data...' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ Import error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      console.error('❌ Showing error to user:', errorMessage);
      showError(errorMessage);
      setProgress({ step: 'parse', progress: 0, message: 'Import failed' });
    } finally {
      setIsImporting(false);
    }
  }, [columnMapping, countryInference, manualCountryOverride, isImporting, onImport, showError, showInfo]);

  const handleClose = useCallback(() => {
    if (isImporting) return;
    onClose();
  }, [isImporting, onClose]);

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isImporting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, isImporting, onClose]);

  if (!isOpen) return null;

  const availableFields = Object.keys(HEADER_SYNONYMS);
  const validationSummary = getValidationSummary(sampleRows);

  return (
    <div className="modal-overlay">
      <div className="modal-content preview-modal">
        <div className="modal-header">
          <h2 className="modal-title">Import Store Data</h2>
          <button 
            onClick={handleClose} 
            className="modal-close"
            disabled={isImporting}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Progress Indicator */}
          <ProgressIndicator
            currentStep={progress.step}
            progress={progress.progress}
            message={progress.message}
            isVisible={isImporting}
          />

          {/* Main Content - hidden during import */}
          <div className={`main-content ${isImporting ? 'hidden' : ''}`}>
            {/* File Summary */}
            <div className="file-summary">
            <div className="summary-item">
              <span className="summary-label">Total Rows:</span>
              <span className="summary-value">{totalRows}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Columns:</span>
              <span className="summary-value">{detectedHeaders.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Preview:</span>
              <span className="summary-value">First {sampleRows.length} rows</span>
            </div>
          </div>

          {/* Country Inference Section */}
          <CountryInferenceDisplay
            inference={countryInference}
            manualOverride={manualCountryOverride}
            onCountryChange={handleCountryChange}
            disabled={isImporting}
          />

          {/* Column Mapping Section */}
          <div className="mapping-section">
            <h3 className="section-title">Map Columns</h3>
            <p className="section-description">
              Map your spreadsheet columns to store data fields. Required fields are marked with *.
            </p>
            
            <div className="mapping-grid">
              {availableFields.map(field => (
                <div key={field} className="mapping-row">
                  <label className="mapping-label">
                    {formatFieldName(field)}
                    {isRequiredField(field) && <span className="required">*</span>}
                  </label>
                  <select
                    value={columnMapping[field] || ''}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                    className="mapping-select"
                    disabled={isImporting}
                  >
                    <option value="">-- Select Column --</option>
                    {detectedHeaders.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview Section */}
          <div className="preview-section">
            <h3 className="section-title">Data Preview</h3>
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th className="row-number">#</th>
                    {detectedHeaders.map(header => (
                      <th key={header} className="preview-header">
                        <div className="header-content">
                          <span className="header-name">{header}</span>
                          {getMappedField(header, columnMapping) && (
                            <span className="mapped-field">
                              → {formatFieldName(getMappedField(header, columnMapping)!)}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, index) => (
                    <tr key={index} className={`preview-row ${row.validationStatus}`}>
                      <td className="row-number">{row.index + 1}</td>
                      {detectedHeaders.map(header => (
                        <td key={header} className="preview-cell">
                          <div className="cell-content">
                            <span className="cell-value">
                              {row.data[header] || '—'}
                            </span>
                            {row.validationStatus === 'invalid' && row.validationErrors.length > 0 && (
                              <div className="cell-errors">
                                {row.validationErrors.map((error, errorIndex) => (
                                  <span key={errorIndex} className="error-message">
                                    {error}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="validation-section">
            <h3 className="section-title">Validation Summary</h3>
            <div className="validation-stats">
              <div className="stat-item valid">
                <span className="stat-count">{validationSummary.valid}</span>
                <span className="stat-label">Valid</span>
              </div>
              <div className="stat-item invalid">
                <span className="stat-count">{validationSummary.invalid}</span>
                <span className="stat-label">Invalid</span>
              </div>
              <div className="stat-item duplicate">
                <span className="stat-count">{validationSummary.duplicate}</span>
                <span className="stat-label">Duplicates</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            onClick={handleClose} 
            className="btn-secondary"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button 
            onClick={handleImport} 
            className={`btn-primary ${isImporting ? 'importing' : ''}`}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <span className="spinner"></span>
                Importing...
              </>
            ) : (
              'Import & Geocode'
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: var(--s-bg);
          border-radius: 8px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 90vw;
          max-height: 90vh;
          width: 1200px;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid var(--s-border);
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--s-text);
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--s-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .modal-close:hover:not(:disabled) {
          color: var(--s-text);
          background: var(--s-bg-secondary);
        }

        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .main-content {
          transition: opacity 0.3s ease;
        }

        .main-content.hidden {
          opacity: 0;
          pointer-events: none;
          position: absolute;
          visibility: hidden;
        }

        .file-summary {
          display: flex;
          gap: 24px;
          margin-bottom: 32px;
          padding: 16px;
          background: var(--s-bg-secondary);
          border-radius: 6px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-label {
          font-size: 12px;
          color: var(--s-muted);
          text-transform: uppercase;
          font-weight: 500;
        }

        .summary-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--s-text);
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--s-text);
          margin: 0 0 8px 0;
        }

        .section-description {
          font-size: 14px;
          color: var(--s-muted);
          margin: 0 0 16px 0;
        }

        .mapping-section {
          margin-bottom: 32px;
        }

        .mapping-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .mapping-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mapping-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--s-text);
        }

        .required {
          color: var(--s-error, #dc3545);
          margin-left: 4px;
        }

        .mapping-select {
          padding: 8px 12px;
          border: 1px solid var(--s-border);
          border-radius: 4px;
          background: var(--s-bg);
          color: var(--s-text);
          font-size: 14px;
        }

        .mapping-select:focus {
          outline: none;
          border-color: var(--s-primary);
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .preview-section {
          margin-bottom: 32px;
        }

        .preview-table-container {
          border: 1px solid var(--s-border);
          border-radius: 6px;
          overflow: auto;
          max-height: 400px;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .preview-table th,
        .preview-table td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid var(--s-border);
        }

        .preview-table th {
          background: var(--s-bg-secondary);
          font-weight: 500;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .row-number {
          width: 50px;
          text-align: center;
          color: var(--s-muted);
          font-weight: 500;
        }

        .preview-header {
          min-width: 120px;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .header-name {
          font-weight: 500;
        }

        .mapped-field {
          font-size: 11px;
          color: var(--s-primary);
          font-weight: 400;
        }

        .preview-row.invalid {
          background: rgba(220, 53, 69, 0.05);
        }

        .preview-row.duplicate {
          background: rgba(255, 193, 7, 0.05);
        }

        .cell-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cell-value {
          color: var(--s-text);
        }

        .cell-errors {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .error-message {
          font-size: 11px;
          color: var(--s-error, #dc3545);
          background: rgba(220, 53, 69, 0.1);
          padding: 2px 6px;
          border-radius: 3px;
        }

        .validation-section {
          margin-bottom: 16px;
        }

        .validation-stats {
          display: flex;
          gap: 24px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px;
          border-radius: 6px;
          min-width: 80px;
        }

        .stat-item.valid {
          background: rgba(40, 167, 69, 0.1);
          color: var(--s-success, #28a745);
        }

        .stat-item.invalid {
          background: rgba(220, 53, 69, 0.1);
          color: var(--s-error, #dc3545);
        }

        .stat-item.duplicate {
          background: rgba(255, 193, 7, 0.1);
          color: var(--s-warning, #ffc107);
        }

        .stat-count {
          font-size: 24px;
          font-weight: 700;
        }

        .stat-label {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 500;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 24px;
          border-top: 1px solid var(--s-border);
        }

        .btn-secondary,
        .btn-primary {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-secondary {
          background: var(--s-bg-secondary);
          color: var(--s-text);
          border: 1px solid var(--s-border);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--s-border);
        }

        .btn-primary {
          background: var(--s-primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--s-primary-dark, #0056b3);
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary.importing {
          background: var(--s-muted);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 95vw;
            max-height: 95vh;
          }

          .mapping-grid {
            grid-template-columns: 1fr;
          }

          .file-summary {
            flex-direction: column;
            gap: 12px;
          }

          .validation-stats {
            justify-content: space-around;
          }
        }
      `}</style>
    </div>
  );
}

// Helper functions
function formatFieldName(field: string): string {
  return field
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isRequiredField(field: string): boolean {
  // Country is no longer required since it can be inferred
  return ['name', 'address', 'city'].includes(field);
}

function getMappedField(header: string, mapping: Record<string, string>): string | null {
  for (const [field, mappedHeader] of Object.entries(mapping)) {
    if (mappedHeader === header) {
      return field;
    }
  }
  return null;
}

function getValidationSummary(rows: ParsedRow[]): { valid: number; invalid: number; duplicate: number } {
  return rows.reduce(
    (acc, row) => {
      if (row.validationStatus === 'valid') acc.valid++;
      else if (row.validationStatus === 'invalid') acc.invalid++;
      else if (row.validationStatus === 'duplicate') acc.duplicate++;
      return acc;
    },
    { valid: 0, invalid: 0, duplicate: 0 }
  );
}