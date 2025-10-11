import { SafetyValidationSystem } from './safety-validation-system';

export async function testSafetyValidationSystem() {
  console.log('🔒 Testing Comprehensive Safety Validation System...');
  
  const system = new SafetyValidationSystem('/Users/khalidgehlan/subway_enterprise-1/apps/admin');
  await system.initialize();

  // Test 1: Safe codemod validation
  console.log('\n📝 Test 1: Safe codemod validation');
  const safeOriginalFiles = new Map([
    ['app/dashboard/page.tsx', `
import React from 'react';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="card">Orders: 142</div>
      <div className="card">Revenue: $3,247</div>
    </div>
  );
}
`],
    ['components/KPICard.tsx', `
import React from 'react';

export function KPICard({ title, value }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}
`]
  ]);

  const safeModifiedFiles = new Map([
    ['app/dashboard/page.tsx', `
import React from 'react';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="s-card s-cardAccent">
        <div className="s-blob s-blobGreen">📊</div>
        <div className="s-k">Orders Today</div>
        <div className="s-v">142</div>
      </div>
      <div className="s-card s-cardAccent">
        <div className="s-blob s-blobBlue">💰</div>
        <div className="s-k">Revenue Today</div>
        <div className="s-v">$3,247</div>
      </div>
      <div className="s-card s-cardAccent">
        <div className="s-blob s-blobPurple">🏪</div>
        <div className="s-k">Total Stores</div>
        <div className="s-v">24</div>
      </div>
    </div>
  );
}
`],
    ['components/KPICard.tsx', `
import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: string;
  accentColor?: string;
}

export function KPICard({ title, value, icon, accentColor = 'green' }: KPICardProps) {
  return (
    <div className="s-card s-cardAccent">
      {icon && (
        <div className={\`s-blob s-blob\${accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}\`}>
          <span>{icon}</span>
        </div>
      )}
      <div>
        <div className="s-k">{title}</div>
        <div className="s-v">{value}</div>
      </div>
    </div>
  );
}
`]
  ]);

  const safeResult = await system.validateCodemodSafety(safeModifiedFiles, safeOriginalFiles);
  console.log('Safe codemod result:', {
    isValid: safeResult.isValid,
    overallRiskLevel: safeResult.overallRiskLevel,
    confidence: Math.round(safeResult.summary.confidence * 100) + '%',
    readyForDeployment: safeResult.summary.readyForDeployment,
    summary: {
      totalFiles: safeResult.summary.totalFiles,
      validFiles: safeResult.summary.validFiles,
      criticalIssues: safeResult.summary.criticalIssues,
      highPriorityIssues: safeResult.summary.highPriorityIssues
    }
  });

  // Test 2: Unsafe codemod with multiple violations
  console.log('\n📝 Test 2: Unsafe codemod with violations');
  const unsafeOriginalFiles = new Map([
    ['app/dashboard/page.tsx', `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';

export default function Dashboard() {
  const telemetry = useTelemetry();
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="card">Orders: 142</div>
    </div>
  );
}
`],
    ['schema.prisma', `
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`],
    ['app/api/kpis/route.ts', `
export async function GET() {
  return Response.json({ data: 'existing' });
}
`]
  ]);

  const unsafeModifiedFiles = new Map([
    ['app/dashboard/page.tsx', `
import React from 'react';
// Removed telemetry import - potential feature loss

export default function Dashboard() {
  // Missing telemetry usage
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="s-card">Orders: 142</div>
      <KiroComponent /> {/* Naming conflict */}
    </div>
  );
}
`],
    ['schema.prisma', `
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  role  String @default("user") // Added database field - violation
}

model KPIData { // New model - violation
  id     Int @id @default(autoincrement())
  metric String
}
`],
    ['app/api/kpis/route.ts', `
export async function GET() {
  return Response.json({ data: 'existing' });
}

export async function POST() { // New API endpoint - violation
  return Response.json({ created: true });
}
`]
  ]);

  const unsafeResult = await system.validateCodemodSafety(unsafeModifiedFiles, unsafeOriginalFiles);
  console.log('Unsafe codemod result:', {
    isValid: unsafeResult.isValid,
    overallRiskLevel: unsafeResult.overallRiskLevel,
    confidence: Math.round(unsafeResult.summary.confidence * 100) + '%',
    readyForDeployment: unsafeResult.summary.readyForDeployment,
    blockers: unsafeResult.blockers.length,
    warnings: unsafeResult.warnings.length,
    summary: {
      criticalIssues: unsafeResult.summary.criticalIssues,
      highPriorityIssues: unsafeResult.summary.highPriorityIssues,
      mediumPriorityIssues: unsafeResult.summary.mediumPriorityIssues
    }
  });

  // Test 3: TypeScript errors
  console.log('\n📝 Test 3: TypeScript validation errors');
  const tsErrorFiles = new Map([
    ['components/BrokenComponent.tsx', `
import React from 'react';

export function BrokenComponent() {
  const [count, setCount] = useState(0); // Missing import
  
  useEffect(() => { // Missing import
    console.log('mounted');
  }, []);

  return (
    <Card> {/* Missing import */}
      <Button onClick={() => setCount(count + 1)}> {/* Missing import */}
        Count: {count}
      </Button>
    </Card>
  );
}
`]
  ]);

  const tsOriginalFiles = new Map([
    ['components/BrokenComponent.tsx', `
import React from 'react';

export function BrokenComponent() {
  return <div>Simple component</div>;
}
`]
  ]);

  const tsResult = await system.validateCodemodSafety(tsErrorFiles, tsOriginalFiles);
  console.log('TypeScript error result:', {
    isValid: tsResult.isValid,
    overallRiskLevel: tsResult.overallRiskLevel,
    typeScriptErrors: tsResult.typeScriptValidation.errors.length,
    missingImports: tsResult.typeScriptValidation.missingImports.length,
    blockers: tsResult.blockers.length
  });

  // Test 4: Generate comprehensive report
  console.log('\n📝 Test 4: Comprehensive report generation');
  const report = system.generateComprehensiveReport(unsafeResult);
  console.log('Generated comprehensive report preview:');
  console.log(report.substring(0, 800) + '...\n');

  // Test 5: Feature preservation with telemetry
  console.log('\n📝 Test 5: Feature preservation validation');
  const telemetryOriginal = new Map([
    ['app/components/Analytics.tsx', `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';
import { useKiroAgent } from '@/lib/kiro';

export function Analytics() {
  const telemetry = useTelemetry();
  const agent = useKiroAgent();
  
  const handleEvent = () => {
    telemetry.trackEvent('analytics_view');
    agent.logInteraction('analytics_opened');
  };

  return (
    <div>
      <button onClick={handleEvent}>View Analytics</button>
    </div>
  );
}
`]
  ]);

  const telemetryModified = new Map([
    ['app/components/Analytics.tsx', `
import React from 'react';
import { useTelemetry } from '@/lib/telemetry';
import { useKiroAgent } from '@/lib/kiro';

export function Analytics() {
  const telemetry = useTelemetry();
  const agent = useKiroAgent();
  
  const handleEvent = () => {
    telemetry.trackEvent('analytics_view');
    agent.logInteraction('analytics_opened');
  };

  return (
    <div className="s-panGrid">
      <div className="s-card s-cardAccent">
        <div className="s-k">New KPI</div>
        <div className="s-v">123</div>
      </div>
      <button onClick={handleEvent}>View Analytics</button>
    </div>
  );
}
`]
  ]);

  const telemetryResult = await system.validateCodemodSafety(telemetryModified, telemetryOriginal);
  console.log('Feature preservation result:', {
    isValid: telemetryResult.isValid,
    overallRiskLevel: telemetryResult.overallRiskLevel,
    preservedFeatures: telemetryResult.featurePreservation.preservedFeatures.length,
    conflicts: telemetryResult.featurePreservation.conflicts.length,
    dataFlowIssues: telemetryResult.featurePreservation.dataFlowIssues.length,
    confidence: Math.round(telemetryResult.summary.confidence * 100) + '%'
  });

  console.log('\n✅ Comprehensive Safety Validation System tests completed');
  
  return {
    safeResult,
    unsafeResult,
    tsResult,
    telemetryResult
  };
}

// Example usage for real codemod validation
export async function validateRealCodemod() {
  console.log('🔧 Validating real codemod output...');
  
  const system = new SafetyValidationSystem('/Users/khalidgehlan/subway_enterprise-1/apps/admin');
  await system.initialize();

  // Simulate real codemod output that restores KPI tiles
  const originalFiles = new Map([
    ['app/dashboard/page.tsx', `
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const kpis = {
    ordersToday: 142,
    revenueToday: 3247,
    pendingOrders: 8,
    menuItems: 156,
    avgOrderValue: 22.89
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium">Orders Today</h3>
          <p className="text-2xl font-bold">{kpis.ordersToday}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium">Revenue Today</h3>
          <p className="text-2xl font-bold">${kpis.revenueToday}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium">Pending Orders</h3>
          <p className="text-2xl font-bold">{kpis.pendingOrders}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium">Menu Items</h3>
          <p className="text-2xl font-bold">{kpis.menuItems}</p>
        </Card>
      </div>
    </div>
  );
}
`]
  ]);

  const modifiedFiles = new Map([
    ['app/dashboard/page.tsx', `
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const kpis = {
    ordersToday: 142,
    revenueToday: 3247,
    pendingOrders: 8,
    menuItems: 156,
    avgOrderValue: 22.89,
    // Restored KPI data with safe fallbacks
    totalStores: 24,
    activeUsers: 1847,
    customerSatisfaction: 4.2,
    inventoryAlerts: 3
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {/* Existing KPIs with improved styling */}
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobGreen">
            <span>📊</span>
          </div>
          <div>
            <div className="s-k">Orders Today</div>
            <div className="s-v">{kpis.ordersToday}</div>
            <div className="s-sub">Active orders</div>
          </div>
        </div>
        
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobBlue">
            <span>💰</span>
          </div>
          <div>
            <div className="s-k">Revenue Today</div>
            <div className="s-v">\${kpis.revenueToday}</div>
            <div className="s-sub">Total earnings</div>
          </div>
        </div>
        
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobOrange">
            <span>⏳</span>
          </div>
          <div>
            <div className="s-k">Pending Orders</div>
            <div className="s-v">{kpis.pendingOrders}</div>
            <div className="s-sub">Awaiting fulfillment</div>
          </div>
        </div>
        
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobPurple">
            <span>🍔</span>
          </div>
          <div>
            <div className="s-k">Menu Items</div>
            <div className="s-v">{kpis.menuItems}</div>
            <div className="s-sub">Available items</div>
          </div>
        </div>
        
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobGreen">
            <span>💵</span>
          </div>
          <div>
            <div className="s-k">Avg Order Value</div>
            <div className="s-v">\${kpis.avgOrderValue}</div>
            <div className="s-sub">Per transaction</div>
          </div>
        </div>
        
        {/* Restored KPI tiles */}
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobBlue">
            <span>🏪</span>
          </div>
          <div>
            <div className="s-k">Total Stores</div>
            <div className="s-v">{kpis.totalStores ?? '—'}</div>
            <div className="s-sub">Active locations</div>
          </div>
        </div>
        
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobPurple">
            <span>👥</span>
          </div>
          <div>
            <div className="s-k">Active Users</div>
            <div className="s-v">{kpis.activeUsers ?? '—'}</div>
            <div className="s-sub">Last 24h</div>
          </div>
        </div>
        
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobGreen">
            <span>⭐</span>
          </div>
          <div>
            <div className="s-k">Customer Satisfaction</div>
            <div className="s-v">{kpis.customerSatisfaction ?? '—'}</div>
            <div className="s-sub">Average rating</div>
          </div>
        </div>
        
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobOrange">
            <span>⚠️</span>
          </div>
          <div>
            <div className="s-k">Inventory Alerts</div>
            <div className="s-v">{kpis.inventoryAlerts ?? '—'}</div>
            <div className="s-sub">Requires attention</div>
          </div>
        </div>
      </div>
    </div>
  );
}
`]
  ]);

  const result = await system.validateCodemodSafety(modifiedFiles, originalFiles);
  
  console.log('Real codemod validation result:', {
    isValid: result.isValid,
    overallRiskLevel: result.overallRiskLevel,
    confidence: Math.round(result.summary.confidence * 100) + '%',
    readyForDeployment: result.summary.readyForDeployment,
    recommendations: result.recommendations.length,
    blockers: result.blockers.length,
    warnings: result.warnings.length
  });

  if (result.recommendations.length > 0) {
    console.log('\nRecommendations:');
    result.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  if (result.blockers.length > 0) {
    console.log('\nBlockers:');
    result.blockers.forEach(blocker => console.log(`  - ${blocker}`));
  }

  // Generate and display full report
  const fullReport = system.generateComprehensiveReport(result);
  console.log('\n📄 Full Validation Report:');
  console.log(fullReport);

  return result;
}