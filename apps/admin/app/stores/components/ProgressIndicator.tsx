'use client';

import { ProgressIndicatorProps } from '../../../lib/types/store-upload';

export default function ProgressIndicator({
  currentStep,
  progress,
  message,
  isVisible
}: ProgressIndicatorProps) {
  if (!isVisible) return null;

  const steps = [
    { key: 'parse', label: 'Parse', icon: '📄' },
    { key: 'validate', label: 'Validate', icon: '✓' },
    { key: 'geocode', label: 'Geocode', icon: '🌍' },
    { key: 'upsert', label: 'Save', icon: '💾' },
    { key: 'refresh', label: 'Refresh', icon: '🔄' }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3 className="progress-title">Processing Import</h3>
        <div className="progress-percentage">{Math.round(progress)}%</div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="steps-container">
        {steps.map((step, index) => (
          <div 
            key={step.key}
            className={`step-item ${
              index < currentStepIndex ? 'completed' : 
              index === currentStepIndex ? 'active' : 
              'pending'
            }`}
          >
            <div className="step-icon">
              {index < currentStepIndex ? '✅' : 
               index === currentStepIndex ? (
                 <div className="step-spinner" />
               ) : step.icon}
            </div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>

      {/* Current Message */}
      <div className="progress-message">
        {message}
      </div>

      <style jsx>{`
        .progress-indicator {
          background: var(--s-bg);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          margin: 0 auto;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .progress-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--s-text);
          margin: 0;
        }

        .progress-percentage {
          font-size: 16px;
          font-weight: 600;
          color: var(--s-primary);
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: var(--s-bg-secondary);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--s-primary), var(--s-primary-light, #4dabf7));
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .steps-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          position: relative;
        }

        .steps-container::before {
          content: '';
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          height: 2px;
          background: var(--s-border);
          z-index: 0;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .step-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          background: var(--s-bg);
          border: 2px solid var(--s-border);
          transition: all 0.3s ease;
        }

        .step-item.completed .step-icon {
          background: var(--s-success, #28a745);
          border-color: var(--s-success, #28a745);
          color: white;
        }

        .step-item.active .step-icon {
          background: var(--s-primary);
          border-color: var(--s-primary);
          color: white;
        }

        .step-item.pending .step-icon {
          background: var(--s-bg-secondary);
          border-color: var(--s-border);
          color: var(--s-muted);
        }

        .step-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .step-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--s-text);
          text-align: center;
        }

        .step-item.pending .step-label {
          color: var(--s-muted);
        }

        .progress-message {
          text-align: center;
          font-size: 14px;
          color: var(--s-muted);
          font-style: italic;
          min-height: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .progress-indicator {
            padding: 16px;
          }

          .progress-title {
            font-size: 16px;
          }

          .progress-percentage {
            font-size: 14px;
          }

          .step-icon {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .step-label {
            font-size: 11px;
          }

          .steps-container::before {
            top: 16px;
            left: 16px;
            right: 16px;
          }
        }
      `}</style>
    </div>
  );
}