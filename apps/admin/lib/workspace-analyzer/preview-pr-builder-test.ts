/**
 * Test suite for preview PR builder
 */

import { PreviewPRBuilder } from './preview-pr-builder';
import { ViolationsReport } from './violations-report-generator';
import { CodemodPlan } from './codemod-generator';

// Mock data for testing
const mockViolationsReport: ViolationsReport = {
  summary: {
    totalViolations: 5,
    highConfidenceChanges: [
      {
        id: 'style-missing-token-0-0',
        file: 'app/styles/theme.css',
        line: 25,
        issue: 'Missing CSS custom property: --s-gap-large',
        severity: 'medium',
        category: 'styling',
        proposedFix: 'Restore CSS custom property with value: 16px',
        confidence: 0.95,
        generatedCode: '  --s-gap-large: 16px;',
        requiresHumanReview: false
      },
      {
        id: 'kpi-reduced-grid-0',
        file: 'app/dashboard/page.tsx',
        line: 45,
        issue: 'KPI grid reduced from 9 to 5 tiles',
        severity: 'high',
        category: 'kpi',
        proposedFix: 'Restore 4 missing KPI tiles and update grid layout',
        confidence: 0.9,
        generatedCode: '<div className="s-card">...</div>',
        requiresHumanReview: false
      }
    ],
    needsHumanReview: [
      {
        id: 'component-lost-panel-0-0',
        file: 'app/dashboard/page.tsx',
        line: 80,
        issue: 'Missing feature panel: Recent Activity',
        severity: 'high',
        category: 'component',
        proposedFix: 'Restore feature panel with list content and data bindings',
        confidence: 0.75,
        generatedCode: '<div className="s-panelCard">...</div>',
        requiresHumanReview: true
      }
    ],
    byCategory: {
      kpi: 1,
      styling: 2,
      component: 1,
      data: 1
    },
    bySeverity: {
      high: 2,
      medium: 2,
      low: 1
    }
  },
  violations: [
    {
      id: 'style-missing-token-0-0',
      file: 'app/styles/theme.css',
      line: 25,
      issue: 'Missing CSS custom property: --s-gap-large',
      severity: 'medium',
      category: 'styling',
      proposedFix: 'Restore CSS custom property with value: 16px',
      confidence: 0.95,
      generatedCode: '  --s-gap-large: 16px;',
      requiresHumanReview: false
    },
    {
      id: 'kpi-reduced-grid-0',
      file: 'app/dashboard/page.tsx',
      line: 45,
      issue: 'KPI grid reduced from 9 to 5 tiles',
      severity: 'high',
      category: 'kpi',
      proposedFix: 'Restore 4 missing KPI tiles and update grid layout',
      confidence: 0.9,
      generatedCode: '<div className="s-card">...</div>',
      requiresHumanReview: false
    },
    {
      id: 'component-lost-panel-0-0',
      file: 'app/dashboard/page.tsx',
      line: 80,
      issue: 'Missing feature panel: Recent Activity',
      severity: 'high',
      category: 'component',
      proposedFix: 'Restore feature panel with list content and data bindings',
      confidence: 0.75,
      generatedCode: '<div className="s-panelCard">...</div>',
      requiresHumanReview: true
    }
  ],
  metadata: {
    generatedAt: new Date(),
    analysisConfidence: 0.85,
    targetScope: 'apps/admin',
    safetyChecks: ['typescript: pass', 'data_layer: pass']
  }
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
        generatedCode: '<div className="s-card s-cardAccent">...</div>',
        dataWiring: 'const totalStores = kpis?.totalStores ?? "0";',
        confidence: 0.8
      },
      {
        tile: {
          id: 'activeUsers',
          title: 'Active Users',
          dataSource: 'kpis.activeUsers',
          iconSvg: '<svg>...</svg>',
          accentColor: 'green',
          position: { row: 2, col: 2 }
        },
        targetFile: 'app/dashboard/page.tsx',
        insertionPoint: 'kpi-grid-container',
        generatedCode: '<div className="s-card s-cardAccent">...</div>',
        dataWiring: 'const activeUsers = kpis?.activeUsers ?? "0";',
        confidence: 0.85
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
      },
      {
        token: {
          name: '--s-radius-card',
          value: '12px',
          type: 'radius',
          usage: ['card']
        },
        targetFile: 'app/styles/theme.css',
        generatedCSS: '--s-radius-card: 12px;',
        confidence: 0.9
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
    addEmptyStates: [
      {
        component: 'RecentOrders',
        targetFile: 'app/dashboard/page.tsx',
        generatedCode: '<div className="s-empty">No recent orders</div>',
        confidence: 0.9
      }
    ]
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
    },
    {
      type: 'new_features',
      check: 'Existing Kiro features preserved',
      status: 'pass',
      message: 'Generated code does not interfere with telemetry or hooks'
    }
  ]
};

/**
 * Test preview PR builder
 */
export function testPreviewPRBuilder(): void {
  console.log('🧪 Testing Preview PR Builder...\n');

  const builder = new PreviewPRBuilder('chore/admin-regressions-restore', 'apps/admin');

  try {
    // Test 1: Build comprehensive preview PR
    console.log('📋 Test 1: Build comprehensive preview PR');
    const pr = builder.buildPreviewPR(mockViolationsReport, mockCodemodPlan);

    console.log(`✅ Generated PR with ${pr.changes.length} file changes`);
    console.log(`   - Branch: ${pr.branchName}`);
    console.log(`   - Title: ${pr.description.title}`);
    console.log(`   - Total files: ${pr.metadata.totalFiles}`);
    console.log(`   - Confidence: ${Math.round(pr.metadata.confidence * 100)}%`);
    console.log(`   - Safety score: ${Math.round(pr.metadata.safetyScore * 100)}%`);

    // Test 2: Validate PR description structure
    console.log('\n📋 Test 2: Validate PR description structure');
    const description = pr.description;
    const hasRequiredSections = description.title && description.summary && 
                               description.changes && description.safetyNotes &&
                               description.reviewGuidance && description.testingInstructions &&
                               description.rollbackInstructions;
    
    if (hasRequiredSections) {
      console.log(`✅ PR description has all required sections`);
      console.log(`   - Summary length: ${description.summary.length} chars`);
      console.log(`   - Safety notes length: ${description.safetyNotes.length} chars`);
      console.log(`   - Testing instructions length: ${description.testingInstructions.length} chars`);
    } else {
      console.log(`❌ PR description missing required sections`);
    }

    // Test 3: Validate PR changes structure
    console.log('\n📋 Test 3: Validate PR changes structure');
    let validChanges = 0;
    pr.changes.forEach((change, index) => {
      const hasRequiredFields = change.id && change.file && change.type && 
                               change.newContent && change.diff && change.explanation &&
                               typeof change.confidence === 'number' &&
                               Array.isArray(change.violationIds);
      
      if (hasRequiredFields) {
        validChanges++;
      } else {
        console.log(`❌ Change ${index} missing required fields`);
      }
    });
    console.log(`✅ ${validChanges}/${pr.changes.length} changes have valid structure`);

    // Test 4: Test file-specific changes
    console.log('\n📋 Test 4: Test file-specific changes');
    const dashboardChanges = pr.changes.filter(c => c.file === 'app/dashboard/page.tsx');
    const themeChanges = pr.changes.filter(c => c.file === 'app/styles/theme.css');
    
    console.log(`✅ Dashboard changes: ${dashboardChanges.length}`);
    console.log(`✅ Theme changes: ${themeChanges.length}`);
    
    dashboardChanges.forEach(change => {
      console.log(`   - Dashboard: ${change.explanation} (${change.violationIds.length} violations)`);
    });
    
    themeChanges.forEach(change => {
      console.log(`   - Theme: ${change.explanation} (${change.violationIds.length} violations)`);
    });

    // Test 5: Test diff generation
    console.log('\n📋 Test 5: Test diff generation');
    let changesWithDiffs = 0;
    pr.changes.forEach(change => {
      if (change.diff && change.diff.trim().length > 0) {
        changesWithDiffs++;
      }
    });
    console.log(`✅ ${changesWithDiffs}/${pr.changes.length} changes have generated diffs`);

    // Test 6: Test commands generation
    console.log('\n📋 Test 6: Test commands generation');
    const commands = pr.commands;
    const hasValidCommands = commands.createBranch && commands.applyChanges &&
                           commands.commitMessage && commands.pushCommand &&
                           Array.isArray(commands.applyChanges);
    
    if (hasValidCommands) {
      console.log(`✅ Commands are valid`);
      console.log(`   - Create branch: ${commands.createBranch}`);
      console.log(`   - Apply changes: ${commands.applyChanges.length} commands`);
      console.log(`   - Commit message length: ${commands.commitMessage.length} chars`);
      console.log(`   - Push command: ${commands.pushCommand}`);
    } else {
      console.log(`❌ Commands are invalid`);
    }

    // Test 7: Test review guidance
    console.log('\n📋 Test 7: Test review guidance');
    const reviewGuidance = pr.description.reviewGuidance;
    const hasHighConfidenceGuidance = reviewGuidance.highConfidenceChanges.length > 0;
    const hasReviewGuidance = reviewGuidance.needsHumanReview.length > 0;
    
    console.log(`✅ High confidence guidance: ${hasHighConfidenceGuidance ? 'Present' : 'Missing'}`);
    console.log(`✅ Human review guidance: ${hasReviewGuidance ? 'Present' : 'Missing'}`);

    // Test 8: Test safety validation
    console.log('\n📋 Test 8: Test safety validation');
    const safetyScore = pr.metadata.safetyScore;
    const isSafe = safetyScore >= 0.8;
    
    console.log(`✅ Safety score: ${Math.round(safetyScore * 100)}% (${isSafe ? 'Safe' : 'Needs review'})`);
    
    if (pr.description.safetyNotes.includes('✅')) {
      console.log(`✅ Safety notes include passed checks`);
    }

    // Test 9: Test metadata generation
    console.log('\n📋 Test 9: Test metadata generation');
    const metadata = pr.metadata;
    const hasValidMetadata = metadata.createdAt instanceof Date &&
                           typeof metadata.totalFiles === 'number' &&
                           typeof metadata.totalLines === 'number' &&
                           typeof metadata.confidence === 'number' &&
                           typeof metadata.safetyScore === 'number';
    
    if (hasValidMetadata) {
      console.log(`✅ Metadata is valid`);
      console.log(`   - Created at: ${metadata.createdAt.toISOString()}`);
      console.log(`   - Total files: ${metadata.totalFiles}`);
      console.log(`   - Total lines: ${metadata.totalLines}`);
      console.log(`   - Confidence: ${Math.round(metadata.confidence * 100)}%`);
      console.log(`   - Safety score: ${Math.round(metadata.safetyScore * 100)}%`);
    } else {
      console.log(`❌ Metadata is invalid`);
    }

    // Test 10: Test error handling
    console.log('\n📋 Test 10: Test error handling');
    const errors = builder.getErrors();
    console.log(`✅ Builder has ${errors.length} errors`);

    console.log('\n🎉 Preview PR Builder tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test empty PR generation
 */
export function testEmptyPRGeneration(): void {
  console.log('\n🧪 Testing Empty PR Generation...\n');

  const builder = new PreviewPRBuilder('test/empty-pr', 'apps/admin');

  // Test with empty violations report
  const emptyViolationsReport: ViolationsReport = {
    summary: {
      totalViolations: 0,
      highConfidenceChanges: [],
      needsHumanReview: [],
      byCategory: { kpi: 0, styling: 0, component: 0, data: 0 },
      bySeverity: { high: 0, medium: 0, low: 0 }
    },
    violations: [],
    metadata: {
      generatedAt: new Date(),
      analysisConfidence: 1.0,
      targetScope: 'apps/admin',
      safetyChecks: []
    }
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

  const emptyPR = builder.buildPreviewPR(emptyViolationsReport, emptyCodemodPlan);
  
  console.log(`📋 Empty PR Generation Test`);
  console.log(`✅ Generated PR with ${emptyPR.changes.length} changes`);
  console.log(`✅ Branch name: ${emptyPR.branchName}`);
  console.log(`✅ Description title: ${emptyPR.description.title}`);
  console.log(`✅ Metadata confidence: ${emptyPR.metadata.confidence}`);

  if (emptyPR.changes.length === 0 && emptyPR.metadata.totalFiles === 0) {
    console.log(`✅ Empty PR generation works correctly`);
  } else {
    console.log(`❌ Empty PR generation failed: ${emptyPR.changes.length} changes`);
  }

  console.log('\n🎉 Empty PR generation tests completed!');
}

/**
 * Test specific change types
 */
export function testChangeTypes(): void {
  console.log('\n🧪 Testing Specific Change Types...\n');

  const builder = new PreviewPRBuilder('test/change-types', 'apps/admin');

  // Test KPI-only changes
  const kpiOnlyReport: ViolationsReport = {
    summary: {
      totalViolations: 1,
      highConfidenceChanges: [mockViolationsReport.violations[1]], // KPI violation
      needsHumanReview: [],
      byCategory: { kpi: 1, styling: 0, component: 0, data: 0 },
      bySeverity: { high: 1, medium: 0, low: 0 }
    },
    violations: [mockViolationsReport.violations[1]],
    metadata: mockViolationsReport.metadata
  };

  const kpiOnlyPlan: CodemodPlan = {
    kpiRestoration: mockCodemodPlan.kpiRestoration,
    stylingFixes: { restoreTokens: [], fixIconAlignment: [], applySpacing: [] },
    componentRestoration: { restoreFeaturePanels: [], addEmptyStates: [] },
    confidence: 0.9,
    safetyChecks: mockCodemodPlan.safetyChecks
  };

  const kpiPR = builder.buildPreviewPR(kpiOnlyReport, kpiOnlyPlan);
  console.log(`📊 KPI-only PR: ${kpiPR.changes.length} changes`);
  console.log(`   Files affected: ${kpiPR.changes.map(c => c.file).join(', ')}`);

  // Test styling-only changes
  const stylingOnlyReport: ViolationsReport = {
    summary: {
      totalViolations: 1,
      highConfidenceChanges: [mockViolationsReport.violations[0]], // Styling violation
      needsHumanReview: [],
      byCategory: { kpi: 0, styling: 1, component: 0, data: 0 },
      bySeverity: { high: 0, medium: 1, low: 0 }
    },
    violations: [mockViolationsReport.violations[0]],
    metadata: mockViolationsReport.metadata
  };

  const stylingOnlyPlan: CodemodPlan = {
    kpiRestoration: { addMissingTiles: [], updateGridLayout: { targetFile: '', currentLayout: '', newLayout: '', cssChanges: '', confidence: 0 }, restoreDataWiring: [] },
    stylingFixes: mockCodemodPlan.stylingFixes,
    componentRestoration: { restoreFeaturePanels: [], addEmptyStates: [] },
    confidence: 0.9,
    safetyChecks: mockCodemodPlan.safetyChecks
  };

  const stylingPR = builder.buildPreviewPR(stylingOnlyReport, stylingOnlyPlan);
  console.log(`🎨 Styling-only PR: ${stylingPR.changes.length} changes`);
  console.log(`   Files affected: ${stylingPR.changes.map(c => c.file).join(', ')}`);

  console.log('\n🎉 Change type tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPreviewPRBuilder();
  testEmptyPRGeneration();
  testChangeTypes();
}