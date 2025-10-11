/**
 * Test implementation for component structure extraction
 */

import { WorkspaceAnalyzer } from './workspace-analyzer';
import { WorkspaceConfig } from './types';

/**
 * Test the component structure extraction functionality
 */
export async function testComponentStructureExtraction() {
  console.log('🔍 Testing Component Structure Extraction...\n');

  // Configure workspace paths
  const config: WorkspaceConfig = {
    oldRoot: '/Users/khalidgehlan/Documents/subway_enterprise',
    newRoot: '/Users/khalidgehlan/subway_enterprise-1',
    targetScope: 'apps/admin'
  };

  const analyzer = new WorkspaceAnalyzer(config);

  try {
    // Test KPI Grid Extraction
    console.log('📊 Testing KPI Grid Extraction...');
    const currentKpiGrid = await analyzer.extractKPIGrid('current');
    
    if (currentKpiGrid) {
      console.log(`✅ Found ${currentKpiGrid.tileCount} KPI tiles`);
      console.log(`📐 Grid layout: ${currentKpiGrid.gridLayout}`);
      console.log(`🎨 Container class: ${currentKpiGrid.containerClass}`);
      
      currentKpiGrid.tiles.forEach((tile, index) => {
        console.log(`   ${index + 1}. ${tile.title} (${tile.dataSource}) - ${tile.accentColor}`);
      });
    } else {
      console.log('❌ Failed to extract KPI grid');
    }

    console.log('\n🎨 Testing Style Token Extraction...');
    const styleAnalysis = await analyzer.extractStyleAnalysis('current');
    
    if (styleAnalysis) {
      console.log(`✅ Found ${styleAnalysis.customProperties.length} custom properties`);
      console.log(`📝 Found ${styleAnalysis.classNames.length} class names`);
      console.log(`🎯 Found ${styleAnalysis.tailwindClasses.length} Tailwind classes`);
      
      // Show some key tokens
      const colorTokens = styleAnalysis.customProperties.filter(t => t.category === 'color');
      console.log(`🎨 Color tokens: ${colorTokens.length}`);
      colorTokens.slice(0, 3).forEach(token => {
        console.log(`   ${token.name}: ${token.value}`);
      });
    } else {
      console.log('❌ Failed to extract style analysis');
    }

    console.log('\n🏗️ Testing Feature Panel Detection...');
    const panelAnalysis = await analyzer.extractFeaturePanelAnalysis('current');
    
    if (panelAnalysis) {
      console.log(`✅ Found ${panelAnalysis.panels.length} feature panels`);
      console.log(`🔗 Found ${panelAnalysis.relationships.length} component relationships`);
      console.log(`📊 Found ${panelAnalysis.dataBindings.length} data bindings`);
      
      panelAnalysis.panels.forEach((panel, index) => {
        console.log(`   ${index + 1}. ${panel.title} (${panel.contentType}) - ${panel.dataBinding.length} bindings`);
      });
    } else {
      console.log('❌ Failed to extract feature panel analysis');
    }

    console.log('\n🎯 Testing Icon Alignment Extraction...');
    const iconAlignments = await analyzer.extractIconAlignments('current');
    
    console.log(`✅ Found ${iconAlignments.length} icon alignments`);
    iconAlignments.forEach((alignment, index) => {
      console.log(`   ${index + 1}. ${alignment.component} - ${alignment.iconClass} (${alignment.issues.length} issues)`);
      if (alignment.issues.length > 0) {
        alignment.issues.forEach(issue => console.log(`      ⚠️ ${issue}`));
      }
    });

    console.log('\n🏗️ Testing Complete Component Structure...');
    const componentStructure = await analyzer.extractComponentStructure('current');
    
    if (componentStructure) {
      console.log('✅ Successfully extracted complete component structure');
      console.log(`📊 KPI Grid: ${componentStructure.kpiGrid.tileCount} tiles`);
      console.log(`🏗️ Feature Panels: ${componentStructure.featurePanels.length} panels`);
      console.log(`🎨 Styling Tokens: ${componentStructure.stylingTokens.length} tokens`);
      console.log(`🎯 Icon Alignments: ${componentStructure.iconAlignments.length} alignments`);
    } else {
      console.log('❌ Failed to extract complete component structure');
    }

    // Show any errors
    const errors = analyzer.getErrors();
    if (errors.length > 0) {
      console.log(`\n⚠️ Encountered ${errors.length} errors:`);
      errors.forEach(error => {
        console.log(`   ${error.type}: ${error.path} - ${error.message}`);
      });
    } else {
      console.log('\n✅ No errors encountered');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testComponentStructureExtraction().catch(console.error);
}