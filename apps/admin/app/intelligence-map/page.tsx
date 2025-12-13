'use client';

import { Suspense } from 'react';
import { FeatureFlags } from '../../lib/featureFlags';
import ExpansionIntegratedMapPage from '../stores/map/components/ExpansionIntegratedMapPage';

function IntelligenceMapContent() {
  // Check if expansion predictor feature is enabled
  const isExpansionFeatureEnabled = FeatureFlags.isExpansionPredictorEnabled();
  
  if (isExpansionFeatureEnabled) {
    // Use the full-featured expansion integrated map page
    return <ExpansionIntegratedMapPage />;
  }

  // Fallback to basic message if expansion features are disabled
  return (
    <div className="s-wrap">
      <div className="menu-header-section">
        <div>
          <h1 className="s-h1">Unified Intelligence Map</h1>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Comprehensive view of stores, competitors, expansion opportunities, and competitive zones
          </p>
        </div>
      </div>

      <div className="s-panel">
        <div className="s-panelCard">
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            color: 'var(--s-muted)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🗺️</div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--s-text)', 
              marginBottom: '12px' 
            }}>
              Intelligence Map Features Disabled
            </h3>
            <p style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              The Intelligence Map requires the Expansion Predictor feature to be enabled.<br />
              Please enable it in your environment configuration.
            </p>
            <div style={{
              background: 'var(--s-panel)',
              border: '1px solid var(--s-border)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '14px',
              fontFamily: 'monospace',
              textAlign: 'left',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntelligenceMapPage() {
  return (
    <main>
      <Suspense fallback={
        <div className="s-wrap">
          <div className="p-6">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--s-text)', marginBottom: '8px' }}>
                Loading Intelligence Map...
              </div>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                Initializing comprehensive store intelligence system with full functionality
              </div>
            </div>
          </div>
        </div>
      }>
        <IntelligenceMapContent />
      </Suspense>
    </main>
  );
}
