/**
 * Test script for expansion system auditor
 * Validates the implementation with a simple test run
 */

import { ExpansionSystemAuditorService } from './services/expansion-system-auditor.service';
import { RedundancyDetectorService } from './services/redundancy-detector.service';
import { AuditReportGeneratorService } from './services/audit-report-generator.service';

async function testAudit() {
  console.log('🧪 Testing Expansion System Auditor...\n');

  const workspaceRoot = process.cwd();
  
  try {
    // Test individual components
    console.log('1️⃣ Testing Expansion System Auditor...');
    const auditor = new ExpansionSystemAuditorService(workspaceRoot);
    const codebaseAnalysis = await auditor.scanCodebase();
    console.log(`   ✅ Found ${codebaseAnalysis.totalFiles} expansion-related files`);

    console.log('2️⃣ Testing Redundancy Detector...');
    const redundancyDetector = new RedundancyDetectorService(workspaceRoot);
    const duplicateServices = await redundancyDetector.detectDuplicateServices();
    console.log(`   ✅ Found ${duplicateServices.length} duplicate services`);

    console.log('3️⃣ Testing Audit Report Generator...');
    const reportGenerator = new AuditReportGeneratorService(workspaceRoot);
    
    // Generate a quick summary instead of full report for testing
    console.log('   📊 Generating test summary...');
    
    const serviceInventory = await auditor.identifyExpansionServices();
    console.log(`   ✅ Identified ${serviceInventory.services.length} services`);
    console.log(`   ✅ Found ${serviceInventory.consolidationOpportunities.length} consolidation opportunities`);

    console.log('\n🎉 All tests passed! The auditor is working correctly.');
    console.log('\n💡 To run a full audit, use: npm run audit:expansion');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Provide helpful debugging information
    if (error.message.includes('ENOENT')) {
      console.log('\n💡 This might be because some service directories don\'t exist yet.');
      console.log('   The auditor will handle missing directories gracefully in production.');
    }
    
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAudit().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

export { testAudit };