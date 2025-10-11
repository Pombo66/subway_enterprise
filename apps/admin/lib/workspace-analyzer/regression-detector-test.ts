/**
 * Test suite for regression detection engine
 * Validates KPI grid comparison, styling regression detection, and feature panel analysis
 */

import { RegressionDetector } from './regression-detector';
import { KPIGridStructure, KPITile, StyleToken, FeaturePanel, IconAlignment } from './component-extractor';
import { StyleTokenAnalysis } from './style-extractor';
import { FeaturePanelAnalysis } from './feature-panel-detector';

/**
 * Test the regression detection engine with sample data
 */
export function testRegressionDetection(): void {
  console.log('🔍 Testing Regression Detection Engine...\n');

  const detector = new RegressionDetector();

  // Test KPI grid comparison
  testKPIGridComparison(detector);
  
  // Test styling regression detection
  testStylingRegressionDetection(detector);
  
  // Test feature panel regression analysis
  testFeaturePanelRegression(detector);
  
  // Test comprehensive regression report
  testComprehensiveRegressionReport(detector);

  console.log('✅ All regression detection tests completed!\n');
}

/**
 * Test KPI grid comparison logic
 */
function testKPIGridComparison(detector: RegressionDetector): void {
  console.log('📊 Testing KPI Grid Comparison...');

  // Create old baseline with 9 tiles
  const oldGrid: KPIGridStructure = {
    tileCount: 9,
    tiles: [
      createKPITile('orderstoday', 'Orders Today', 'ordersToday', 's-accent1'),
      createKPITile('revenuetoday', 'Revenue Today', 'revenueToday', 's-accent2'),
      createKPITile('pendingorders', 'Pending Orders', 'pendingOrders', 's-accent3'),
      createKPITile('menuitems', 'Menu Items', 'menuItems', 's-accent4'),
      createKPITile('avgordervalue', 'Avg Order Value', 'avgOrderValue', 's-accent1'),
      createKPITile('totalstores', 'Total Stores', 'totalStores', 's-accent2'),
      createKPITile('activeusers', 'Active Users', 'activeUsers', 's-accent3'),
      createKPITile('customersatisfaction', 'Customer Satisfaction', 'customerSatisfaction', 's-accent4'),
      createKPITile('inventoryalerts', 'Inventory Alerts', 'inventoryAlerts', 's-accent1')
    ],
    gridLayout: 'repeat(3, minmax(0,1fr))',
    containerClass: 's-kpis',
    responsiveBreakpoints: ['@media (max-width: 768px)']
  };

  // Create current state with 5 tiles
  const currentGrid: KPIGridStructure = {
    tileCount: 5,
    tiles: [
      createKPITile('orderstoday', 'Orders Today', 'ordersToday', 's-accent1'),
      createKPITile('revenuetoday', 'Revenue Today', 'revenueToday', 's-accent2'),
      createKPITile('pendingorders', 'Pending Orders', 'pendingOrders', 's-accent3'),
      createKPITile('menuitems', 'Menu Items', 'menuItems', 's-accent4'),
      createKPITile('avgordervalue', 'Avg Order Value', 'avgOrderValue', 's-accent1')
    ],
    gridLayout: 'repeat(4, minmax(0,1fr))',
    containerClass: 's-kpis',
    responsiveBreakpoints: ['@media (max-width: 768px)']
  };

  const kpiRegressions = detector.compareKPIGrids(oldGrid, currentGrid);

  console.log(`  Found ${kpiRegressions.length} KPI regressions:`);
  kpiRegressions.forEach(regression => {
    console.log(`    - ${regression.type}: ${regression.description}`);
    console.log(`      Severity: ${regression.severity}`);
    console.log(`      Missing tiles: ${regression.missingTiles.length}`);
    if (regression.missingTiles.length > 0) {
      regression.missingTiles.forEach(tile => {
        console.log(`        * ${tile.title} (${tile.dataSource})`);
      });
    }
  });

  console.log('');
}

/**
 * Test styling regression detection
 */
function testStylingRegressionDetection(detector: RegressionDetector): void {
  console.log('🎨 Testing Styling Regression Detection...');

  // Create old style analysis
  const oldStyleAnalysis: StyleTokenAnalysis = {
    customProperties: [
      createStyleToken('--s-bg', '#0f1724', 'color'),
      createStyleToken('--s-panel', '#141e31', 'color'),
      createStyleToken('--s-accent', '#00a651', 'color'),
      createStyleToken('--s-gap', '12px', 'spacing'),
      createStyleToken('--s-radius', '12px', 'radius'),
      createStyleToken('--s-shadow', '0 8px 24px rgba(0,0,0,.35)', 'shadow')
    ],
    classNames: [
      createStyleToken('s-card', 'card styles', 'custom-property'),
      createStyleToken('s-blob', 'icon container', 'custom-property'),
      createStyleToken('s-k', 'kpi label', 'custom-property')
    ],
    tailwindClasses: [],
    cssVariables: [],
    missingTokens: [],
    modifiedTokens: []
  };

  // Create current style analysis (missing some tokens)
  const currentStyleAnalysis: StyleTokenAnalysis = {
    customProperties: [
      createStyleToken('--s-bg', '#0f1724', 'color'),
      createStyleToken('--s-panel', '#141e31', 'color'),
      createStyleToken('--s-accent', '#00a651', 'color'),
      createStyleToken('--s-gap', '8px', 'spacing'), // Changed value
      // Missing --s-radius and --s-shadow
    ],
    classNames: [
      createStyleToken('s-card', 'card styles', 'custom-property'),
      // Missing s-blob and s-k
    ],
    tailwindClasses: [],
    cssVariables: [],
    missingTokens: [],
    modifiedTokens: []
  };

  // Create icon alignments
  const oldIconAlignments: IconAlignment[] = [
    {
      component: 'kpi-icon-1',
      iconClass: 's-blob s-accent1',
      alignment: 'center',
      spacing: '8px',
      issues: []
    }
  ];

  const currentIconAlignments: IconAlignment[] = [
    {
      component: 'kpi-icon-1',
      iconClass: 's-accent1', // Missing s-blob
      alignment: 'center',
      spacing: '4px', // Reduced spacing
      issues: ['Missing s-blob base class']
    }
  ];

  const stylingRegressions = detector.compareStylingTokens(
    oldStyleAnalysis,
    currentStyleAnalysis,
    oldIconAlignments,
    currentIconAlignments
  );

  console.log(`  Found ${stylingRegressions.length} styling regressions:`);
  stylingRegressions.forEach(regression => {
    console.log(`    - ${regression.type}: ${regression.description}`);
    console.log(`      Severity: ${regression.severity}`);
    
    if (regression.missingTokens.length > 0) {
      console.log(`      Missing tokens: ${regression.missingTokens.map(t => t.name).join(', ')}`);
    }
    
    if (regression.iconOverlaps.length > 0) {
      console.log(`      Icon issues:`);
      regression.iconOverlaps.forEach(overlap => {
        console.log(`        * ${overlap.component}: ${overlap.issue}`);
      });
    }
    
    if (regression.spacingIssues.length > 0) {
      console.log(`      Spacing issues:`);
      regression.spacingIssues.forEach(issue => {
        console.log(`        * ${issue.element}: ${issue.issue}`);
      });
    }
  });

  console.log('');
}

/**
 * Test feature panel regression analysis
 */
function testFeaturePanelRegression(detector: RegressionDetector): void {
  console.log('📋 Testing Feature Panel Regression Analysis...');

  // Create old panel analysis
  const oldPanelAnalysis: FeaturePanelAnalysis = {
    panels: [
      createFeaturePanel('recentorders', 'Recent Orders', 'list', ['recentOrders', 'orders.length'], true),
      createFeaturePanel('dailyanalytics', 'Daily Analytics', 'chart', ['dailyStats', 'analytics.revenue'], true),
      createFeaturePanel('systemhealth', 'System Health', 'status', ['healthStatus', 'sys.uptime'], false),
      createFeaturePanel('quickactions', 'Quick Actions', 'actions', ['actions'], false)
    ],
    hierarchy: [],
    relationships: [],
    dataBindings: [
      {
        variable: 'recentOrders',
        source: 'orders-api',
        type: 'array',
        nullable: true,
        fallback: '[]'
      },
      {
        variable: 'dailyStats',
        source: 'analytics-api',
        type: 'object',
        nullable: true
      }
    ],
    missingPanels: [],
    degradedComponents: []
  };

  // Create current panel analysis (missing some panels)
  const currentPanelAnalysis: FeaturePanelAnalysis = {
    panels: [
      createFeaturePanel('recentorders', 'Recent Orders', 'list', ['recentOrders'], false), // Lost empty state
      createFeaturePanel('dailyanalytics', 'Daily Analytics', 'list', ['dailyStats'], true), // Changed type
      // Missing systemhealth and quickactions panels
    ],
    hierarchy: [],
    relationships: [],
    dataBindings: [
      {
        variable: 'recentOrders',
        source: 'orders-api',
        type: 'array',
        nullable: false, // Changed nullability
      }
      // Missing dailyStats binding
    ],
    missingPanels: [],
    degradedComponents: []
  };

  const featureRegressions = detector.compareFeaturePanels(oldPanelAnalysis, currentPanelAnalysis);

  console.log(`  Found ${featureRegressions.length} feature panel regressions:`);
  featureRegressions.forEach(regression => {
    console.log(`    - ${regression.type}: ${regression.description}`);
    console.log(`      Severity: ${regression.severity}`);
    
    if (regression.lostPanels.length > 0) {
      console.log(`      Lost panels: ${regression.lostPanels.map(p => p.title).join(', ')}`);
    }
    
    if (regression.degradedComponents.length > 0) {
      console.log(`      Degraded components:`);
      regression.degradedComponents.forEach(comp => {
        console.log(`        * ${comp.component}: ${comp.issue} - ${comp.impact}`);
      });
    }
    
    if (regression.dataCompatibilityIssues.length > 0) {
      console.log(`      Data compatibility issues:`);
      regression.dataCompatibilityIssues.forEach(issue => {
        console.log(`        * ${issue}`);
      });
    }
  });

  console.log('');
}

/**
 * Test comprehensive regression report generation
 */
function testComprehensiveRegressionReport(detector: RegressionDetector): void {
  console.log('📊 Testing Comprehensive Regression Report...');

  // Use simplified test data
  const oldGrid: KPIGridStructure = {
    tileCount: 9,
    tiles: [],
    gridLayout: 'repeat(3, minmax(0,1fr))',
    containerClass: 's-kpis',
    responsiveBreakpoints: []
  };

  const currentGrid: KPIGridStructure = {
    tileCount: 5,
    tiles: [],
    gridLayout: 'repeat(4, minmax(0,1fr))',
    containerClass: 's-kpis',
    responsiveBreakpoints: []
  };

  const report = detector.generateRegressionReport(
    oldGrid,
    currentGrid,
    null, // No style analysis for this test
    null,
    null, // No panel analysis for this test
    null
  );

  console.log(`  Regression Report Summary:`);
  console.log(`    Total Issues: ${report.summary.totalIssues}`);
  console.log(`    High Severity: ${report.summary.highSeverityCount}`);
  console.log(`    Medium Severity: ${report.summary.mediumSeverityCount}`);
  console.log(`    Low Severity: ${report.summary.lowSeverityCount}`);
  console.log(`    Confidence Score: ${(report.confidence * 100).toFixed(1)}%`);

  console.log('');
}

// Helper functions for creating test data

function createKPITile(id: string, title: string, dataSource: string, accentColor: string): KPITile {
  return {
    id,
    title,
    dataSource,
    iconSvg: '<svg>...</svg>',
    accentColor,
    position: { row: 0, col: 0 },
    className: 's-card'
  };
}

function createStyleToken(name: string, value: string, type: StyleToken['type']): StyleToken {
  return {
    name,
    value,
    type,
    category: 'test'
  };
}

function createFeaturePanel(
  id: string,
  title: string,
  contentType: FeaturePanel['contentType'],
  dataBinding: string[],
  hasEmptyState: boolean
): FeaturePanel {
  return {
    id,
    title,
    contentType,
    dataBinding,
    className: 's-panelCard',
    position: { section: 's-panGrid', order: 0 },
    hasEmptyState
  };
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRegressionDetection();
}