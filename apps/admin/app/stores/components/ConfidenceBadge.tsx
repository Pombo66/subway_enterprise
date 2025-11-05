'use client';

interface ConfidenceBadgeProps {
  confidence: 'high' | 'medium' | 'low';
  tooltip?: string;
  className?: string;
}

export default function ConfidenceBadge({ 
  confidence, 
  tooltip,
  className = '' 
}: ConfidenceBadgeProps) {
  const config = {
    high: { emoji: '🟢', label: 'High', color: '#28a745' },
    medium: { emoji: '🟡', label: 'Medium', color: '#ffc107' },
    low: { emoji: '🔴', label: 'Low', color: '#dc3545' }
  };
  
  const { emoji, label, color } = config[confidence];
  
  return (
    <>
      <span 
        className={`confidence-badge ${className}`}
        style={{ color }}
        title={tooltip}
      >
        {emoji} {label}
      </span>
      
      <style jsx>{`
        .confidence-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.05);
          cursor: help;
          transition: background 0.2s ease;
        }
        
        .confidence-badge:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </>
  );
}
