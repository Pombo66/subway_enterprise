'use client';

import { CountryInference, COUNTRY_INFO } from '../../../lib/import/types';
import ConfidenceBadge from './ConfidenceBadge';

interface CountryInferenceDisplayProps {
  inference: CountryInference | null;
  manualOverride: string | null;
  onCountryChange: (country: string) => void;
  disabled?: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  column: 'from country column',
  filename: 'from filename',
  format: 'from postcodes',
  fallback: 'default selection'
};

export default function CountryInferenceDisplay({
  inference,
  manualOverride,
  onCountryChange,
  disabled = false
}: CountryInferenceDisplayProps) {
  const displayCountry = manualOverride || inference?.country || 'DE';
  const isManual = !!manualOverride;
  
  return (
    <>
      <div className="country-inference-section">
        <label className="section-label">
          Country
          {!isManual && inference?.confidence === 'low' && (
            <span className="required">*</span>
          )}
        </label>
        
        <div className="country-display">
          <select
            value={displayCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="country-select"
            disabled={disabled}
          >
            {Object.entries(COUNTRY_INFO).map(([code, info]) => (
              <option key={code} value={code}>
                {info.flag} {info.name}
              </option>
            ))}
          </select>
          
          {!isManual && inference && (
            <div className="inference-info">
              <ConfidenceBadge 
                confidence={inference.confidence}
                tooltip={inference.displayText}
              />
              <span className="detection-method">
                {METHOD_LABELS[inference.method] || inference.method}
              </span>
            </div>
          )}
          
          {isManual && (
            <span className="manual-indicator">
              ✏️ Manual selection
            </span>
          )}
        </div>
        
        {inference && inference.confidence !== 'high' && !isManual && (
          <p className="inference-hint">
            {inference.displayText}
          </p>
        )}
      </div>
      
      <style jsx>{`
        .country-inference-section {
          margin-bottom: 24px;
          padding: 16px;
          background: var(--s-bg-secondary);
          border-radius: 6px;
          border: 1px solid var(--s-border);
        }
        
        .section-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--s-text);
          margin-bottom: 8px;
        }
        
        .required {
          color: var(--s-error, #dc3545);
          margin-left: 4px;
        }
        
        .country-display {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .country-select {
          flex: 0 0 auto;
          min-width: 200px;
          padding: 8px 12px;
          border: 1px solid var(--s-border);
          border-radius: 4px;
          background: var(--s-bg);
          color: var(--s-text);
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }
        
        .country-select:focus {
          outline: none;
          border-color: var(--s-primary);
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        
        .country-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: var(--s-bg-secondary);
        }
        
        .inference-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .detection-method {
          font-size: 13px;
          color: var(--s-muted);
          font-style: italic;
        }
        
        .manual-indicator {
          font-size: 13px;
          color: var(--s-primary);
          font-weight: 500;
        }
        
        .inference-hint {
          margin: 8px 0 0 0;
          font-size: 13px;
          color: var(--s-muted);
          line-height: 1.4;
        }
        
        @media (max-width: 768px) {
          .country-display {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .country-select {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
