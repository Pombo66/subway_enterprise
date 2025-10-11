import { FeaturePreservationValidator } from './feature-preservation-validator';

export async function testFeaturePreservationValidator() {
  console.log('🛡️ Testing Feature Preservation Validator...');
  
  const validator = new FeaturePreservationValidator('/Users/khalidgehlan/subway_enterprise-1/apps/admin');

  // Test 1: Scan for existing Kiro features
  console.log('\n📝 Test 1: Scanning for Kiro features');
  const existingFeatures = await validator.scanForKiroFeatures();
  console.log('Found Kiro features:', {
    total: existingFeatures.length,
    byType: existingFeatures.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  // Test 2: Safe restoration (no conflicts)
  console.log('\n📝 Test 2: Safe restoration validation');
  const originalSafeFile = `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';

export function Dashboard() {
  const telemetry = useTelemetry();
  
  const handleClick = () => {
    telemetry.trackEvent('dashboard_click');
  };

  return (
    <div className="dashboard">
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
`;

  const modifiedSafeFile = `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';

export function Dashboard() {
  const telemetry = useTelemetry();
  
  const handleClick = () => {
    telemetry.trackEvent('dashboard_click');
  };

  return (
    <div className="dashboard s-panGrid">
      <div className="s-card">New KPI Tile</div>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
`;

  const safeModifications = new Map([['Dashboard.tsx', modifiedSafeFile]]);
  const safeOriginals = new Map([['Dashboard.tsx', originalSafeFile]]);
  
  const safeResult = await validator.validateFeaturePreservation(safeModifications, safeOriginals);
  console.log('Safe restoration result:', {
    isValid: safeResult.isValid,
    conflictCount: safeResult.conflicts.length,
    dataFlowIssueCount: safeResult.dataFlowIssues.length,
    recommendations: safeResult.recommendations
  });

  // Test 3: Conflicting restoration
  console.log('\n📝 Test 3: Conflicting restoration validation');
  const originalConflictFile = `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';
import { KiroProvider } from '@/lib/kiro';

export function App({ telemetryData }) {
  const telemetry = useTelemetry();
  
  return (
    <KiroProvider>
      <div>App content</div>
    </KiroProvider>
  );
}
`;

  const modifiedConflictFile = `
import React from 'react';
import { KiroComponent } from './restored-components';

export function App() {
  // Removed telemetry usage
  
  return (
    <div>
      <KiroComponent />
      <div>App content</div>
    </div>
  );
}
`;

  const conflictModifications = new Map([['App.tsx', modifiedConflictFile]]);
  const conflictOriginals = new Map([['App.tsx', originalConflictFile]]);
  
  const conflictResult = await validator.validateFeaturePreservation(conflictModifications, conflictOriginals);
  console.log('Conflicting restoration result:', {
    isValid: conflictResult.isValid,
    conflictCount: conflictResult.conflicts.length,
    dataFlowIssueCount: conflictResult.dataFlowIssues.length,
    highSeverityConflicts: conflictResult.conflicts.filter(c => c.severity === 'high').length,
    recommendations: conflictResult.recommendations
  });

  // Test 4: API modification detection
  console.log('\n📝 Test 4: API modification detection');
  const originalAPIFile = `
import React from 'react';

export function DataComponent() {
  const fetchData = async () => {
    const response = await fetch('/api/kiro/data');
    const telemetryResponse = await fetch('/api/telemetry/events');
    return { data: response, telemetry: telemetryResponse };
  };

  return <div>Data Component</div>;
}
`;

  const modifiedAPIFile = `
import React from 'react';

export function DataComponent() {
  const fetchData = async () => {
    const response = await fetch('/api/dashboard/data');
    // Removed telemetry API call
    return { data: response };
  };

  return <div>Data Component</div>;
}
`;

  const apiModifications = new Map([['DataComponent.tsx', modifiedAPIFile]]);
  const apiOriginals = new Map([['DataComponent.tsx', originalAPIFile]]);
  
  const apiResult = await validator.validateFeaturePreservation(apiModifications, apiOriginals);
  console.log('API modification result:', {
    isValid: apiResult.isValid,
    dataFlowIssues: apiResult.dataFlowIssues.map(issue => ({
      type: issue.type,
      description: issue.description,
      impact: issue.impact
    }))
  });

  // Test 5: State interference detection
  console.log('\n📝 Test 5: State interference detection');
  const originalStateFile = `
import React, { useState } from 'react';

export function Component() {
  const [data, setData] = useState(null);
  
  return <div>Component</div>;
}
`;

  const modifiedStateFile = `
import React, { useState } from 'react';

export function Component() {
  const [data, setData] = useState(null);
  const [kiroState, setKiroState] = useState({}); // Potential interference
  const [telemetryBuffer, setTelemetryBuffer] = useState([]); // Potential interference
  
  return <div>Component</div>;
}
`;

  const stateModifications = new Map([['Component.tsx', modifiedStateFile]]);
  const stateOriginals = new Map([['Component.tsx', originalStateFile]]);
  
  const stateResult = await validator.validateFeaturePreservation(stateModifications, stateOriginals);
  console.log('State interference result:', {
    isValid: stateResult.isValid,
    stateIssues: stateResult.dataFlowIssues.filter(issue => issue.type === 'state-interference').length,
    issues: stateResult.dataFlowIssues.map(issue => issue.description)
  });

  console.log('\n✅ Feature Preservation Validator tests completed');
}

// Example usage for validating actual codemod output
export async function validateCodemodPreservation() {
  console.log('🔧 Validating codemod preservation...');
  
  const validator = new FeaturePreservationValidator('/Users/khalidgehlan/subway_enterprise-1/apps/admin');

  // Simulate a codemod that adds KPI tiles while preserving telemetry
  const originalDashboard = `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';

export function Dashboard({ kpis }) {
  const telemetry = useTelemetry();
  
  const handleKPIClick = (kpiName) => {
    telemetry.trackEvent('kpi_click', { kpi: kpiName });
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="s-card" onClick={() => handleKPIClick('orders')}>
        <div className="s-k">Orders Today</div>
        <div className="s-v">{kpis.ordersToday}</div>
      </div>
      <div className="s-card" onClick={() => handleKPIClick('revenue')}>
        <div className="s-k">Revenue Today</div>
        <div className="s-v">{kpis.revenueToday}</div>
      </div>
    </div>
  );
}
`;

  const restoredDashboard = `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';

export function Dashboard({ kpis }) {
  const telemetry = useTelemetry();
  
  const handleKPIClick = (kpiName) => {
    telemetry.trackEvent('kpi_click', { kpi: kpiName });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="s-card" onClick={() => handleKPIClick('orders')}>
        <div className="s-k">Orders Today</div>
        <div className="s-v">{kpis.ordersToday}</div>
      </div>
      <div className="s-card" onClick={() => handleKPIClick('revenue')}>
        <div className="s-k">Revenue Today</div>
        <div className="s-v">{kpis.revenueToday}</div>
      </div>
      {/* Restored KPI tiles */}
      <div className="s-card" onClick={() => handleKPIClick('stores')}>
        <div className="s-k">Total Stores</div>
        <div className="s-v">{kpis.totalStores ?? '—'}</div>
      </div>
      <div className="s-card" onClick={() => handleKPIClick('users')}>
        <div className="s-k">Active Users</div>
        <div className="s-v">{kpis.activeUsers ?? '—'}</div>
      </div>
      <div className="s-card" onClick={() => handleKPIClick('satisfaction')}>
        <div className="s-k">Customer Satisfaction</div>
        <div className="s-v">{kpis.customerSatisfaction ?? '—'}</div>
      </div>
    </div>
  );
}
`;

  const modifications = new Map([['app/dashboard/page.tsx', restoredDashboard]]);
  const originals = new Map([['app/dashboard/page.tsx', originalDashboard]]);
  
  const result = await validator.validateFeaturePreservation(modifications, originals);
  
  console.log('Codemod preservation validation:', {
    isValid: result.isValid,
    preservedFeatures: result.preservedFeatures.length,
    conflicts: result.conflicts.length,
    dataFlowIssues: result.dataFlowIssues.length,
    recommendations: result.recommendations
  });

  if (result.conflicts.length > 0) {
    console.log('\nConflicts detected:');
    result.conflicts.forEach(conflict => {
      console.log(`  - ${conflict.severity.toUpperCase()}: ${conflict.conflict}`);
      console.log(`    Suggestion: ${conflict.suggestion}`);
    });
  }

  if (result.dataFlowIssues.length > 0) {
    console.log('\nData flow issues:');
    result.dataFlowIssues.forEach(issue => {
      console.log(`  - ${issue.impact.toUpperCase()}: ${issue.description}`);
      console.log(`    Mitigation: ${issue.mitigation}`);
    });
  }

  return result;
}