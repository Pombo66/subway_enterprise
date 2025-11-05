#!/usr/bin/env node

import * as path from 'path';
import { AuditReportGeneratorService } from '../services/audit-report-generator.service';

/**
 * CLI tool for running expansion system audit
 */
async function main() {
  console.log('🚀 Starting Expansion System Audit...\n');

  const workspaceRoot = process.cwd();
  console.log(`📁 Workspace: ${workspaceRoot}\n`);

  try {
    const auditService = new AuditReportGeneratorService(workspaceRoot);
    const report = await auditService.generateComprehensiveReport();

    console.log('\n✅ Audit completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Files analyzed: ${report.codebaseAnalysis.totalFiles}`);
    console.log(`   • Duplicate services: ${report.redundancyAnalysis.summary.duplicateServicesFound}`);
    console.log(`   • Code reduction potential: ${report.redundancyAnalysis.summary.estimatedCodeReduction} lines`);
    console.log(`   • Consolidation opportunities: ${report.consolidationOpportunities.length}`);

    console.log('\n🎯 Top Recommendations:');
    report.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.title} (${rec.priority} priority)`);
    });

    console.log('\n📄 Report saved to reports/ directory');
    console.log('   Check the generated Markdown file for detailed analysis');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as runAudit };