'use client';

import React from 'react';
import { Database, BookOpen, Info } from 'lucide-react';
import { DataModeToggleProps } from './types';

export const DataModeToggle: React.FC<DataModeToggleProps> = ({
  currentMode,
  onModeChange,
  modelVersion,
  dataSnapshotDate
}) => {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const modeInfo = {
    live: {
      icon: '🔴',
      title: 'Live Data',
      description: 'Current Subway network, openings, closures, performance',
      color: 'red'
    },
    modelled: {
      icon: '📘',
      title: 'Modelled',
      description: 'Cached demographic or POI proxy data',
      color: 'blue'
    }
  };

  const currentInfo = modeInfo[currentMode];

  return (
    <div style={{ 
      background: 'var(--s-background)', 
      border: '1px solid var(--s-border)', 
      borderRadius: '6px', 
      padding: '16px' 
    }} data-design-guard="off">
      
      {/* Mode Toggle */}
      <div style={{ 
        display: 'flex',
        background: 'var(--s-panel)',
        border: '1px solid var(--s-border)',
        borderRadius: '6px',
        padding: '2px'
      }}>
        <button
          onClick={() => onModeChange('live')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 12px',
            fontSize: '13px',
            fontWeight: '500',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: currentMode === 'live' ? 'var(--s-primary)' : 'transparent',
            color: currentMode === 'live' ? 'white' : 'var(--s-text)',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '14px' }}>🔴</span>
          Live Data
        </button>
        
        <button
          onClick={() => onModeChange('modelled')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 12px',
            fontSize: '13px',
            fontWeight: '500',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: currentMode === 'modelled' ? 'var(--s-primary)' : 'transparent',
            color: currentMode === 'modelled' ? 'white' : 'var(--s-text)',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '14px' }}>📘</span>
          Modelled
        </button>
      </div>

      
      {/* Current Mode Info */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        borderRadius: '6px',
        borderLeft: `4px solid ${currentMode === 'live' ? '#ef4444' : '#3b82f6'}`,
        background: 'var(--s-panel)',
        border: '1px solid var(--s-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{currentInfo.icon}</span>
          <div style={{ flex: 1 }}>
            <h4 style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--s-text)',
              margin: '0 0 4px 0'
            }}>
              {currentInfo.title}
            </h4>
            <p style={{
              fontSize: '12px',
              color: 'var(--s-muted)',
              margin: 0
            }}>
              {currentInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--s-muted)',
        paddingTop: '12px',
        borderTop: '1px solid var(--s-border)',
        marginTop: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <BookOpen style={{ width: '12px', height: '12px' }} />
          <span>Model: {modelVersion}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Info style={{ width: '12px', height: '12px' }} />
          <span>Updated: {formatDate(dataSnapshotDate)}</span>
        </div>
      </div>
    </div>
  );
};

export default DataModeToggle;