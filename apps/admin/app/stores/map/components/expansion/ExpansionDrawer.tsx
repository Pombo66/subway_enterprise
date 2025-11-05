'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { 
  X, 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Users, 
  Building, 
  AlertTriangle,
  Target,
  Brain
} from 'lucide-react';
import { ExpansionRecommendation, ExpansionInsights } from './types';

export interface ExpansionDrawerProps {
  recommendation: ExpansionRecommendation | null;
  isOpen: boolean;
  onClose: () => void;
  onAskSubMind: (reasoning: string[]) => void;
  insights?: ExpansionInsights;
  loadingInsights?: boolean;
}

/**
 * ExpansionDrawer component displays detailed expansion insights in a slide-out drawer
 */
export default function ExpansionDrawer({
  recommendation,
  isOpen,
  onClose,
  onAskSubMind,
  insights,
  loadingInsights = false
}: ExpansionDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Handle keyboard navigation and focus management
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
      
      // Handle Tab key to trap focus within drawer
      if (event.key === 'Tab' && isOpen) {
        const drawer = drawerRef.current;
        if (!drawer) return;
        
        const focusableElements = drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Focus the close button initially
      setTimeout(() => {
        const closeButton = drawerRef.current?.querySelector('[aria-label="Close expansion details"]') as HTMLElement;
        closeButton?.focus();
      }, 100);
      
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle Ask SubMind
  const handleAskSubMind = useCallback(async () => {
    if (!recommendation) return;
    
    setAiLoading(true);
    try {
      const reasoning = [
        `Location: ${recommendation.region}${recommendation.country ? `, ${recommendation.country}` : ''}`,
        `Final Score: ${(recommendation.finalScore * 100).toFixed(1)}%`,
        `Confidence: ${(recommendation.confidence * 100).toFixed(1)}%`,
        `Population: ${recommendation.population.toLocaleString()}`,
        `Footfall Index: ${(recommendation.footfallIndex * 100).toFixed(1)}%`,
        `Income Index: ${(recommendation.incomeIndex * 100).toFixed(1)}%`,
        `Competition Penalty: ${(recommendation.competitionPenalty * 100).toFixed(1)}%`,
        recommendation.predictedAUV ? `Predicted AUV: $${recommendation.predictedAUV.toLocaleString()}` : '',
        recommendation.paybackPeriod ? `Payback Period: ${recommendation.paybackPeriod} months` : ''
      ].filter(Boolean);
      
      await onAskSubMind(reasoning);
    } finally {
      setAiLoading(false);
    }
  }, [recommendation, onAskSubMind]);

  if (!isOpen || !recommendation) {
    return null;
  }

  const confidenceColor = recommendation.confidence >= 0.9 ? '#22c55e' : 
                         recommendation.confidence >= 0.7 ? '#f59e0b' : '#ef4444';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expansion-drawer-title"
      data-design-guard="off"
    >
      <div 
        ref={drawerRef}
        style={{
          width: '400px',
          maxWidth: '90vw',
          height: '100vh',
          backgroundColor: 'var(--s-panel)',
          borderLeft: '1px solid var(--s-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        tabIndex={-1}
        role="document"
        aria-label={`Expansion details for ${recommendation.region}`}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--s-border)',
          backgroundColor: 'var(--s-background)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h2 
                id="expansion-drawer-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--s-text)',
                  marginBottom: '8px'
                }}
              >
                Expansion Opportunity
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--s-muted)'
              }}>
                <MapPin size={14} />
                <span>{recommendation.region}{recommendation.country ? `, ${recommendation.country}` : ''}</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: confidenceColor,
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {recommendation.isLive ? '🔴' : '📊'} 
                  {(recommendation.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close expansion details"
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--s-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Predicted Metrics */}
          <div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--s-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Predicted Performance
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {recommendation.predictedAUV && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--s-background)',
                  border: '1px solid var(--s-border)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <DollarSign size={16} style={{ color: 'var(--s-primary)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--s-muted)', fontWeight: '500' }}>
                      Predicted AUV
                    </span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--s-text)' }}>
                    ${recommendation.predictedAUV.toLocaleString()}
                  </div>
                </div>
              )}
              
              {recommendation.paybackPeriod && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--s-background)',
                  border: '1px solid var(--s-border)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Clock size={16} style={{ color: 'var(--s-primary)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--s-muted)', fontWeight: '500' }}>
                      Payback Period
                    </span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--s-text)' }}>
                    {recommendation.paybackPeriod} months
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gravity Model Components */}
          <div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--s-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Gravity Model Analysis
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'var(--s-background)',
                border: '1px solid var(--s-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={14} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '13px', color: 'var(--s-text)' }}>Final Score</span>
                </div>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  padding: '2px 8px',
                  backgroundColor: 'var(--s-primary)',
                  color: 'white',
                  borderRadius: '4px'
                }}>
                  {(recommendation.finalScore * 100).toFixed(1)}%
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'var(--s-background)',
                border: '1px solid var(--s-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={14} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '13px', color: 'var(--s-text)' }}>Demand Score</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--s-text)' }}>
                  {(recommendation.demandScore * 100).toFixed(1)}%
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'var(--s-background)',
                border: '1px solid var(--s-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={14} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '13px', color: 'var(--s-text)' }}>Competition Penalty</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--s-text)' }}>
                  {(recommendation.competitionPenalty * 100).toFixed(1)}%
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'var(--s-background)',
                border: '1px solid var(--s-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '13px', color: 'var(--s-text)' }}>Supply Penalty</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--s-text)' }}>
                  {(recommendation.supplyPenalty * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--s-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Demographics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'var(--s-background)',
                border: '1px solid var(--s-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={14} style={{ color: 'var(--s-primary)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--s-text)' }}>Population</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--s-text)' }}>
                  {recommendation.population.toLocaleString()}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'var(--s-background)',
                border: '1px solid var(--s-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={14} style={{ color: 'var(--s-primary)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--s-text)' }}>Footfall Index</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--s-text)' }}>
                  {(recommendation.footfallIndex * 100).toFixed(1)}%
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'var(--s-background)',
                border: '1px solid var(--s-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={14} style={{ color: 'var(--s-primary)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--s-text)' }}>Income Index</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--s-text)' }}>
                  {(recommendation.incomeIndex * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              onClick={handleAskSubMind}
              disabled={aiLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'var(--s-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: aiLoading ? 'not-allowed' : 'pointer',
                opacity: aiLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {aiLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain size={16} />
                  Ask SubMind for Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}