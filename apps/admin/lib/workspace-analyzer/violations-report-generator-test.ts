/**
 * Test suite for violations report generator
 */

import { ViolationsReportGenerator } from './violations-report-generator';
import { RegressionReport } from './regression-detector';
import { CodemodPlan } from './codemod-generator';

// Mock data for testing
const mockRegressionReport: RegressionReport = {
  kpiRegressions: [
    {
      type: 'reduced_grid',
      severity: 'high',
      description: 'KPI grid reduced from 9 tiles to 5 tiles',
      missingTiles: [
        {
          id: 'totalStores',
          title: 'Total Stores',
          dataSource: 'kpis.totalStores',
          iconSvg: '<svg>...</svg>',
          accentColor: 'blue',
          position: { row: 2, col: 1 }
        },
        {
          id: 'activeUsers',
          title: 'Active Users',
          dataSource: 'kpis.activeUsers',
          iconSvg: '<svg>...</svg>',
          accentColor: 'green',
          position: { row: 2, col: 2 }
        }
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
    }
  ],
  stylingRegressions: [
    {
      type: 'missing_tokens',
      severity: 'medium',
      description: '3 CSS custom properties are missing',
      missingTokens: [
        {
          name: '--s-gap-large',
          value: '16px',
          type: 'spacing',
          usage: ['grid', 'flex']
        },
        {
          name: '--s-radius-card',
          value: '12px',
          type: 'radius',
          usage: ['card']
        }
      ],
      iconOverlaps: [],
      spacingIssues: [],
      removedClasses: []
    },
    {
      type: 'icon_overlap',
      severity: 'medium',
      description: '2 icon alignment issues detected',
      missingTokens: [],
      iconOverlaps: [
        {
          component: 'KPITile',
          issue: 'Icon overlapping with text',
          currentSpacing: '4px',
          recommendedSpacing: '8px'
        }
      ],
      spacingIssues: [],
      removedClasses: []
    }
  ],
  featureRegressions: [
    {
      type: 'lost_panels',
      severity: 'high',
      description: '1 feature panels are missing',
      lostPanels: [
        {
          id: 'recentActivity',
          title: 'Recent Activity',
          contentType: 'list',
          dataBinding: ['recentActivities'],
          className: 's-panelCard',
          position: {
            section: 'sidebar',
            order: 1
          },
          hasEmptyState: true
        }
      ],
      degradedComponents: [],
      missingEmptyStates: [],
      dataCompatibilityIssues: []
    }
  ],
  summary: {
    totalIssues: 4,
    highSeverityCount: 2,
    mediumSeverityCount: 2,
    lowSeverityCount: 0
  },
  confidence: 0.85
};

const mockCodemodPlan: CodemodPlan = {
  kpiRestoration: {
    addMissingTiles: [
      {
        tile: {
          id: 'totalStores',
          title: 'Total Stores',
          dataSource: 'kpis.totalStores',
          iconSvg: '<svg>...</svg>',
          accentColor: 'blue',
          position: { row: 2, col: 1 }
        },
        targetFile: 'app/dashboard/page.tsx',
        insertionPoint: 'kpi-grid-container',
        generatedCode: '<div className="s-card">...</div>',
        dataWiring: 'const totalStores = kpis?.totalStores ?? "0";',
        confidence: 0.8
      }
    ],
    updateGridLayout: {
      targetFile: 'app/dashboard/page.tsx',
      currentLayout: 'repeat(4, minmax(0, 1fr))',
      newLayout: 'repeat(3, minmax(0, 1fr))',
      cssChanges: '.kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }',
      confidence: 0.9
    },
    restoreDataWiring: [
      {
        variable: 'totalStores',
        dataSource: 'kpis.totalStores',
        fallbackValue: '0',
        generatedCode: 'const totalStores = kpis?.totalStores ?? "0";',
        confidence: 0.8
      }
    ]
  },
  stylingFixes: {
    restoreTokens: [
      {
        token: {
          name: '--s-gap-large',
          value: '16px',
          type: 'spacing',
          usage: ['grid', 'flex']
        },
        targetFile: 'app/styles/theme.css',
        generatedCSS: '--s-gap-large: 16px;',
        confidence: 0.95
      }
    ],
    fixIconAlignment: [
      {
        component: 'KPITile',
        targetFile: 'app/dashboard/page.tsx',
        currentCode: '<div className="icon-container">...</div>',
        fixedCode: '<div className="s-blob s-blobGreen">...</div>',
        confidence: 0.8
      }
    ],
    applySpacing: []
  },
  componentRestoration: {
    restoreFeaturePanels: [
      {
        panel: {
          id: 'recentActivity',
          title: 'Recent Activity',
          contentType: 'list',
          dataBinding: ['recentActivities'],
          className: 's-panelCard',
          position: {
            section: 'sidebar',
            order: 1
          },
          hasEmptyState: true
        },
        targetFile: 'app/dashboard/page.tsx',
        generatedCode: '<div className="s-panelCard">...</div>',
        dataCompatibility: [],
        confidence: 0.75
      }
    ],
    addEmptyStates: []
  },
  confidence: 0.82,
  safetyChecks: [
    {
      type: 'typescript',
      check: 'Generated code maintains TypeScript compatibility',
      status: 'pass',
      message: 'All generated code uses proper TypeScript syntax'
    },
    {
      type: 'data_layer',
      check: 'Data bindings use safe fallbacks',
      status: 'pass',
      message: 'All data bindings include null checking'
    }
  ]
};

/**
 * Test violations report generation
 */
export function testViolationsReportGenerator(): void {
  console.log('🧪 Testing Violations Report Generator...\n');

  const generator = new ViolationsReportGenerator('apps/admin', 0.8);

  try {
    // Test 1: Generate comprehensive violations report
    console.log('📋 Test 1: Generate comprehensive violations report');
    const report = generator.generateViolationsReport(mockRegressionReport, mockCodemodPlan);

    console.log(`✅ Generated report with ${report.violations.length} violations`);
    console.log(`   - High confidence changes: ${report.summary.highConfidenceChanges.length}`);
    console.log(`   - Needs human review: ${report.summary.needsHumanReview.length}`);
    console.log(`   - By category: KPI(${report.summary.byCategory.kpi}), Styling(${report.summary.byCategory.styling}), Component(${report.summary.byCategory.component}), Data(${report.summary.byCategory.data})`);
    console.log(`   - By severity: High(${report.summary.bySeverity.high}), Medium(${report.summary.bySeverity.medium}), Low(${report.summary.bySeverity.low})`);

    // Test 2: Validate violation items structure
    console.log('\n📋 Test 2: Validate violation items structure');
    let validViolations = 0;
    report.violations.forEach((violation, index) => {
      const hasRequiredFields = violation.id && violation.file && violation.issue && 
                               violation.severity && violation.category && violation.proposedFix &&
                               typeof violation.confidence === 'number' &&
                               typeof violation.requiresHumanReview === 'boolean';
      
      if (hasRequiredFields) {
        validViolations++;
      } else {
        console.log(`❌ Violation ${index} missing required fields`);
      }
    });
    console.log(`✅ ${validViolations}/${report.violations.length} violations have valid structure`);

    // Test 3: Test confidence threshold separation
    console.log('\n📋 Test 3: Test confidence threshold separation');
    const highConfidenceCount = report.summary.highConfidenceChanges.length;
    const needsReviewCount = report.summary.needsHumanReview.length;
    const totalCount = report.violations.length;
    
    if (highConfidenceCount + needsReviewCount === totalCount) {
      console.log(`✅ Confidence separation correct: ${highConfidenceCount} high-confidence + ${needsReviewCount} needs-review = ${totalCount} total`);
    } else {
      console.log(`❌ Confidence separation incorrect: ${highConfidenceCount} + ${needsReviewCount} ≠ ${totalCount}`);
    }

    // Test 4: Validate generated code samples
    console.log('\n📋 Test 4: Validate generated code samples');
    let codeViolations = 0;
    report.violations.forEach(violation => {
      if (violation.generatedCode && violation.generatedCode.trim().length > 0) {
        codeViolations++;
      }
    });
    console.log(`✅ ${codeViolations}/${report.violations.length} violations have generated code`);

    // Test 5: Test KPI-specific violations
    console.log('\n📋 Test 5: Test KPI-specific violations');
    const kpiViolations = report.violations.filter(v => v.category === 'kpi');
    console.log(`✅ Generated ${kpiViolations.length} KPI violations`);
    
    kpiViolations.forEach(violation => {
      console.log(`   - ${violation.id}: ${violation.issue} (confidence: ${violation.confidence})`);
    });

    // Test 6: Test styling-specific violations
    console.log('\n📋 Test 6: Test styling-specific violations');
    const stylingViolations = report.violations.filter(v => v.category === 'styling');
    console.log(`✅ Generated ${stylingViolations.length} styling violations`);
    
    stylingViolations.forEach(violation => {
      console.log(`   - ${violation.id}: ${violation.issue} (confidence: ${violation.confidence})`);
    });

    // Test 7: Test component-specific violations
    console.log('\n📋 Test 7: Test component-specific violations');
    const componentViolations = report.violations.filter(v => v.category === 'component');
    console.log(`✅ Generated ${componentViolations.length} component violations`);
    
    componentViolations.forEach(violation => {
      console.log(`   - ${violation.id}: ${violation.issue} (confidence: ${violation.confidence})`);
    });

    // Test 8: Test metadata generation
    console.log('\n📋 Test 8: Test metadata generation');
    const metadata = report.metadata;
    const hasValidMetadata = metadata.generatedAt instanceof Date &&
                           typeof metadata.analysisConfidence === 'number' &&
                           typeof metadata.targetScope === 'string' &&
                           Array.isArray(metadata.safetyChecks);
    
    if (hasValidMetadata) {
      console.log(`✅ Metadata is valid`);
      console.log(`   - Generated at: ${metadata.generatedAt.toISOString()}`);
      console.log(`   - Analysis confidence: ${metadata.analysisConfidence}`);
      console.log(`   - Target scope: ${metadata.targetScope}`);
      console.log(`   - Safety checks: ${metadata.safetyChecks.length}`);
    } else {
      console.log(`❌ Metadata is invalid`);
    }

    // Test 9: Test error handling
    console.log('\n📋 Test 9: Test error handling');
    const errors = generator.getErrors();
    console.log(`✅ Generator has ${errors.length} errors`);

    // Test 10: Test empty report generation
    console.log('\n📋 Test 10: Test empty report generation');
    const emptyRegressionReport: RegressionReport = {
      kpiRegressions: [],
      stylingRegressions: [],
      featureRegressions: [],
      summary: {
        totalIssues: 0,
        highSeverityCount: 0,
        mediumSeverityCount: 0,
        lowSeverityCount: 0
      },
      confidence: 1.0
    };

    const emptyCodemodPlan: CodemodPlan = {
      kpiRestoration: {
        addMissingTiles: [],
        updateGridLayout: {
          targetFile: '',
          currentLayout: '',
          newLayout: '',
          cssChanges: '',
          confidence: 0
        },
        restoreDataWiring: []
      },
      stylingFixes: {
        restoreTokens: [],
        fixIconAlignment: [],
        applySpacing: []
      },
      componentRestoration: {
        restoreFeaturePanels: [],
        addEmptyStates: []
      },
      confidence: 1.0,
      safetyChecks: []
    };

    const emptyReport = generator.generateViolationsReport(emptyRegressionReport, emptyCodemodPlan);
    
    if (emptyReport.violations.length === 0 && emptyReport.summary.totalViolations === 0) {
      console.log(`✅ Empty report generation works correctly`);
    } else {
      console.log(`❌ Empty report generation failed: ${emptyReport.violations.length} violations`);
    }

    console.log('\n🎉 Violations Report Generator tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test specific violation types
 */
export function testViolationTypes(): void {
  console.log('\n🧪 Testing Specific Violation Types...\n');

  const generator = new ViolationsReportGenerator('apps/admin', 0.8);

  // Test KPI violations only
  const kpiOnlyReport: RegressionReport = {
    kpiRegressions: mockRegressionReport.kpiRegressions,
    stylingRegressions: [],
    featureRegressions: [],
    summary: { totalIssues: 1, highSeverityCount: 1, mediumSeverityCount: 0, lowSeverityCount: 0 },
    confidence: 0.9
  };

  const kpiOnlyPlan: CodemodPlan = {
    kpiRestoration: mockCodemodPlan.kpiRestoration,
    stylingFixes: { restoreTokens: [], fixIconAlignment: [], applySpacing: [] },
    componentRestoration: { restoreFeaturePanels: [], addEmptyStates: [] },
    confidence: 0.9,
    safetyChecks: []
  };

  const kpiReport = generator.generateViolationsReport(kpiOnlyReport, kpiOnlyPlan);
  console.log(`📊 KPI-only report: ${kpiReport.violations.length} violations`);
  console.log(`   Categories: KPI(${kpiReport.summary.byCategory.kpi}), Styling(${kpiReport.summary.byCategory.styling}), Component(${kpiReport.summary.byCategory.component})`);

  // Test styling violations only
  const stylingOnlyReport: RegressionReport = {
    kpiRegressions: [],
    stylingRegressions: mockRegressionReport.stylingRegressions,
    featureRegressions: [],
    summary: { totalIssues: 2, highSeverityCount: 0, mediumSeverityCount: 2, lowSeverityCount: 0 },
    confidence: 0.9
  };

  const stylingOnlyPlan: CodemodPlan = {
    kpiRestoration: { addMissingTiles: [], updateGridLayout: { targetFile: '', currentLayout: '', newLayout: '', cssChanges: '', confidence: 0 }, restoreDataWiring: [] },
    stylingFixes: mockCodemodPlan.stylingFixes,
    componentRestoration: { restoreFeaturePanels: [], addEmptyStates: [] },
    confidence: 0.9,
    safetyChecks: []
  };

  const stylingReport = generator.generateViolationsReport(stylingOnlyReport, stylingOnlyPlan);
  console.log(`🎨 Styling-only report: ${stylingReport.violations.length} violations`);
  console.log(`   Categories: KPI(${stylingReport.summary.byCategory.kpi}), Styling(${stylingReport.summary.byCategory.styling}), Component(${stylingReport.summary.byCategory.component})`);

  console.log('\n🎉 Violation type tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testViolationsReportGenerator();
  testViolationTypes();
}