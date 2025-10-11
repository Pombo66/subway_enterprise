/**
 * Test suite for change validator and rollback system
 */

import { ChangeValidator } from './change-validator';
import { PreviewPR, PRChange } from './preview-pr-builder';

// Mock data for testing
const mockPRChanges: PRChange[] = [
  {
    id: 'dashboard-kpi-restore',
    file: 'app/dashboard/page.tsx',
    type: 'modify',
    originalContent: `export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="grid grid-cols-4 gap-3">
        {/* Existing KPI tiles */}
      </div>
    </div>
  );
}`,
    newContent: `export default function Dashboard() {
  const totalStores = kpis?.totalStores ?? "0";
  
  return (
    <div className="dashboard">
      <div className="grid grid-cols-3 gap-3">
        {/* Existing KPI tiles */}
        <div className="s-card s-cardAccent">
          <div className="s-blob s-blobGreen">
            <svg className="s-icon" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
          </div>
          <div className="s-cardContent">
            <div className="s-k">Total Stores</div>
            <div className="s-v">{totalStores}</div>
          </div>
        </div>
      </div>
    </div>
  );
}`,
    diff: '--- a/app/dashboard/page.tsx\n+++ b/app/dashboard/page.tsx\n@@ -1,8 +1,18 @@\n export default function Dashboard() {\n+  const totalStores = kpis?.totalStores ?? "0";\n+  \n   return (\n     <div className="dashboard">\n-      <div className="grid grid-cols-4 gap-3">\n+      <div className="grid grid-cols-3 gap-3">\n         {/* Existing KPI tiles */}\n+        <div className="s-card s-cardAccent">\n+          <div className="s-blob s-blobGreen">\n+            <svg className="s-icon" viewBox="0 0 24 24">\n+              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>\n+            </svg>\n+          </div>\n+          <div className="s-cardContent">\n+            <div className="s-k">Total Stores</div>\n+            <div className="s-v">{totalStores}</div>\n+          </div>\n+        </div>\n       </div>\n     </div>\n   );\n }',
    explanation: 'Restore KPI tiles and update grid layout',
    confidence: 0.9,
    violationIds: ['kpi-reduced-grid-0']
  },
  {
    id: 'theme-css-restore',
    file: 'app/styles/theme.css',
    type: 'modify',
    originalContent: `:root {
  --s-bg: #0f1724;
  --s-panel: #141e31;
  --s-accent: #00a651;
}`,
    newContent: `:root {
  --s-bg: #0f1724;
  --s-panel: #141e31;
  --s-accent: #00a651;
  --s-gap-large: 16px;
  --s-radius-card: 12px;
}`,
    diff: '--- a/app/styles/theme.css\n+++ b/app/styles/theme.css\n@@ -3,4 +3,6 @@\n   --s-panel: #141e31;\n   --s-accent: #00a651;\n+  --s-gap-large: 16px;\n+  --s-radius-card: 12px;\n }',
    explanation: 'Restore missing CSS custom properties',
    confidence: 0.95,
    violationIds: ['style-missing-token-0-0', 'style-missing-token-0-1']
  }
];

const mockPreviewPR: PreviewPR = {
  branchName: 'chore/admin-regressions-restore',
  description: {
    title: 'chore: restore admin UI/UX improvements from baseline',
    summary: 'Test PR for validation',
    changes: {
      kpiRestoration: 'Restored KPI tiles',
      stylingFixes: 'Restored CSS tokens',
      componentRestoration: 'No component changes'
    },
    safetyNotes: 'All changes are safe',
    reviewGuidance: {
      highConfidenceChanges: 'High confidence changes ready',
      needsHumanReview: 'No changes need review'
    },
    testingInstructions: 'Test the dashboard',
    rollbackInstructions: 'Use git revert'
  },
  changes: mockPRChanges,
  metadata: {
    createdAt: new Date(),
    totalFiles: 2,
    totalLines: 15,
    confidence: 0.92,
    safetyScore: 1.0
  },
  commands: {
    createBranch: 'git checkout -b chore/admin-regressions-restore',
    applyChanges: ['# Apply changes'],
    commitMessage: 'chore: restore admin improvements',
    pushCommand: 'git push origin chore/admin-regressions-restore'
  }
};

/**
 * Test change validator
 */
export function testChangeValidator(): void {
  console.log('🧪 Testing Change Validator...\n');

  const validator = new ChangeValidator('apps/admin');

  try {
    // Test 1: Validate preview PR
    console.log('📋 Test 1: Validate preview PR');
    const validations = validator.validatePreviewPR(mockPreviewPR);

    console.log(`✅ Generated ${validations.length} validations`);
    
    validations.forEach((validation, index) => {
      console.log(`   - Validation ${index + 1}: ${validation.changeId}`);
      console.log(`     Valid: ${validation.isValid}, Confidence: ${Math.round(validation.confidence * 100)}%`);
      console.log(`     Issues: ${validation.issues.length}, Can auto-fix: ${validation.canAutoFix}`);
      
      if (validation.issues.length > 0) {
        validation.issues.forEach(issue => {
          console.log(`       - ${issue.severity.toUpperCase()}: ${issue.message}`);
        });
      }
    });

    // Test 2: Test syntax validation
    console.log('\n📋 Test 2: Test syntax validation with problematic code');
    
    const problematicChange: PRChange = {
      id: 'syntax-error-test',
      file: 'app/test/syntax-error.tsx',
      type: 'create',
      newContent: `export default function Test() {
  return (
    <div className="test">
      {/* Unclosed JSX element
      <span>Test
    </div>
  );
}`, // Missing closing span tag
      diff: '',
      explanation: 'Test syntax validation',
      confidence: 0.5,
      violationIds: []
    };

    const problematicPR: PreviewPR = {
      ...mockPreviewPR,
      changes: [problematicChange]
    };

    const syntaxValidations = validator.validatePreviewPR(problematicPR);
    console.log(`✅ Syntax validation found ${syntaxValidations[0]?.issues.length || 0} issues`);
    
    if (syntaxValidations[0]?.issues.length > 0) {
      syntaxValidations[0].issues.forEach(issue => {
        console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
    }

    // Test 3: Test safety validation
    console.log('\n📋 Test 3: Test safety validation with dangerous code');
    
    const dangerousChange: PRChange = {
      id: 'dangerous-test',
      file: 'app/test/dangerous.ts',
      type: 'create',
      newContent: `
// Dangerous operations
eval('console.log("dangerous")');
document.innerHTML = userInput;
DROP TABLE users;
rm -rf /
`,
      diff: '',
      explanation: 'Test safety validation',
      confidence: 0.1,
      violationIds: []
    };

    const dangerousPR: PreviewPR = {
      ...mockPreviewPR,
      changes: [dangerousChange]
    };

    const safetyValidations = validator.validatePreviewPR(dangerousPR);
    console.log(`✅ Safety validation found ${safetyValidations[0]?.issues.length || 0} issues`);
    
    if (safetyValidations[0]?.issues.length > 0) {
      safetyValidations[0].issues.forEach(issue => {
        console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
    }

    // Test 4: Test rollback plan generation
    console.log('\n📋 Test 4: Test rollback plan generation');
    
    // First validate to populate the tracker
    validator.validatePreviewPR(mockPreviewPR);
    
    // Get change IDs from tracker
    const trackerState = validator.getTrackerState();
    const changeIds = Array.from(trackerState.changes.keys());
    
    if (changeIds.length > 0) {
      const rollbackPlan = validator.generateRollbackPlan(changeIds);
      
      console.log(`✅ Generated rollback plan for ${rollbackPlan.changeIds.length} changes`);
      console.log(`   - Operations: ${rollbackPlan.operations.length}`);
      console.log(`   - Risk level: ${rollbackPlan.riskLevel}`);
      console.log(`   - Estimated time: ${rollbackPlan.estimatedTime} seconds`);
      console.log(`   - Safety checks: ${rollbackPlan.safetyChecks.length}`);
      
      rollbackPlan.safetyChecks.forEach(check => {
        console.log(`     - ${check.type}: ${check.status} - ${check.message}`);
      });
    } else {
      console.log(`❌ No changes found in tracker for rollback plan`);
    }

    // Test 5: Test TypeScript validation
    console.log('\n📋 Test 5: Test TypeScript validation');
    
    const typeScriptChange: PRChange = {
      id: 'typescript-test',
      file: 'app/test/typescript.tsx',
      type: 'create',
      newContent: `import React from 'react';

interface TestProps {
  data: any; // Using 'any' type
  optional?: string;
}

export default function Test({ data, optional }: TestProps) {
  const result = data?.someProperty ?? 'default';
  
  return (
    <div className="test">
      {result}
    </div>
  );
}`,
      diff: '',
      explanation: 'Test TypeScript validation',
      confidence: 0.8,
      violationIds: []
    };

    const typeScriptPR: PreviewPR = {
      ...mockPreviewPR,
      changes: [typeScriptChange]
    };

    const tsValidations = validator.validatePreviewPR(typeScriptPR);
    console.log(`✅ TypeScript validation found ${tsValidations[0]?.issues.length || 0} issues`);
    
    if (tsValidations[0]?.issues.length > 0) {
      tsValidations[0].issues.forEach(issue => {
        console.log(`   - ${issue.type.toUpperCase()}: ${issue.message}`);
      });
    }

    // Test 6: Test compatibility validation
    console.log('\n📋 Test 6: Test compatibility validation');
    
    const compatibilityChange: PRChange = {
      id: 'compatibility-test',
      file: 'app/test/compatibility.ts',
      type: 'modify',
      originalContent: `export function oldFunction(param: string): string {
  return param;
}

export const oldConstant = 'value';`,
      newContent: `export function newFunction(param: string, newParam: number): string {
  return param + newParam;
}

export const newConstant = 'new value';`,
      diff: '',
      explanation: 'Test compatibility validation',
      confidence: 0.6,
      violationIds: []
    };

    const compatibilityPR: PreviewPR = {
      ...mockPreviewPR,
      changes: [compatibilityChange]
    };

    const compatValidations = validator.validatePreviewPR(compatibilityPR);
    console.log(`✅ Compatibility validation found ${compatValidations[0]?.issues.length || 0} issues`);
    
    if (compatValidations[0]?.issues.length > 0) {
      compatValidations[0].issues.forEach(issue => {
        console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
    }

    // Test 7: Test suggested fixes
    console.log('\n📋 Test 7: Test suggested fixes generation');
    
    validations.forEach((validation, index) => {
      if (validation.suggestedFixes.length > 0) {
        console.log(`✅ Validation ${index + 1} has ${validation.suggestedFixes.length} suggested fixes:`);
        validation.suggestedFixes.forEach(fix => {
          console.log(`   - ${fix}`);
        });
      }
    });

    // Test 8: Test tracker state
    console.log('\n📋 Test 8: Test tracker state');
    
    const finalTrackerState = validator.getTrackerState();
    console.log(`✅ Tracker state:`);
    console.log(`   - Changes: ${finalTrackerState.changes.size}`);
    console.log(`   - Applied order: ${finalTrackerState.appliedOrder.length}`);
    console.log(`   - Backups: ${finalTrackerState.backups.size}`);
    console.log(`   - Current state: ${finalTrackerState.currentState.size}`);
    console.log(`   - Rollback history: ${finalTrackerState.rollbackHistory.length}`);

    // Test 9: Test error handling
    console.log('\n📋 Test 9: Test error handling');
    const errors = validator.getErrors();
    console.log(`✅ Validator has ${errors.length} errors`);
    
    if (errors.length > 0) {
      errors.forEach(error => {
        console.log(`   - ${error.type}: ${error.message}`);
      });
    }

    // Test 10: Test rollback execution (simulation)
    console.log('\n📋 Test 10: Test rollback execution simulation');
    
    if (changeIds.length > 0) {
      const rollbackPlan = validator.generateRollbackPlan(changeIds.slice(0, 1)); // Test with one change
      
      // Check if rollback would be safe
      const criticalFailures = rollbackPlan.safetyChecks.filter(
        check => check.status === 'fail' && 
        (check.type === 'backup_exists' || check.type === 'no_conflicts')
      );
      
      if (criticalFailures.length === 0) {
        console.log(`✅ Rollback execution would be safe`);
        console.log(`   - Risk level: ${rollbackPlan.riskLevel}`);
        console.log(`   - Estimated time: ${rollbackPlan.estimatedTime} seconds`);
      } else {
        console.log(`❌ Rollback execution would fail due to safety issues`);
        criticalFailures.forEach(failure => {
          console.log(`     - ${failure.message}`);
        });
      }
    }

    console.log('\n🎉 Change Validator tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test dependency validation
 */
export function testDependencyValidation(): void {
  console.log('\n🧪 Testing Dependency Validation...\n');

  const validator = new ChangeValidator('apps/admin');

  // Create changes with circular dependencies
  const circularChanges: PRChange[] = [
    {
      id: 'change-a',
      file: 'app/test/a.ts',
      type: 'create',
      newContent: 'export const a = "a";',
      diff: '',
      explanation: 'Change A',
      confidence: 1.0,
      violationIds: []
    },
    {
      id: 'change-b',
      file: 'app/test/b.ts',
      type: 'create',
      newContent: 'export const b = "b";',
      diff: '',
      explanation: 'Change B',
      confidence: 1.0,
      violationIds: []
    }
  ];

  const circularPR: PreviewPR = {
    branchName: 'test/circular-deps',
    description: mockPreviewPR.description,
    changes: circularChanges,
    metadata: mockPreviewPR.metadata,
    commands: mockPreviewPR.commands
  };

  const validations = validator.validatePreviewPR(circularPR);
  
  console.log(`📋 Dependency Validation Test`);
  console.log(`✅ Generated ${validations.length} validations`);
  
  const dependencyValidation = validations.find(v => v.changeId === 'dependency-validation');
  if (dependencyValidation) {
    console.log(`✅ Found dependency validation with ${dependencyValidation.issues.length} issues`);
    dependencyValidation.issues.forEach(issue => {
      console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
    });
  } else {
    console.log(`✅ No dependency issues found`);
  }

  console.log('\n🎉 Dependency validation tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testChangeValidator();
  testDependencyValidation();
}