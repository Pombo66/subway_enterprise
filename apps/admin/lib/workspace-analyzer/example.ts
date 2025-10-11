/**
 * Example usage of the WorkspaceAnalyzer
 * This demonstrates how to use the workspace analysis infrastructure
 */

import { WorkspaceAnalyzer } from './workspace-analyzer';
import { DEFAULT_WORKSPACE_CONFIG, validateWorkspaceConfig } from './config';
import { formatAnalysisError, groupErrorsByType } from './utils';

/**
 * Example: Basic workspace analysis
 */
export async function exampleBasicAnalysis() {
  // Validate configuration
  const configErrors = validateWorkspaceConfig(DEFAULT_WORKSPACE_CONFIG);
  if (configErrors.length > 0) {
    console.error('Configuration errors:', configErrors);
    return;
  }

  // Create analyzer instance
  const analyzer = new WorkspaceAnalyzer(DEFAULT_WORKSPACE_CONFIG);

  try {
    // Analyze both workspaces
    console.log('Analyzing old baseline workspace...');
    const oldAnalysis = await analyzer.analyzeWorkspace('old');
    
    console.log('Analyzing current workspace...');
    const currentAnalysis = await analyzer.analyzeWorkspace('current');

    // Report results
    console.log('\n=== Analysis Results ===');
    console.log(`Old workspace: ${oldAnalysis.files.length} files, ${oldAnalysis.components.length} components`);
    console.log(`Current workspace: ${currentAnalysis.files.length} files, ${currentAnalysis.components.length} components`);

    // Report errors if any
    const allErrors = [...oldAnalysis.errors, ...currentAnalysis.errors];
    if (allErrors.length > 0) {
      console.log('\n=== Errors Encountered ===');
      const groupedErrors = groupErrorsByType(allErrors);
      
      Object.entries(groupedErrors).forEach(([type, errors]) => {
        console.log(`\n${type.toUpperCase()} (${errors.length}):`);
        errors.slice(0, 5).forEach(error => {
          console.log(`  ${formatAnalysisError(error)}`);
        });
        if (errors.length > 5) {
          console.log(`  ... and ${errors.length - 5} more`);
        }
      });
    }

    return { oldAnalysis, currentAnalysis };
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * Example: Reading specific files
 */
export async function exampleFileReading() {
  const analyzer = new WorkspaceAnalyzer(DEFAULT_WORKSPACE_CONFIG);

  try {
    // Read specific files from both workspaces
    const oldDashboard = await analyzer.readOldBaseline('app/dashboard/page.tsx');
    const currentDashboard = await analyzer.readCurrentState('app/dashboard/page.tsx');

    console.log('Old dashboard exists:', !!oldDashboard);
    console.log('Current dashboard exists:', !!currentDashboard);

    if (oldDashboard && currentDashboard) {
      console.log('File size comparison:');
      console.log(`  Old: ${oldDashboard.size} bytes`);
      console.log(`  Current: ${currentDashboard.size} bytes`);
    }

    return { oldDashboard, currentDashboard };
  } catch (error) {
    console.error('File reading failed:', error);
    throw error;
  }
}

/**
 * Example: Component analysis
 */
export async function exampleComponentAnalysis() {
  const analyzer = new WorkspaceAnalyzer(DEFAULT_WORKSPACE_CONFIG);

  try {
    // Get components from both workspaces
    const oldComponents = await analyzer.listComponents('old');
    const currentComponents = await analyzer.listComponents('current');

    console.log('\n=== Component Analysis ===');
    console.log(`Old workspace components: ${oldComponents.length}`);
    console.log(`Current workspace components: ${currentComponents.length}`);

    // Find components that exist in old but not in current
    const oldComponentNames = new Set(oldComponents.map(c => c.name));
    const currentComponentNames = new Set(currentComponents.map(c => c.name));
    
    const missingComponents = oldComponents.filter(c => !currentComponentNames.has(c.name));
    const newComponents = currentComponents.filter(c => !oldComponentNames.has(c.name));

    if (missingComponents.length > 0) {
      console.log('\nComponents missing in current:');
      missingComponents.slice(0, 10).forEach(comp => {
        console.log(`  - ${comp.name} (${comp.type})`);
      });
    }

    if (newComponents.length > 0) {
      console.log('\nNew components in current:');
      newComponents.slice(0, 10).forEach(comp => {
        console.log(`  + ${comp.name} (${comp.type})`);
      });
    }

    return { oldComponents, currentComponents, missingComponents, newComponents };
  } catch (error) {
    console.error('Component analysis failed:', error);
    throw error;
  }
}

/**
 * Example: Style token extraction
 */
export async function exampleStyleAnalysis() {
  const analyzer = new WorkspaceAnalyzer(DEFAULT_WORKSPACE_CONFIG);

  try {
    // Extract style tokens from both workspaces
    const oldTokens = await analyzer.extractStyleTokens('old');
    const currentTokens = await analyzer.extractStyleTokens('current');

    console.log('\n=== Style Token Analysis ===');
    console.log(`Old CSS custom properties: ${Object.keys(oldTokens.customProperties).length}`);
    console.log(`Current CSS custom properties: ${Object.keys(currentTokens.customProperties).length}`);
    
    console.log(`Old CSS classes: ${oldTokens.classNames.length}`);
    console.log(`Current CSS classes: ${currentTokens.classNames.length}`);
    
    console.log(`Old Tailwind classes: ${oldTokens.tailwindClasses.length}`);
    console.log(`Current Tailwind classes: ${currentTokens.tailwindClasses.length}`);

    // Find missing custom properties
    const oldProps = new Set(Object.keys(oldTokens.customProperties));
    const currentProps = new Set(Object.keys(currentTokens.customProperties));
    
    const missingProps = Array.from(oldProps).filter(prop => !currentProps.has(prop));
    const newProps = Array.from(currentProps).filter(prop => !oldProps.has(prop));

    if (missingProps.length > 0) {
      console.log('\nMissing CSS custom properties:');
      missingProps.slice(0, 10).forEach(prop => {
        console.log(`  - ${prop}: ${oldTokens.customProperties[prop]}`);
      });
    }

    if (newProps.length > 0) {
      console.log('\nNew CSS custom properties:');
      newProps.slice(0, 10).forEach(prop => {
        console.log(`  + ${prop}: ${currentTokens.customProperties[prop]}`);
      });
    }

    return { oldTokens, currentTokens, missingProps, newProps };
  } catch (error) {
    console.error('Style analysis failed:', error);
    throw error;
  }
}

// Export all examples for easy testing
export const examples = {
  basicAnalysis: exampleBasicAnalysis,
  fileReading: exampleFileReading,
  componentAnalysis: exampleComponentAnalysis,
  styleAnalysis: exampleStyleAnalysis
};