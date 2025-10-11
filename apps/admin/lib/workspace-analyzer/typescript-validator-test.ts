import { TypeScriptValidator } from './typescript-validator';

export async function testTypeScriptValidator() {
  console.log('🔍 Testing TypeScript Validator...');
  
  const validator = new TypeScriptValidator('/Users/khalidgehlan/subway_enterprise-1/apps/admin');
  await validator.initialize();

  // Test 1: Valid React component
  console.log('\n📝 Test 1: Valid React component');
  const validComponent = `
import React from 'react';
import { Card } from '@/components/ui';

interface KPITileProps {
  title: string;
  value: string;
  icon: string;
}

export function KPITile({ title, value, icon }: KPITileProps) {
  return (
    <Card className="s-card">
      <div className="s-blob s-blobGreen">
        <span>{icon}</span>
      </div>
      <div>
        <div className="s-k">{title}</div>
        <div className="s-v">{value}</div>
      </div>
    </Card>
  );
}
`;

  const validResult = await validator.validateGeneratedCode('KPITile.tsx', validComponent);
  console.log('Valid component result:', {
    isValid: validResult.isValid,
    errorCount: validResult.errors.length,
    warningCount: validResult.warnings.length,
    missingImports: validResult.missingImports
  });

  // Test 2: Component with missing imports
  console.log('\n📝 Test 2: Component with missing imports');
  const missingImportsComponent = `
export function BrokenKPITile({ title, value }) {
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    console.log('Component mounted');
  }, []);

  return (
    <Card className="s-card" onMouseEnter={() => setIsHovered(true)}>
      <Button onClick={() => console.log('clicked')}>
        {title}: {value}
      </Button>
    </Card>
  );
}
`;

  const missingImportsResult = await validator.validateGeneratedCode('BrokenKPITile.tsx', missingImportsComponent);
  console.log('Missing imports result:', {
    isValid: missingImportsResult.isValid,
    errorCount: missingImportsResult.errors.length,
    missingImports: missingImportsResult.missingImports
  });

  // Test 3: Component integration check
  console.log('\n📝 Test 3: Component integration check');
  const componentWithProps = `
import React from 'react';

interface DashboardProps {
  kpis: {
    ordersToday: number;
    revenueToday: number;
    pendingOrders: number;
  };
}

export function Dashboard({ kpis }: DashboardProps) {
  return (
    <div className="s-panGrid">
      <div className="s-card">Orders: {kpis.ordersToday}</div>
      <div className="s-card">Revenue: {kpis.revenueToday}</div>
      <div className="s-card">Pending: {kpis.pendingOrders}</div>
    </div>
  );
}
`;

  const existingInterfaces = ['KPIData', 'DashboardConfig', 'UserPreferences'];
  const integrationResult = await validator.validateComponentIntegration(
    'Dashboard.tsx',
    componentWithProps,
    existingInterfaces
  );
  
  console.log('Component integration result:', {
    componentName: integrationResult.componentName,
    propsValid: integrationResult.propsValid,
    importsValid: integrationResult.importsValid,
    interfaceCompatible: integrationResult.interfaceCompatible,
    issues: integrationResult.issues
  });

  // Test 4: Generate import suggestions
  console.log('\n📝 Test 4: Import suggestions');
  const suggestions = validator.generateImportSuggestions(['React', 'useState', 'Card', 'Button']);
  console.log('Import suggestions:', suggestions);

  // Test 5: Syntax error detection
  console.log('\n📝 Test 5: Syntax error detection');
  const syntaxErrorComponent = `
import React from 'react';

export function BrokenComponent() {
  return (
    <div>
      <span>Missing closing tag
    </div>
  );
}
`;

  const syntaxErrorResult = await validator.validateGeneratedCode('BrokenComponent.tsx', syntaxErrorComponent);
  console.log('Syntax error result:', {
    isValid: syntaxErrorResult.isValid,
    errorCount: syntaxErrorResult.errors.length,
    errors: syntaxErrorResult.errors.map(e => e.message)
  });

  console.log('\n✅ TypeScript Validator tests completed');
}

// Example usage for manual testing
export async function validateSampleCodemod() {
  console.log('🔧 Validating sample codemod output...');
  
  const validator = new TypeScriptValidator('/Users/khalidgehlan/subway_enterprise-1/apps/admin');
  await validator.initialize();

  // Sample codemod output that adds KPI tiles
  const codemodOutput = `
import React from 'react';
import { Card } from '@/components/ui';

// Added by codemod: Missing KPI tiles restoration
export function AdditionalKPITiles({ kpis }: { kpis: any }) {
  return (
    <>
      <Card className="s-card s-cardAccent">
        <div className="s-blob s-blobBlue">
          <span>🏪</span>
        </div>
        <div>
          <div className="s-k">Total Stores</div>
          <div className="s-v">{kpis?.totalStores ?? '—'}</div>
          <div className="s-sub">Active locations</div>
        </div>
      </Card>
      
      <Card className="s-card s-cardAccent">
        <div className="s-blob s-blobPurple">
          <span>👥</span>
        </div>
        <div>
          <div className="s-k">Active Users</div>
          <div className="s-v">{kpis?.activeUsers ?? '—'}</div>
          <div className="s-sub">Last 24h</div>
        </div>
      </Card>
    </>
  );
}
`;

  const result = await validator.validateGeneratedCode('AdditionalKPITiles.tsx', codemodOutput);
  
  console.log('Codemod validation result:', {
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
    missingImports: result.missingImports,
    typeIssues: result.typeIssues
  });

  if (result.missingImports.length > 0) {
    console.log('Suggested imports:');
    const suggestions = validator.generateImportSuggestions(result.missingImports);
    suggestions.forEach(suggestion => console.log(`  ${suggestion}`));
  }

  return result;
}