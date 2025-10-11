import { SafetyChecker } from './safety-checker';

export async function testSafetyChecker() {
  console.log('🛡️ Testing Safety Checker...');
  
  const checker = new SafetyChecker('/Users/khalidgehlan/subway_enterprise-1/apps/admin');

  // Test 1: Safe frontend changes
  console.log('\n📝 Test 1: Safe frontend changes');
  const originalSafeFile = `
import React from 'react';

export function Dashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="card">KPI 1</div>
      <div className="card">KPI 2</div>
    </div>
  );
}
`;

  const modifiedSafeFile = `
import React from 'react';

export function Dashboard() {
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
`;

  const safeModifications = new Map([['Dashboard.tsx', modifiedSafeFile]]);
  const safeOriginals = new Map([['Dashboard.tsx', originalSafeFile]]);
  
  const safeResult = await checker.performSafetyChecks(safeModifications, safeOriginals);
  console.log('Safe changes result:', {
    isValid: safeResult.isValid,
    riskLevel: safeResult.summary.riskLevel,
    violations: safeResult.violations.length,
    warnings: safeResult.warnings.length,
    allowedChanges: safeResult.allowedChanges.length
  });

  // Test 2: Database schema violation
  console.log('\n📝 Test 2: Database schema violation');
  const originalSchemaFile = `
generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String?
}
`;

  const modifiedSchemaFile = `
generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String?
  role  String @default("user") // Added new field
}

model KPIData {
  id     Int @id @default(autoincrement())
  metric String
  value  Float
}
`;

  const schemaModifications = new Map([['schema.prisma', modifiedSchemaFile]]);
  const schemaOriginals = new Map([['schema.prisma', originalSchemaFile]]);
  
  const schemaResult = await checker.performSafetyChecks(schemaModifications, schemaOriginals);
  console.log('Schema violation result:', {
    isValid: schemaResult.isValid,
    riskLevel: schemaResult.summary.riskLevel,
    violations: schemaResult.violations.map(v => ({
      type: v.type,
      severity: v.severity,
      description: v.description
    }))
  });

  // Test 3: API route violation
  console.log('\n📝 Test 3: API route violation');
  const originalAPIFile = `
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'existing' });
}
`;

  const modifiedAPIFile = `
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'existing' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // New API endpoint
  return NextResponse.json({ created: body });
}
`;

  const apiModifications = new Map([['app/api/kpis/route.ts', modifiedAPIFile]]);
  const apiOriginals = new Map([['app/api/kpis/route.ts', originalAPIFile]]);
  
  const apiResult = await checker.performSafetyChecks(apiModifications, apiOriginals);
  console.log('API violation result:', {
    isValid: apiResult.isValid,
    riskLevel: apiResult.summary.riskLevel,
    violations: apiResult.violations.map(v => ({
      type: v.type,
      severity: v.severity,
      description: v.description
    }))
  });

  // Test 4: Navigation modification
  console.log('\n📝 Test 4: Navigation modification');
  const originalNavFile = `
import React from 'react';

export function Navigation() {
  return (
    <nav>
      <a href="/dashboard">Dashboard</a>
    </nav>
  );
}
`;

  const modifiedNavFile = `
import React from 'react';
import { useRouter } from 'next/navigation';

export function Navigation() {
  const router = useRouter();
  
  const handleNewRoute = () => {
    router.push('/new-kpi-page');
  };

  return (
    <nav>
      <a href="/dashboard">Dashboard</a>
      <button onClick={handleNewRoute}>New KPI Page</button>
    </nav>
  );
}
`;

  const navModifications = new Map([['Navigation.tsx', modifiedNavFile]]);
  const navOriginals = new Map([['Navigation.tsx', originalNavFile]]);
  
  const navResult = await checker.performSafetyChecks(navModifications, navOriginals);
  console.log('Navigation modification result:', {
    isValid: navResult.isValid,
    riskLevel: navResult.summary.riskLevel,
    violations: navResult.violations.map(v => ({
      type: v.type,
      severity: v.severity,
      description: v.description
    }))
  });

  // Test 5: Configuration change
  console.log('\n📝 Test 5: Configuration change');
  const originalConfigFile = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
`;

  const modifiedConfigFile = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Added new configuration for KPI dashboard
  env: {
    KPI_REFRESH_INTERVAL: '30000'
  }
}

module.exports = nextConfig
`;

  const configModifications = new Map([['next.config.js', modifiedConfigFile]]);
  const configOriginals = new Map([['next.config.js', originalConfigFile]]);
  
  const configResult = await checker.performSafetyChecks(configModifications, configOriginals);
  console.log('Configuration change result:', {
    isValid: configResult.isValid,
    riskLevel: configResult.summary.riskLevel,
    violations: configResult.violations.map(v => ({
      type: v.type,
      severity: v.severity,
      description: v.description
    }))
  });

  // Test 6: Generate safety report
  console.log('\n📝 Test 6: Safety report generation');
  const report = checker.generateSafetyReport(apiResult);
  console.log('Generated safety report preview:');
  console.log(report.substring(0, 500) + '...');

  console.log('\n✅ Safety Checker tests completed');
}

// Example usage for validating codemod safety
export async function validateCodemodSafety() {
  console.log('🔧 Validating codemod safety...');
  
  const checker = new SafetyChecker('/Users/khalidgehlan/subway_enterprise-1/apps/admin');

  // Simulate codemod output with various types of changes
  const originalFiles = new Map([
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

  const modifiedFiles = new Map([
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

  const result = await checker.performSafetyChecks(modifiedFiles, originalFiles);
  
  console.log('Codemod safety validation:', {
    isValid: result.isValid,
    riskLevel: result.summary.riskLevel,
    summary: result.summary
  });

  if (result.violations.length > 0) {
    console.log('\nViolations detected:');
    result.violations.forEach(violation => {
      console.log(`  - ${violation.severity.toUpperCase()}: ${violation.description}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning.type}: ${warning.description}`);
    });
  }

  if (result.allowedChanges.length > 0) {
    console.log('\nAllowed changes:');
    result.allowedChanges.forEach(change => {
      console.log(`  - ${change.type}: ${change.description} (${Math.round(change.confidence * 100)}% confidence)`);
    });
  }

  // Generate full report
  const fullReport = checker.generateSafetyReport(result);
  console.log('\n📄 Full Safety Report:');
  console.log(fullReport);

  return result;
}