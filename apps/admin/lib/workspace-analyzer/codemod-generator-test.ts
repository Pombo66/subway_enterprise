/**
 * Test suite for codemod generation system
 * Validates KPI restoration, styling fixes, and feature panel restoration
 */

import { 
  CodemodGenerator,
  KPITileAddition,
  GridLayoutChange,
  DataWiringFix
} from './codemod-generator';
import { 
  StylingCodemodGenerator,
  StylingCodemod,
  CSSPropertyRestore
} from './styling-codemod';
import { 
  FeaturePanelCodemodGenerator,
  PanelRestoration,
  EmptyStateRestoration
} from './feature-panel-codemod';
import { 
  CodemodOrchestrator,
  ComprehensiveCodemodPlan
} from './codemod-orchestrator';
import { 
  RegressionReport,
  KPIGridRegression,
  StylingRegression,
  FeaturePanelRegression
} from './regression-detector';
import { KPITile, StyleToken, FeaturePanel } from './component-extractor';

/**
 * Test data factory for creating mock regression data
 */
class TestDataFactory {
  static createMockKPITile(overrides: Partial<KPITile> = {}): KPITile {
    return {
      id: 'totalStores',
      title: 'Total Stores',
      dataSource: 'kpis.totalStores',
      iconSvg: '<svg>...</svg>',
      accentColor: 'green',
      position: { row: 2, col: 0 },
      subtitle: 'Active locations',
      ...overrides
    };
  }

  static createMockStyleToken(overrides: Partial<StyleToken> = {}): StyleToken {
    return {
      name: '--s-gap-lg',
      value: '16px',
      type: 'spacing',
      usage: ['grid', 'flex'],
      ...overrides
    };
  }

  static createMockFeaturePanel(overrides: Partial<FeaturePanel> = {}): FeaturePanel {
    return {
      id: 'recentOrders',
      title: 'Recent Orders',
      contentType: 'list',
      dataBinding: ['recentOrders', 'orders.recent'],
      className: 's-panelCard',
      position: {
        section: 'main',
        order: 1
      },
      hasEmptyState: true,
      ...overrides
    };
  }

  static createMockKPIRegression(): KPIGridRegression {
    return {
      type: 'reduced_grid',
      severity: 'high',
      description: 'KPI grid reduced from 9 tiles to 5 tiles',
      missingTiles: [
        this.createMockKPITile({ id: 'totalStores', title: 'Total Stores' }),
        this.createMockKPITile({ id: 'activeUsers', title: 'Active Users' }),
        this.createMockKPITile({ id: 'customerSatisfaction', title: 'Customer Satisfaction' }),
        this.createMockKPITile({ id: 'inventoryAlerts', title: 'Inventory Alerts' })
      ],
      currentTileCount: 5,
      expectedTileCount: 9,
      gridLayoutChange: {
        old: 'repeat(3, minmax(0, 1fr))',
        current: 'repeat(4, minmax(0, 1fr))'
      },
      dataBindingIssues: [
        'Total Stores: Missing data binding for kpis.totalStores',
        'Active Users: Missing data binding for kpis.activeUsers'
      ]
    };
  }

  static createMockStylingRegression(): StylingRegression {
    return {
      type: 'missing_tokens',
      severity: 'high',
      description: '3 CSS custom properties are missing',
      missingTokens: [
        this.createMockStyleToken({ name: '--s-gap-lg', value: '16px' }),
        this.createMockStyleToken({ name: '--s-radius-xl', value: '16px', type: 'radius' }),
        this.createMockStyleToken({ name: '--s-shadow-lg', value: '0 12px 32px rgba(0,0,0,.4)', type: 'shadow' })
      ],
      iconOverlaps: [],
      spacingIssues: [],
      removedClasses: []
    };
  }

  static createMockFeaturePanelRegression(): FeaturePanelRegression {
    return {
      type: 'lost_panels',
      severity: 'high',
      description: '2 feature panels are missing',
      lostPanels: [
        this.createMockFeaturePanel({ id: 'recentOrders', title: 'Recent Orders' }),
        this.createMockFeaturePanel({ id: 'topProducts', title: 'Top Products', contentType: 'grid' })
      ],
      degradedComponents: [],
      missingEmptyStates: [],
      dataCompatibilityIssues: []
    };
  }

  static createMockRegressionReport(): RegressionReport {
    return {
      kpiRegressions: [this.createMockKPIRegression()],
      stylingRegressions: [this.createMockStylingRegression()],
      featureRegressions: [this.createMockFeaturePanelRegression()],
      summary: {
        totalIssues: 3,
        highSeverityCount: 3,
        mediumSeverityCount: 0,
        lowSeverityCount: 0
      },
      confidence: 0.85
    };
  }
}

/**
 * Test suite for CodemodGenerator
 */
class CodemodGeneratorTests {
  private generator: CodemodGenerator;

  constructor() {
    this.generator = new CodemodGenerator();
  }

  /**
   * Test KPI tile restoration generation
   */
  testKPITileRestoration(): boolean {
    console.log('Testing KPI tile restoration...');
    
    const regressionReport = TestDataFactory.createMockRegressionReport();
    const codemodPlan = this.generator.generateCodemodPlan(regressionReport);

    // Validate KPI restoration
    const kpiRestoration = codemodPlan.kpiRestoration;
    
    // Should have 4 missing tiles to restore
    if (kpiRestoration.addMissingTiles.length !== 4) {
      console.error(`Expected 4 missing tiles, got ${kpiRestoration.addMissingTiles.length}`);
      return false;
    }

    // Validate tile generation
    const firstTile = kpiRestoration.addMissingTiles[0];
    if (!firstTile.generatedCode.includes('s-card s-cardAccent')) {
      console.error('Generated tile code missing proper CSS classes');
      return false;
    }

    if (!firstTile.generatedCode.includes('s-blob')) {
      console.error('Generated tile code missing blob container');
      return false;
    }

    // Validate data wiring
    if (!firstTile.dataWiring.includes('??')) {
      console.error('Data wiring missing fallback operator');
      return false;
    }

    // Validate grid layout change
    const gridChange = kpiRestoration.updateGridLayout;
    if (gridChange.newLayout !== 'repeat(3, minmax(0, 1fr))') {
      console.error(`Expected 3x3 grid layout, got ${gridChange.newLayout}`);
      return false;
    }

    console.log('✓ KPI tile restoration test passed');
    return true;
  }

  /**
   * Test data wiring generation
   */
  testDataWiringGeneration(): boolean {
    console.log('Testing data wiring generation...');
    
    const regressionReport = TestDataFactory.createMockRegressionReport();
    const codemodPlan = this.generator.generateCodemodPlan(regressionReport);

    const dataWiring = codemodPlan.kpiRestoration.restoreDataWiring;
    
    if (dataWiring.length === 0) {
      console.error('No data wiring fixes generated');
      return false;
    }

    const firstWiring = dataWiring[0];
    
    // Should include useMemo for performance
    if (!firstWiring.generatedCode.includes('useMemo')) {
      console.error('Data wiring missing useMemo optimization');
      return false;
    }

    // Should include fallback value
    if (!firstWiring.generatedCode.includes('??')) {
      console.error('Data wiring missing fallback value');
      return false;
    }

    console.log('✓ Data wiring generation test passed');
    return true;
  }

  /**
   * Test confidence calculation
   */
  testConfidenceCalculation(): boolean {
    console.log('Testing confidence calculation...');
    
    const regressionReport = TestDataFactory.createMockRegressionReport();
    const codemodPlan = this.generator.generateCodemodPlan(regressionReport);

    // Overall confidence should be reasonable
    if (codemodPlan.confidence < 0.5 || codemodPlan.confidence > 1.0) {
      console.error(`Invalid confidence score: ${codemodPlan.confidence}`);
      return false;
    }

    // Individual tile confidence should be calculated
    const firstTile = codemodPlan.kpiRestoration.addMissingTiles[0];
    if (firstTile.confidence < 0.5) {
      console.error(`Low tile confidence: ${firstTile.confidence}`);
      return false;
    }

    console.log('✓ Confidence calculation test passed');
    return true;
  }

  runAllTests(): boolean {
    console.log('Running CodemodGenerator tests...\n');
    
    const tests = [
      this.testKPITileRestoration.bind(this),
      this.testDataWiringGeneration.bind(this),
      this.testConfidenceCalculation.bind(this)
    ];

    let allPassed = true;
    for (const test of tests) {
      try {
        if (!test()) {
          allPassed = false;
        }
      } catch (error) {
        console.error(`Test failed with error: ${error}`);
        allPassed = false;
      }
    }

    console.log(allPassed ? '\n✓ All CodemodGenerator tests passed!' : '\n✗ Some CodemodGenerator tests failed!');
    return allPassed;
  }
}

/**
 * Test suite for StylingCodemodGenerator
 */
class StylingCodemodGeneratorTests {
  private generator: StylingCodemodGenerator;

  constructor() {
    this.generator = new StylingCodemodGenerator();
  }

  /**
   * Test CSS property restoration
   */
  testCSSPropertyRestoration(): boolean {
    console.log('Testing CSS property restoration...');
    
    const stylingRegression = TestDataFactory.createMockStylingRegression();
    const codemods = this.generator.generateStylingCodemods([stylingRegression]);

    if (codemods.length === 0) {
      console.error('No styling codemods generated');
      return false;
    }

    const cssCodemod = codemods.find(mod => mod.targetFile.includes('.css'));
    if (!cssCodemod) {
      console.error('No CSS file codemod generated');
      return false;
    }

    // Should have changes for missing tokens
    const tokenChanges = cssCodemod.changes.filter(change => change.type === 'css_property');
    if (tokenChanges.length !== 3) {
      console.error(`Expected 3 CSS property changes, got ${tokenChanges.length}`);
      return false;
    }

    // Validate CSS syntax
    const firstChange = tokenChanges[0];
    if (!firstChange.newCode.includes(':') || !firstChange.newCode.includes(';')) {
      console.error('Generated CSS has invalid syntax');
      return false;
    }

    console.log('✓ CSS property restoration test passed');
    return true;
  }

  /**
   * Test icon alignment fixes
   */
  testIconAlignmentFixes(): boolean {
    console.log('Testing icon alignment fixes...');
    
    // Create regression with icon overlaps
    const regression: StylingRegression = {
      type: 'icon_overlap',
      severity: 'medium',
      description: '2 icon alignment issues detected',
      missingTokens: [],
      iconOverlaps: [
        {
          component: 'OrdersKPI',
          issue: 'Missing s-blob container class',
          currentSpacing: '0px',
          recommendedSpacing: '8px'
        }
      ],
      spacingIssues: [],
      removedClasses: []
    };

    const codemods = this.generator.generateStylingCodemods([regression]);
    const componentCodemod = codemods.find(mod => mod.targetFile.includes('.tsx'));
    
    if (!componentCodemod) {
      console.error('No component file codemod generated');
      return false;
    }

    const iconFixes = componentCodemod.changes.filter(change => change.type === 'icon_fix');
    if (iconFixes.length === 0) {
      console.error('No icon fixes generated');
      return false;
    }

    const iconFix = iconFixes[0];
    if (!iconFix.newCode.includes('s-blob')) {
      console.error('Icon fix missing s-blob class');
      return false;
    }

    console.log('✓ Icon alignment fixes test passed');
    return true;
  }

  runAllTests(): boolean {
    console.log('Running StylingCodemodGenerator tests...\n');
    
    const tests = [
      this.testCSSPropertyRestoration.bind(this),
      this.testIconAlignmentFixes.bind(this)
    ];

    let allPassed = true;
    for (const test of tests) {
      try {
        if (!test()) {
          allPassed = false;
        }
      } catch (error) {
        console.error(`Test failed with error: ${error}`);
        allPassed = false;
      }
    }

    console.log(allPassed ? '\n✓ All StylingCodemodGenerator tests passed!' : '\n✗ Some StylingCodemodGenerator tests failed!');
    return allPassed;
  }
}

/**
 * Test suite for FeaturePanelCodemodGenerator
 */
class FeaturePanelCodemodGeneratorTests {
  private generator: FeaturePanelCodemodGenerator;

  constructor() {
    this.generator = new FeaturePanelCodemodGenerator();
  }

  /**
   * Test feature panel restoration
   */
  testFeaturePanelRestoration(): boolean {
    console.log('Testing feature panel restoration...');
    
    const featureRegression = TestDataFactory.createMockFeaturePanelRegression();
    const codemods = this.generator.generateFeaturePanelCodemods([featureRegression]);

    if (codemods.length === 0) {
      console.error('No feature panel codemods generated');
      return false;
    }

    const codemod = codemods[0];
    if (codemod.restorations.length !== 2) {
      console.error(`Expected 2 panel restorations, got ${codemod.restorations.length}`);
      return false;
    }

    const firstRestoration = codemod.restorations[0];
    
    // Validate panel structure
    if (!firstRestoration.generatedCode.includes('s-panelCard')) {
      console.error('Generated panel missing proper CSS class');
      return false;
    }

    if (!firstRestoration.generatedCode.includes('s-panelT')) {
      console.error('Generated panel missing title class');
      return false;
    }

    // Validate data bindings
    if (firstRestoration.dataBindings.length === 0) {
      console.error('Panel restoration missing data bindings');
      return false;
    }

    console.log('✓ Feature panel restoration test passed');
    return true;
  }

  /**
   * Test empty state generation
   */
  testEmptyStateGeneration(): boolean {
    console.log('Testing empty state generation...');
    
    const emptyStates = this.generator.generateEmptyStateRestorations(['recentOrders', 'topProducts']);

    if (emptyStates.length !== 2) {
      console.error(`Expected 2 empty states, got ${emptyStates.length}`);
      return false;
    }

    const firstEmptyState = emptyStates[0];
    
    // Validate empty state structure
    if (!firstEmptyState.generatedCode.includes('s-empty')) {
      console.error('Empty state missing proper CSS class');
      return false;
    }

    if (!firstEmptyState.generatedCode.includes('s-emptyIcon')) {
      console.error('Empty state missing icon');
      return false;
    }

    if (!firstEmptyState.generatedCode.includes('s-emptyText')) {
      console.error('Empty state missing text');
      return false;
    }

    console.log('✓ Empty state generation test passed');
    return true;
  }

  /**
   * Test data compatibility fixes
   */
  testDataCompatibilityFixes(): boolean {
    console.log('Testing data compatibility fixes...');
    
    const dataIssues = [
      'Data source \'recentOrders\' is no longer available',
      'Data type mismatch for \'orders\': expected array, got object'
    ];

    const fixes = this.generator.generateDataLayerFixes(dataIssues);

    if (fixes.length !== 2) {
      console.error(`Expected 2 data fixes, got ${fixes.length}`);
      return false;
    }

    const firstFix = fixes[0];
    
    // Should provide solution
    if (!firstFix.solution) {
      console.error('Data fix missing solution');
      return false;
    }

    // Should generate code
    if (!firstFix.generatedCode) {
      console.error('Data fix missing generated code');
      return false;
    }

    console.log('✓ Data compatibility fixes test passed');
    return true;
  }

  runAllTests(): boolean {
    console.log('Running FeaturePanelCodemodGenerator tests...\n');
    
    const tests = [
      this.testFeaturePanelRestoration.bind(this),
      this.testEmptyStateGeneration.bind(this),
      this.testDataCompatibilityFixes.bind(this)
    ];

    let allPassed = true;
    for (const test of tests) {
      try {
        if (!test()) {
          allPassed = false;
        }
      } catch (error) {
        console.error(`Test failed with error: ${error}`);
        allPassed = false;
      }
    }

    console.log(allPassed ? '\n✓ All FeaturePanelCodemodGenerator tests passed!' : '\n✗ Some FeaturePanelCodemodGenerator tests failed!');
    return allPassed;
  }
}

/**
 * Test suite for CodemodOrchestrator
 */
class CodemodOrchestratorTests {
  private orchestrator: CodemodOrchestrator;

  constructor() {
    this.orchestrator = new CodemodOrchestrator();
  }

  /**
   * Test comprehensive codemod plan generation
   */
  async testComprehensiveCodemodPlan(): Promise<boolean> {
    console.log('Testing comprehensive codemod plan generation...');
    
    const regressionReport = TestDataFactory.createMockRegressionReport();
    const plan = await this.orchestrator.generateComprehensiveCodemodPlan(regressionReport);

    // Validate plan structure
    if (!plan.kpiRestoration || !plan.stylingCodemods || !plan.featurePanelCodemods) {
      console.error('Comprehensive plan missing required sections');
      return false;
    }

    // Validate execution plan
    if (plan.executionPlan.length === 0) {
      console.error('No execution steps generated');
      return false;
    }

    // Validate safety validation
    if (!plan.safetyValidation || plan.safetyValidation.overallStatus === 'unsafe') {
      console.error('Safety validation failed');
      return false;
    }

    // Validate rollback plan
    if (plan.rollbackPlan.length === 0) {
      console.error('No rollback plan generated');
      return false;
    }

    console.log('✓ Comprehensive codemod plan test passed');
    return true;
  }

  /**
   * Test execution order optimization
   */
  testExecutionOrderOptimization(): boolean {
    console.log('Testing execution order optimization...');
    
    const regressionReport = TestDataFactory.createMockRegressionReport();
    
    // Create a mock plan
    const mockPlan: ComprehensiveCodemodPlan = {
      kpiRestoration: {
        addMissingTiles: [{ tile: TestDataFactory.createMockKPITile() } as any],
        updateGridLayout: {} as any,
        restoreDataWiring: []
      },
      stylingCodemods: [
        { targetFile: 'app/styles/theme.css', changes: [], confidence: 0.9 } as any,
        { targetFile: 'app/dashboard/page.tsx', changes: [], confidence: 0.8 } as any
      ],
      featurePanelCodemods: [
        { targetFile: 'app/dashboard/page.tsx', restorations: [], confidence: 0.7 } as any
      ],
      overallConfidence: 0.8,
      safetyValidation: {} as any,
      executionPlan: [],
      rollbackPlan: []
    };

    const executionPlan = this.orchestrator.generateOptimalExecutionOrder(mockPlan);

    // CSS changes should come first
    const firstStep = executionPlan[0];
    if (!firstStep.targetFile.includes('.css')) {
      console.error('CSS changes should be executed first');
      return false;
    }

    // Steps should be ordered
    for (let i = 1; i < executionPlan.length; i++) {
      if (executionPlan[i].order <= executionPlan[i - 1].order) {
        console.error('Execution steps not properly ordered');
        return false;
      }
    }

    console.log('✓ Execution order optimization test passed');
    return true;
  }

  /**
   * Test safety validation
   */
  testSafetyValidation(): boolean {
    console.log('Testing safety validation...');
    
    const mockPlan: ComprehensiveCodemodPlan = {
      kpiRestoration: {
        addMissingTiles: [],
        updateGridLayout: {} as any,
        restoreDataWiring: []
      },
      stylingCodemods: [],
      featurePanelCodemods: [],
      overallConfidence: 0.8,
      safetyValidation: {} as any,
      executionPlan: [],
      rollbackPlan: []
    };

    const safetyResult = this.orchestrator.validateCodemodSafety(mockPlan);

    // Should have all required safety checks
    if (!safetyResult.typeScriptSafety || !safetyResult.dataLayerSafety) {
      console.error('Missing required safety checks');
      return false;
    }

    // Overall status should be determined
    if (!['safe', 'warning', 'unsafe'].includes(safetyResult.overallStatus)) {
      console.error('Invalid overall safety status');
      return false;
    }

    console.log('✓ Safety validation test passed');
    return true;
  }

  async runAllTests(): Promise<boolean> {
    console.log('Running CodemodOrchestrator tests...\n');
    
    const tests = [
      this.testComprehensiveCodemodPlan.bind(this),
      this.testExecutionOrderOptimization.bind(this),
      this.testSafetyValidation.bind(this)
    ];

    let allPassed = true;
    for (const test of tests) {
      try {
        const result = await test();
        if (!result) {
          allPassed = false;
        }
      } catch (error) {
        console.error(`Test failed with error: ${error}`);
        allPassed = false;
      }
    }

    console.log(allPassed ? '\n✓ All CodemodOrchestrator tests passed!' : '\n✗ Some CodemodOrchestrator tests failed!');
    return allPassed;
  }
}

/**
 * Main test runner
 */
export async function runCodemodGeneratorTests(): Promise<boolean> {
  console.log('='.repeat(60));
  console.log('CODEMOD GENERATION SYSTEM TESTS');
  console.log('='.repeat(60));
  console.log();

  const testSuites = [
    new CodemodGeneratorTests(),
    new StylingCodemodGeneratorTests(),
    new FeaturePanelCodemodGeneratorTests(),
    new CodemodOrchestratorTests()
  ];

  let allTestsPassed = true;

  for (const suite of testSuites) {
    try {
      const result = await suite.runAllTests();
      if (!result) {
        allTestsPassed = false;
      }
      console.log(); // Add spacing between test suites
    } catch (error) {
      console.error(`Test suite failed: ${error}`);
      allTestsPassed = false;
    }
  }

  console.log('='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL CODEMOD GENERATION TESTS PASSED!');
    console.log('The codemod generation system is working correctly.');
  } else {
    console.log('❌ SOME CODEMOD GENERATION TESTS FAILED!');
    console.log('Please review the test output above for details.');
  }
  console.log('='.repeat(60));

  return allTestsPassed;
}

// Export test utilities for external use
export {
  TestDataFactory,
  CodemodGeneratorTests,
  StylingCodemodGeneratorTests,
  FeaturePanelCodemodGeneratorTests,
  CodemodOrchestratorTests
};