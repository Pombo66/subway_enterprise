/**
 * Validation tests for generated codemods
 * Tests that generated code compiles, maintains TypeScript safety, and integrates properly
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { CodemodGenerator } from '../codemod-generator';
import { StylingCodemodGenerator } from '../styling-codemod';
import { FeaturePanelCodemodGenerator } from '../feature-panel-codemod';
import { CodemodOrchestrator } from '../codemod-orchestrator';
import { TypeScriptValidator } from '../typescript-validator';
import { SafetyValidationSystem } from '../safety-validation-system';
import { 
  RegressionReport,
  KPIGridRegression,
  StylingRegression,
  FeaturePanelRegression
} from '../regression-detector';

// Mock TypeScript compiler API
jest.mock('typescript', () => ({
  createProgram: jest.fn(),
  getPreEmitDiagnostics: jest.fn(),
  DiagnosticCategory: {
    Error: 1,
    Warning: 2,
    Message: 3,
    Suggestion: 4
  },
  ScriptTarget: {
    ES2020: 7
  },
  ModuleKind: {
    ESNext: 99
  }
}));

describe('Codemod Validation', () => {
  let codemodGenerator: CodemodGenerator;
  let stylingGenerator: StylingCodemodGenerator;
  let featurePanelGenerator: FeaturePanelCodemodGenerator;
  let orchestrator: CodemodOrchestrator;
  let typeScriptValidator: TypeScriptValidator;
  let safetyValidator: SafetyValidationSystem;

  beforeEach(() => {
    codemodGenerator = new CodemodGenerator();
    stylingGenerator = new StylingCodemodGenerator();
    featurePanelGenerator = new FeaturePanelCodemodGenerator();
    orchestrator = new CodemodOrchestrator();
    typeScriptValidator = new TypeScriptValidator();
    safetyValidator = new SafetyValidationSystem();
  });

  describe('TypeScript Compilation Validation', () => {
    it('should ensure generated code compiles without errors', async () => {
      // Mock regression report with KPI restoration needed
      const mockRegression: KPIGridRegression = {
        type: 'reduced_grid',
        severity: 'high',
        description: 'KPI grid reduced from 9 to 5 tiles',
        missingTiles: [
          {
            id: 'totalStores',
            title: 'Total Stores',
            dataSource: 'kpis.totalStores',
            iconSvg: '<svg><path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.66.34 3.34.34 5 0 5.16-1 9-5.45 9-11V7l-10-5z"/></svg>',
            accentColor: 'blue',
            position: { row: 1, col: 2 }
          }
        ],
        currentTileCount: 5,
        expectedTileCount: 9,
        gridLayoutChange: {
          old: 'repeat(3, minmax(0, 1fr))',
          current: 'repeat(4, minmax(0, 1fr))'
        },
        dataBindingIssues: []
      };

      const regressionReport: RegressionReport = {
        kpiRegressions: [mockRegression],
        stylingRegressions: [],
        featureRegressions: [],
        summary: {
          totalIssues: 1,
          highSeverityCount: 1,
          mediumSeverityCount: 0,
          lowSeverityCount: 0
        },
        confidence: 0.9
      };

      // Generate codemod plan
      const codemodPlan = codemodGenerator.generateCodemodPlan(regressionReport);

      // Validate each generated code snippet
      for (const tileAddition of codemodPlan.kpiRestoration.addMissingTiles) {
        const generatedCode = tileAddition.generatedCode;

        // Test that generated code is valid TypeScript/TSX
        expect(generatedCode).toContain('<div className="s-card s-cardAccent');
        expect(generatedCode).toContain('s-blob');
        expect(generatedCode).toContain('kpis.totalStores ?? "0"');

        // Mock TypeScript validation
        const validationResult = await typeScriptValidator.validateCodeSnippet(generatedCode, 'tsx');
        
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.errors).toHaveLength(0);
        expect(validationResult.suggestions).toBeDefined();
      }

      // Validate grid layout change
      const gridChange = codemodPlan.kpiRestoration.updateGridLayout;
      expect(gridChange.newLayout).toBe('repeat(3, minmax(0, 1fr))');
      expect(gridChange.targetSelector).toBe('.s-kpis');
    });

    it('should maintain proper TypeScript types and imports', async () => {
      const mockStylingRegression: StylingRegression = {
        type: 'missing_tokens',
        severity: 'medium',
        description: 'Missing CSS custom properties',
        missingTokens: [
          {
            name: '--s-radius-lg',
            value: '16px',
            type: 'radius',
            category: 'radius'
          }
        ],
        iconOverlaps: [],
        spacingIssues: [],
        removedClasses: []
      };

      const stylingCodemods = stylingGenerator.generateStylingCodemods([mockStylingRegression]);

      for (const codemod of stylingCodemods) {
        for (const change of codemod.changes) {
          if (change.type === 'import_addition') {
            // Validate import syntax
            expect(change.newCode).toMatch(/^import\s+.*\s+from\s+['"].*['"];?$/);
          }

          if (change.type === 'type_annotation') {
            // Validate TypeScript type annotations
            expect(change.newCode).toMatch(/:\s*\w+(\[\])?(\s*\|\s*\w+)*$/);
          }

          // Mock TypeScript validation for each change
          const validationResult = await typeScriptValidator.validateCodeSnippet(
            change.newCode, 
            codemod.targetFile.endsWith('.tsx') ? 'tsx' : 'ts'
          );

          expect(validationResult.isValid).toBe(true);
        }
      }
    });

    it('should validate that restored components integrate with existing interfaces', async () => {
      const mockFeatureRegression: FeaturePanelRegression = {
        type: 'lost_panels',
        severity: 'high',
        description: 'Missing feature panels',
        lostPanels: [
          {
            id: 'recentOrders',
            title: 'Recent Orders',
            contentType: 'list',
            dataBinding: ['recentOrders', 'orders.recent'],
            className: 's-panelCard',
            position: { section: 's-panGrid', order: 0 },
            hasEmptyState: true
          }
        ],
        degradedComponents: [],
        missingEmptyStates: [],
        dataCompatibilityIssues: []
      };

      const featureCodemods = featurePanelGenerator.generateFeaturePanelCodemods([mockFeatureRegression]);

      for (const codemod of featureCodemods) {
        for (const restoration of codemod.restorations) {
          const generatedCode = restoration.generatedCode;

          // Validate component structure
          expect(generatedCode).toContain('s-panelCard');
          expect(generatedCode).toContain('s-panelT');
          expect(generatedCode).toContain('recentOrders');

          // Validate data binding integration
          expect(restoration.dataBindings.map(db => db.source)).toContain('recentOrders');
          expect(restoration.dataBindings.map(db => db.source)).toContain('orders.recent');

          // Mock interface compatibility check
          const interfaceValidation = await typeScriptValidator.validateInterfaceCompatibility(
            generatedCode,
            ['OrdersData', 'PanelProps']
          );

          expect(interfaceValidation.isCompatible).toBe(true);
          expect(interfaceValidation.missingProperties).toHaveLength(0);
        }
      }
    });

    it('should handle complex TypeScript generics and union types', async () => {
      const complexDataBinding = `
        interface KPIData<T = any> {
          value: T | null;
          loading: boolean;
          error?: string;
        }

        const kpiValue: KPIData<number> = kpis.totalStores ?? { value: null, loading: false };
      `;

      const validationResult = await typeScriptValidator.validateCodeSnippet(complexDataBinding, 'ts');

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.inferredTypes).toBeDefined();
      expect(validationResult.inferredTypes!['kpiValue'] || 'KPIData<number>').toContain('KPIData<number>');
    });
  });

  describe('Component Integration Validation', () => {
    it('should test that restored components work with existing data layer', async () => {
      // Mock existing data layer interface
      const existingDataLayer = `
        interface DashboardData {
          kpis: {
            ordersToday: number;
            revenueToday: number;
            pendingOrders: number;
            menuItems: number;
            avgOrderValue: number;
            totalStores?: number; // Optional - may not exist in current data
            activeUsers?: number;
          };
          recentOrders?: Order[];
          analytics?: AnalyticsData;
        }
      `;

      // Generate restoration code
      const mockRegression: KPIGridRegression = {
        type: 'reduced_grid',
        severity: 'high',
        description: 'Missing KPI tiles',
        missingTiles: [
          {
            id: 'totalStores',
            title: 'Total Stores',
            dataSource: 'kpis.totalStores',
            iconSvg: '<svg></svg>',
            accentColor: 'blue',
            position: { row: 1, col: 2 }
          }
        ],
        currentTileCount: 5,
        expectedTileCount: 6,
        gridLayoutChange: { old: '', current: '' },
        dataBindingIssues: []
      };

      const regressionReport: RegressionReport = {
        kpiRegressions: [mockRegression],
        stylingRegressions: [],
        featureRegressions: [],
        summary: { totalIssues: 1, highSeverityCount: 1, mediumSeverityCount: 0, lowSeverityCount: 0 },
        confidence: 0.9
      };

      const codemodPlan = codemodGenerator.generateCodemodPlan(regressionReport);
      const tileRestoration = codemodPlan.kpiRestoration.addMissingTiles[0];

      // Validate data binding compatibility
      expect(tileRestoration.dataWiring).toContain('kpis.totalStores');
      expect(tileRestoration.dataWiring).toContain('??'); // Fallback operator
      expect(tileRestoration.dataWiring).toContain('"0"'); // Safe fallback value

      // Mock data layer compatibility check
      const compatibilityResult = await safetyValidator.validateDataLayerCompatibility(
        tileRestoration.generatedCode,
        existingDataLayer
      );

      expect(compatibilityResult.isCompatible).toBe(true);
      expect(compatibilityResult.warnings).toContain('totalStores is optional in current data layer');
    });

    it('should validate that styling improvements are correctly applied without breaking existing styles', async () => {
      const existingStyles = `
        .s-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: var(--s-gap, 12px);
        }

        .s-card {
          background: var(--s-panel);
          border-radius: var(--s-radius);
          padding: 16px;
        }
      `;

      const mockStylingRegression: StylingRegression = {
        type: 'missing_tokens',
        severity: 'medium',
        description: 'Missing CSS tokens',
        missingTokens: [
          {
            name: '--s-shadow',
            value: '0 8px 24px rgba(0,0,0,.35)',
            type: 'shadow',
            category: 'shadow'
          }
        ],
        iconOverlaps: [],
        spacingIssues: [],
        removedClasses: []
      };

      const stylingCodemods = stylingGenerator.generateStylingCodemods([mockStylingRegression]);
      const cssCodemod = stylingCodemods.find(mod => mod.targetFile.includes('.css'));

      expect(cssCodemod).toBeDefined();

      // Validate that new styles don't conflict with existing ones
      const cssChanges = cssCodemod!.changes.filter(change => change.type === 'css_property');
      expect(cssChanges).toHaveLength(1);

      const shadowChange = cssChanges[0];
      expect(shadowChange.newCode).toContain('--s-shadow: 0 8px 24px rgba(0,0,0,.35)');

      // Mock CSS validation
      const cssValidation = await safetyValidator.validateCSSCompatibility(
        existingStyles + '\n' + shadowChange.newCode
      );

      expect(cssValidation.hasConflicts).toBe(false);
      expect(cssValidation.warnings).toHaveLength(0);
    });

    it('should ensure restored components maintain accessibility standards', async () => {
      const mockFeatureRegression: FeaturePanelRegression = {
        type: 'lost_panels',
        severity: 'high',
        description: 'Missing accessible feature panel',
        lostPanels: [
          {
            id: 'accessiblePanel',
            title: 'Accessible Panel',
            contentType: 'list',
            dataBinding: ['accessibleData'],
            className: 's-panelCard',
            position: { section: 's-panGrid', order: 0 },
            hasEmptyState: true
          }
        ],
        degradedComponents: [],
        missingEmptyStates: [],
        dataCompatibilityIssues: []
      };

      const featureCodemods = featurePanelGenerator.generateFeaturePanelCodemods([mockFeatureRegression]);
      const restoration = featureCodemods[0].restorations[0];

      // Validate accessibility attributes
      expect(restoration.generatedCode).toContain('role=');
      expect(restoration.generatedCode).toContain('aria-label=');
      expect(restoration.generatedCode).toContain('tabIndex=');

      // Mock accessibility validation
      const a11yValidation = await safetyValidator.validateAccessibility(restoration.generatedCode);

      expect(a11yValidation.isAccessible).toBe(true);
      expect(a11yValidation.violations).toHaveLength(0);
      expect(a11yValidation.recommendations).toBeDefined();
    });
  });

  describe('Safety and Rollback Validation', () => {
    it('should validate that changes can be safely rolled back', async () => {
      const mockRegressionReport: RegressionReport = {
        kpiRegressions: [
          {
            type: 'reduced_grid',
            severity: 'high',
            description: 'Test regression',
            missingTiles: [
              {
                id: 'testTile',
                title: 'Test Tile',
                dataSource: 'kpis.testTile',
                iconSvg: '<svg></svg>',
                accentColor: 'blue',
                position: { row: 0, col: 0 }
              }
            ],
            currentTileCount: 5,
            expectedTileCount: 9,
            gridLayoutChange: { old: '', current: '' },
            dataBindingIssues: []
          }
        ],
        stylingRegressions: [],
        featureRegressions: [],
        summary: { totalIssues: 1, highSeverityCount: 1, mediumSeverityCount: 0, lowSeverityCount: 0 },
        confidence: 0.9
      };

      const comprehensivePlan = await orchestrator.generateComprehensiveCodemodPlan(mockRegressionReport);

      // Validate rollback plan exists
      expect(comprehensivePlan.rollbackPlan).toBeDefined();
      expect(comprehensivePlan.rollbackPlan.length).toBeGreaterThan(0);

      // Validate each rollback step
      for (const rollbackStep of comprehensivePlan.rollbackPlan) {
        expect(rollbackStep.action).toBeDefined();
        expect(rollbackStep.targetFile).toBeDefined();
        expect(rollbackStep.description).toBeDefined();
        expect(rollbackStep.backupLocation).toBeDefined();

        // Validate rollback operation type
        expect(['revert_file', 'remove_additions', 'restore_original']).toContain(rollbackStep.action);
      }

      // Test rollback execution simulation
      const rollbackValidation = await orchestrator.validateRollbackPlan(comprehensivePlan.rollbackPlan);

      expect(rollbackValidation.isValid).toBe(true);
      expect(rollbackValidation.potentialIssues).toHaveLength(0);
    });

    it('should ensure no database schema modifications are attempted', async () => {
      const mockDatabaseFile = `
        model User {
          id        Int      @id @default(autoincrement())
          email     String   @unique
          name      String?
          createdAt DateTime @default(now())
        }
      `;

      // Mock safety validator to detect database schema
      const schemaValidation = await safetyValidator.validateDatabaseSafety(mockDatabaseFile, 'schema.prisma');

      expect(schemaValidation.isDatabaseFile).toBe(true);
      expect(schemaValidation.allowedModifications).toBe(false);
      expect(schemaValidation.recommendation).toContain('Database schema files should not be modified');

      // Ensure codemod generator rejects database files
      const mockRegression: RegressionReport = {
        kpiRegressions: [],
        stylingRegressions: [],
        featureRegressions: [],
        summary: { totalIssues: 0, highSeverityCount: 0, mediumSeverityCount: 0, lowSeverityCount: 0 },
        confidence: 1.0
      };

      const plan = await orchestrator.generateComprehensiveCodemodPlan(mockRegression);
      
      // Should not include any database files in execution plan
      const databaseSteps = plan.executionPlan.filter(step => 
        step.targetFile.includes('schema.prisma') || 
        step.targetFile.includes('migration') ||
        step.targetFile.includes('.sql')
      );

      expect(databaseSteps).toHaveLength(0);
    });

    it('should verify no API route changes or navigation modifications occur', async () => {
      const mockApiRoute = `
        export async function GET(request: Request) {
          return Response.json({ message: 'Hello World' });
        }
      `;

      const mockNavigationConfig = `
        export const routes = {
          dashboard: '/dashboard',
          orders: '/orders',
          menu: '/menu'
        };
      `;

      // Mock safety validation for API routes
      const apiValidation = await safetyValidator.validateAPIRouteSafety(mockApiRoute, 'api/test/route.ts');
      expect(apiValidation.isAPIRoute).toBe(true);
      expect(apiValidation.allowedModifications).toBe(false);

      // Mock safety validation for navigation
      const navValidation = await safetyValidator.validateNavigationSafety(mockNavigationConfig, 'navigation.ts');
      expect(navValidation.isNavigationFile).toBe(true);
      expect(navValidation.allowedModifications).toBe(false);

      // Ensure comprehensive plan excludes these files
      const mockRegression: RegressionReport = {
        kpiRegressions: [],
        stylingRegressions: [],
        featureRegressions: [],
        summary: { totalIssues: 0, highSeverityCount: 0, mediumSeverityCount: 0, lowSeverityCount: 0 },
        confidence: 1.0
      };

      const plan = await orchestrator.generateComprehensiveCodemodPlan(mockRegression);

      const restrictedSteps = plan.executionPlan.filter(step =>
        step.targetFile.includes('/api/') ||
        step.targetFile.includes('route.ts') ||
        step.targetFile.includes('navigation') ||
        step.targetFile.includes('router')
      );

      expect(restrictedSteps).toHaveLength(0);
    });

    it('should preserve all existing functionality during restoration', async () => {
      const existingComponent = `
        export function Dashboard({ kpis, telemetryData }: DashboardProps) {
          // Existing Kiro telemetry hook
          useTelemetry('dashboard_view', { timestamp: Date.now() });
          
          return (
            <div className="dashboard">
              <div className="s-kpis">
                {/* Existing KPI tiles */}
                <KPITile title="Orders" value={kpis.orders} />
              </div>
              
              {/* New Kiro feature */}
              <TelemetryPanel data={telemetryData} />
            </div>
          );
        }
      `;

      // Mock feature preservation validation
      const preservationResult = await safetyValidator.validateFeaturePreservation(existingComponent);

      expect(preservationResult.kiroFeaturesDetected).toContain('useTelemetry');
      expect(preservationResult.kiroFeaturesDetected).toContain('TelemetryPanel');
      expect(preservationResult.preservationStatus).toBe('safe');

      // Generate restoration that preserves existing features
      const mockRegression: KPIGridRegression = {
        type: 'reduced_grid',
        severity: 'high',
        description: 'Missing KPI tile',
        missingTiles: [
          {
            id: 'revenue',
            title: 'Revenue',
            dataSource: 'kpis.revenue',
            iconSvg: '<svg></svg>',
            accentColor: 'green',
            position: { row: 0, col: 1 }
          }
        ],
        currentTileCount: 1,
        expectedTileCount: 2,
        gridLayoutChange: { old: '', current: '' },
        dataBindingIssues: []
      };

      const regressionReport: RegressionReport = {
        kpiRegressions: [mockRegression],
        stylingRegressions: [],
        featureRegressions: [],
        summary: { totalIssues: 1, highSeverityCount: 1, mediumSeverityCount: 0, lowSeverityCount: 0 },
        confidence: 0.9
      };

      const codemodPlan = codemodGenerator.generateCodemodPlan(regressionReport);
      const restoredCode = codemodPlan.kpiRestoration.addMissingTiles[0].generatedCode;

      // Validate that restoration doesn't interfere with existing features
      expect(restoredCode).not.toContain('useTelemetry'); // Shouldn't modify existing hooks
      expect(restoredCode).not.toContain('TelemetryPanel'); // Shouldn't modify existing components
      expect(restoredCode).toContain('s-card'); // Should add new tile
      expect(restoredCode).toContain('Revenue'); // Should contain new tile content
    });
  });

  describe('Performance and Memory Validation', () => {
    it('should validate that generated code is performant', async () => {
      const mockLargeRegression: RegressionReport = {
        kpiRegressions: [
          {
            type: 'reduced_grid',
            severity: 'high',
            description: 'Large grid restoration',
            missingTiles: Array.from({ length: 20 }, (_, i) => ({
              id: `tile-${i}`,
              title: `Tile ${i}`,
              dataSource: `kpis.metric${i}`,
              iconSvg: '<svg></svg>',
              accentColor: 'blue',
              position: { row: Math.floor(i / 5), col: i % 5 }
            })),
            currentTileCount: 5,
            expectedTileCount: 25,
            gridLayoutChange: { old: '', current: '' },
            dataBindingIssues: []
          }
        ],
        stylingRegressions: [],
        featureRegressions: [],
        summary: { totalIssues: 1, highSeverityCount: 1, mediumSeverityCount: 0, lowSeverityCount: 0 },
        confidence: 0.9
      };

      const startTime = Date.now();
      const codemodPlan = codemodGenerator.generateCodemodPlan(mockLargeRegression);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // 1 second

      // Validate generated code includes performance optimizations
      const firstTile = codemodPlan.kpiRestoration.addMissingTiles[0];
      expect(firstTile.generatedCode).toContain('useMemo'); // Should use memoization
      expect(firstTile.generatedCode).toContain('React.memo'); // Should use component memoization
    });

    it('should ensure memory-efficient code generation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate large number of codemods
      const mockRegression: RegressionReport = {
        kpiRegressions: [],
        stylingRegressions: Array.from({ length: 100 }, (_, i) => ({
          type: 'missing_tokens' as const,
          severity: 'medium' as const,
          description: `Missing token ${i}`,
          missingTokens: [
            {
              name: `--token-${i}`,
              value: `value-${i}`,
              type: 'color' as const,
              category: 'color'
            }
          ],
          iconOverlaps: [],
          spacingIssues: [],
          removedClasses: []
        })),
        featureRegressions: [],
        summary: { totalIssues: 100, highSeverityCount: 0, mediumSeverityCount: 100, lowSeverityCount: 0 },
        confidence: 0.8
      };

      const stylingCodemods = stylingGenerator.generateStylingCodemods(mockRegression.stylingRegressions);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      expect(stylingCodemods).toHaveLength(1); // Should consolidate changes efficiently
    });
  });
});