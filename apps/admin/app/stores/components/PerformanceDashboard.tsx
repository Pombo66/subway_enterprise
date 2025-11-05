'use client';

import { useState, useEffect } from 'react';

interface PerformanceMetrics {
  overallRating: 'excellent' | 'good' | 'needs_improvement';
  benchmarks: Record<string, string>;
  bottlenecks: string[];
  recommendations: string[];
}

interface PerformanceDashboardProps {
  metrics?: PerformanceMetrics;
  isVisible: boolean;
  onClose: () => void;
}

export default function PerformanceDashboard({ metrics, isVisible, onClose }: PerformanceDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isVisible && metrics) {
      // Auto-expand if there are performance issues
      setIsExpanded(metrics.overallRating === 'needs_improvement');
    }
  }, [isVisible, metrics]);

  if (!isVisible || !metrics) return null;

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return '#28a745';
      case 'good': return '#17a2b8';
      case 'needs_improvement': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'excellent': return '🚀';
      case 'good': return '✅';
      case 'needs_improvement': return '⚠️';
      default: return '📊';
    }
  };

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="rating-indicator">
          <span className="rating-icon">{getRatingIcon(metrics.overallRating)}</span>
          <span 
            className="rating-text"
            style={{ color: getRatingColor(metrics.overallRating) }}
          >
            Performance: {metrics.overallRating.replace('_', ' ')}
          </span>
        </div>
        <div className="expand-controls">
          <button className="expand-btn">
            {isExpanded ? '▼' : '▶'}
          </button>
          <button className="close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            ✕
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="dashboard-content">
          {/* Benchmarks */}
          {Object.keys(metrics.benchmarks).length > 0 && (
            <div className="metrics-section">
              <h4 className="section-title">Performance Benchmarks</h4>
              <div className="benchmarks-grid">
                {Object.entries(metrics.benchmarks).map(([key, value]) => (
                  <div key={key} className="benchmark-item">
                    <span className="benchmark-label">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                    </span>
                    <span className="benchmark-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottlenecks */}
          {metrics.bottlenecks.length > 0 && (
            <div className="metrics-section">
              <h4 className="section-title">Performance Issues</h4>
              <ul className="issues-list">
                {metrics.bottlenecks.map((bottleneck, index) => (
                  <li key={index} className="issue-item">
                    ⚠️ {bottleneck}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <div className="metrics-section">
              <h4 className="section-title">Recommendations</h4>
              <ul className="recommendations-list">
                {metrics.recommendations.map((recommendation, index) => (
                  <li key={index} className="recommendation-item">
                    💡 {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No issues message */}
          {metrics.bottlenecks.length === 0 && metrics.recommendations.length === 0 && (
            <div className="no-issues">
              <span className="success-icon">🎉</span>
              <p>Great job! No performance issues detected.</p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .performance-dashboard {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: var(--s-bg);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-width: 400px;
          z-index: 1000;
          font-size: 14px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: ${isExpanded ? '1px solid var(--s-border)' : 'none'};
        }

        .dashboard-header:hover {
          background: var(--s-bg-secondary);
        }

        .rating-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rating-icon {
          font-size: 16px;
        }

        .rating-text {
          font-weight: 600;
          text-transform: capitalize;
        }

        .expand-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .expand-btn,
        .close-btn {
          background: none;
          border: none;
          color: var(--s-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 12px;
        }

        .expand-btn:hover,
        .close-btn:hover {
          background: var(--s-bg-secondary);
          color: var(--s-text);
        }

        .dashboard-content {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
        }

        .metrics-section {
          margin-bottom: 16px;
        }

        .metrics-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--s-text);
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .benchmarks-grid {
          display: grid;
          gap: 6px;
        }

        .benchmark-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: var(--s-bg-secondary);
          border-radius: 4px;
        }

        .benchmark-label {
          color: var(--s-muted);
          font-size: 12px;
        }

        .benchmark-value {
          color: var(--s-text);
          font-weight: 500;
          font-family: monospace;
        }

        .issues-list,
        .recommendations-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .issue-item,
        .recommendation-item {
          padding: 6px 8px;
          margin-bottom: 4px;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1.4;
        }

        .issue-item {
          background: rgba(220, 53, 69, 0.1);
          color: var(--s-error, #dc3545);
        }

        .recommendation-item {
          background: rgba(0, 123, 255, 0.1);
          color: var(--s-primary);
        }

        .no-issues {
          text-align: center;
          padding: 20px;
          color: var(--s-success, #28a745);
        }

        .success-icon {
          font-size: 24px;
          display: block;
          margin-bottom: 8px;
        }

        .no-issues p {
          margin: 0;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .performance-dashboard {
            bottom: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }

          .dashboard-content {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}