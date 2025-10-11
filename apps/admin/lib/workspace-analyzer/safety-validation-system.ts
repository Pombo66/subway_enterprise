import { TypeScriptValidator, TypeScriptValidationResult } from './typescript-validator';
import { FeaturePreservationValidator, FeaturePreservationResult } from './feature-preservation-validator';
import { SafetyChecker, SafetyCheckResult } from './safety-checker';

export interface ComprehensiveSafetyResult {
  isValid: boolean;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  typeScriptValidation: TypeScriptValidationResult;
  featurePreservation: FeaturePreservationResult;
  safetyChecks: SafetyCheckResult;
  recommendations: string[];
  blockers: string[];
  warnings: string[];
  summary: SafetyValidationSummary;
}

export interface SafetyValidationSummary {
  totalFiles: number;
  validFiles: number;
  filesWithIssues: number;
  criticalIssues: number;
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  confidence: number;
  readyForDeployment: boolean;
}

export class SafetyValidationSystem {
  private typeScriptValidator: TypeScriptValidator;
  private featurePreservationValidator: FeaturePreservationValidator;
  private safetyChecker: SafetyChecker;

  constructor(private projectRoot: string) {
    this.typeScriptValidator = new TypeScriptValidator(projectRoot);
    this.featurePreservationValidator = new FeaturePreservationValidator(projectRoot);
    this.safetyChecker = new SafetyChecker(projectRoot);
  }

  /**
   * Initialize all validators
   */
  async initialize(): Promise<void> {
    await this.typeScriptValidator.initialize();
  }

  /**
   * Perform comprehensive safety validation on all modified files
   */
  async validateCodemodSafety(
    modifiedFiles: Map<string, string>,
    originalFiles: Map<string, string>
  ): Promise<ComprehensiveSafetyResult> {
    console.log('🔍 Starting comprehensive safety validation...');

    // Initialize result structure
    const result: ComprehensiveSafetyResult = {
      isValid: true,
      overallRiskLevel: 'low',
      typeScriptValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        missingImports: [],
        typeIssues: []
      },
      featurePreservation: {
        isValid: true,
        preservedFeatures: [],
        conflicts: [],
        dataFlowIssues: [],
        recommendations: []
      },
      safetyChecks: {
        isValid: true,
        violations: [],
        warnings: [],
        allowedChanges: [],
        summary: {
          totalFiles: modifiedFiles.size,
          violationCount: 0,
          warningCount: 0,
          allowedChangeCount: 0,
          riskLevel: 'low'
        }
      },
      recommendations: [],
      blockers: [],
      warnings: [],
      summary: {
        totalFiles: modifiedFiles.size,
        validFiles: 0,
        filesWithIssues: 0,
        criticalIssues: 0,
        highPriorityIssues: 0,
        mediumPriorityIssues: 0,
        confidence: 0,
        readyForDeployment: false
      }
    };

    try {
      // 1. TypeScript Validation
      console.log('📝 Running TypeScript validation...');
      result.typeScriptValidation = await this.runTypeScriptValidation(modifiedFiles);

      // 2. Feature Preservation Validation
      console.log('🛡️ Running feature preservation validation...');
      result.featurePreservation = await this.featurePreservationValidator.validateFeaturePreservation(
        modifiedFiles,
        originalFiles
      );

      // 3. Safety Checks
      console.log('🔒 Running safety checks...');
      result.safetyChecks = await this.safetyChecker.performSafetyChecks(
        modifiedFiles,
        originalFiles
      );

      // 4. Aggregate Results
      result.isValid = this.aggregateValidationResults(result);
      result.overallRiskLevel = this.calculateOverallRiskLevel(result);
      result.recommendations = this.generateRecommendations(result);
      result.blockers = this.identifyBlockers(result);
      result.warnings = this.aggregateWarnings(result);
      result.summary = this.generateSummary(result);

      console.log('✅ Comprehensive safety validation completed');

    } catch (error) {
      console.error('❌ Safety validation failed:', error);
      result.isValid = false;
      result.overallRiskLevel = 'critical';
      result.blockers.push(`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Run TypeScript validation on all modified files
   */
  private async runTypeScriptValidation(modifiedFiles: Map<string, string>): Promise<TypeScriptValidationResult> {
    const aggregatedResult: TypeScriptValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingImports: [],
      typeIssues: []
    };

    for (const [filePath, content] of modifiedFiles) {
      // Only validate TypeScript/JavaScript files
      if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;

      try {
        const fileResult = await this.typeScriptValidator.validateGeneratedCode(filePath, content);
        
        aggregatedResult.errors.push(...fileResult.errors);
        aggregatedResult.warnings.push(...fileResult.warnings);
        aggregatedResult.missingImports.push(...fileResult.missingImports);
        aggregatedResult.typeIssues.push(...fileResult.typeIssues);

        if (!fileResult.isValid) {
          aggregatedResult.isValid = false;
        }
      } catch (error) {
        aggregatedResult.errors.push({
          file: filePath,
          line: 1,
          column: 1,
          message: `TypeScript validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 0
        });
        aggregatedResult.isValid = false;
      }
    }

    return aggregatedResult;
  }

  /**
   * Aggregate validation results from all validators
   */
  private aggregateValidationResults(result: ComprehensiveSafetyResult): boolean {
    return result.typeScriptValidation.isValid &&
           result.featurePreservation.isValid &&
           result.safetyChecks.isValid;
  }

  /**
   * Calculate overall risk level based on all validation results
   */
  private calculateOverallRiskLevel(result: ComprehensiveSafetyResult): 'low' | 'medium' | 'high' | 'critical' {
    // Critical issues
    const criticalSafetyViolations = result.safetyChecks.violations.filter(v => v.severity === 'critical').length;
    const highSeverityConflicts = result.featurePreservation.conflicts.filter(c => c.severity === 'high').length;
    const typeScriptErrors = result.typeScriptValidation.errors.length;

    if (criticalSafetyViolations > 0 || typeScriptErrors > 0) {
      return 'critical';
    }

    // High risk issues
    const highSafetyViolations = result.safetyChecks.violations.filter(v => v.severity === 'high').length;
    const highImpactDataFlow = result.featurePreservation.dataFlowIssues.filter(d => d.impact === 'high').length;

    if (highSafetyViolations > 0 || highSeverityConflicts > 0 || highImpactDataFlow > 0) {
      return 'high';
    }

    // Medium risk issues
    const mediumSafetyViolations = result.safetyChecks.violations.filter(v => v.severity === 'medium').length;
    const mediumSeverityConflicts = result.featurePreservation.conflicts.filter(c => c.severity === 'medium').length;
    const typeIssues = result.typeScriptValidation.typeIssues.length;

    if (mediumSafetyViolations > 1 || mediumSeverityConflicts > 2 || typeIssues > 0) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateRecommendations(result: ComprehensiveSafetyResult): string[] {
    const recommendations: string[] = [];

    // TypeScript recommendations
    if (result.typeScriptValidation.missingImports.length > 0) {
      recommendations.push(`📦 Add missing imports: ${result.typeScriptValidation.missingImports.join(', ')}`);
    }

    if (result.typeScriptValidation.errors.length > 0) {
      recommendations.push(`🔧 Fix ${result.typeScriptValidation.errors.length} TypeScript errors before proceeding`);
    }

    // Feature preservation recommendations
    recommendations.push(...result.featurePreservation.recommendations);

    // Safety recommendations
    if (result.safetyChecks.violations.length > 0) {
      const criticalViolations = result.safetyChecks.violations.filter(v => v.severity === 'critical').length;
      if (criticalViolations > 0) {
        recommendations.push(`🚨 Resolve ${criticalViolations} critical safety violations immediately`);
      }
    }

    // Overall recommendations
    if (result.overallRiskLevel === 'low' && result.isValid) {
      recommendations.push('✅ Changes appear safe to apply. Consider running tests before deployment.');
    } else if (result.overallRiskLevel === 'medium') {
      recommendations.push('⚠️ Review all warnings and medium-priority issues before applying changes.');
    } else if (result.overallRiskLevel === 'high') {
      recommendations.push('🔍 Carefully review all high-priority issues. Consider applying changes incrementally.');
    } else {
      recommendations.push('❌ Do not apply changes until all critical issues are resolved.');
    }

    return recommendations;
  }

  /**
   * Identify blocking issues that prevent deployment
   */
  private identifyBlockers(result: ComprehensiveSafetyResult): string[] {
    const blockers: string[] = [];

    // TypeScript blockers
    result.typeScriptValidation.errors.forEach(error => {
      blockers.push(`TypeScript Error in ${error.file}:${error.line} - ${error.message}`);
    });

    // Critical safety violations
    result.safetyChecks.violations
      .filter(v => v.severity === 'critical')
      .forEach(violation => {
        blockers.push(`Critical Safety Violation in ${violation.file} - ${violation.description}`);
      });

    // High-severity feature conflicts
    result.featurePreservation.conflicts
      .filter(c => c.severity === 'high')
      .forEach(conflict => {
        blockers.push(`Feature Conflict in ${conflict.file} - ${conflict.conflict}`);
      });

    // High-impact data flow issues
    result.featurePreservation.dataFlowIssues
      .filter(d => d.impact === 'high')
      .forEach(issue => {
        blockers.push(`Data Flow Issue in ${issue.file} - ${issue.description}`);
      });

    return blockers;
  }

  /**
   * Aggregate warnings from all validators
   */
  private aggregateWarnings(result: ComprehensiveSafetyResult): string[] {
    const warnings: string[] = [];

    // TypeScript warnings
    result.typeScriptValidation.warnings.forEach(warning => {
      warnings.push(`TypeScript Warning in ${warning.file}:${warning.line} - ${warning.message}`);
    });

    // Safety warnings
    result.safetyChecks.warnings.forEach(warning => {
      warnings.push(`Safety Warning in ${warning.file} - ${warning.description}`);
    });

    // Medium-severity conflicts
    result.featurePreservation.conflicts
      .filter(c => c.severity === 'medium')
      .forEach(conflict => {
        warnings.push(`Feature Conflict in ${conflict.file} - ${conflict.conflict}`);
      });

    return warnings;
  }

  /**
   * Generate comprehensive summary
   */
  private generateSummary(result: ComprehensiveSafetyResult): SafetyValidationSummary {
    const totalFiles = result.summary.totalFiles;
    const filesWithTypeErrors = new Set(result.typeScriptValidation.errors.map(e => e.file)).size;
    const filesWithSafetyViolations = new Set(result.safetyChecks.violations.map(v => v.file)).size;
    const filesWithConflicts = new Set(result.featurePreservation.conflicts.map(c => c.file)).size;
    
    const filesWithIssues = new Set([
      ...result.typeScriptValidation.errors.map(e => e.file),
      ...result.safetyChecks.violations.map(v => v.file),
      ...result.featurePreservation.conflicts.map(c => c.file)
    ]).size;

    const validFiles = totalFiles - filesWithIssues;

    const criticalIssues = result.typeScriptValidation.errors.length +
                          result.safetyChecks.violations.filter(v => v.severity === 'critical').length +
                          result.featurePreservation.conflicts.filter(c => c.severity === 'high').length;

    const highPriorityIssues = result.safetyChecks.violations.filter(v => v.severity === 'high').length +
                              result.featurePreservation.dataFlowIssues.filter(d => d.impact === 'high').length;

    const mediumPriorityIssues = result.safetyChecks.violations.filter(v => v.severity === 'medium').length +
                                result.featurePreservation.conflicts.filter(c => c.severity === 'medium').length +
                                result.typeScriptValidation.typeIssues.length;

    // Calculate confidence based on issues and allowed changes
    const totalIssues = criticalIssues + highPriorityIssues + mediumPriorityIssues;
    const allowedChanges = result.safetyChecks.allowedChanges.length;
    const confidence = totalIssues === 0 ? 
      Math.min(0.95, 0.7 + (allowedChanges * 0.05)) : 
      Math.max(0.1, 0.8 - (totalIssues * 0.1));

    return {
      totalFiles,
      validFiles,
      filesWithIssues,
      criticalIssues,
      highPriorityIssues,
      mediumPriorityIssues,
      confidence,
      readyForDeployment: result.isValid && result.overallRiskLevel !== 'critical'
    };
  }

  /**
   * Validate data layer compatibility
   */
  async validateDataLayerCompatibility(generatedCode: string, existingDataLayer: string): Promise<{
    isCompatible: boolean;
    warnings: string[];
    missingProperties: string[];
  }> {
    const result = {
      isCompatible: true,
      warnings: [] as string[],
      missingProperties: [] as string[]
    };

    try {
      // Extract data bindings from generated code
      const dataBindingPattern = /kpis\.(\w+)/g;
      let match;
      const usedProperties = new Set<string>();
      
      while ((match = dataBindingPattern.exec(generatedCode)) !== null) {
        usedProperties.add(match[1]);
      }

      // Check if properties exist in data layer
      usedProperties.forEach(property => {
        if (existingDataLayer.includes(`${property}?:`)) {
          result.warnings.push(`${property} is optional in current data layer`);
        } else if (!existingDataLayer.includes(`${property}:`)) {
          result.missingProperties.push(property);
          result.isCompatible = false;
        }
      });

    } catch (error) {
      result.isCompatible = false;
      result.warnings.push(`Data layer validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate CSS compatibility
   */
  async validateCSSCompatibility(cssCode: string): Promise<{
    hasConflicts: boolean;
    warnings: string[];
    conflicts: string[];
  }> {
    const result = {
      hasConflicts: false,
      warnings: [] as string[],
      conflicts: [] as string[]
    };

    try {
      // Check for duplicate CSS custom properties
      const propertyPattern = /--([\w-]+):\s*([^;]+);/g;
      const properties = new Map<string, string[]>();
      let match;

      while ((match = propertyPattern.exec(cssCode)) !== null) {
        const [, property, value] = match;
        if (!properties.has(property)) {
          properties.set(property, []);
        }
        properties.get(property)!.push(value.trim());
      }

      // Check for conflicts
      properties.forEach((values, property) => {
        if (values.length > 1) {
          const uniqueValues = [...new Set(values)];
          if (uniqueValues.length > 1) {
            result.hasConflicts = true;
            result.conflicts.push(`Property --${property} has conflicting values: ${uniqueValues.join(', ')}`);
          }
        }
      });

    } catch (error) {
      result.hasConflicts = true;
      result.conflicts.push(`CSS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate accessibility compliance
   */
  async validateAccessibility(componentCode: string): Promise<{
    isAccessible: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const result = {
      isAccessible: true,
      violations: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // Check for basic accessibility attributes
      const hasRole = componentCode.includes('role=');
      const hasAriaLabel = componentCode.includes('aria-label=') || componentCode.includes('aria-labelledby=');
      const hasTabIndex = componentCode.includes('tabIndex=');

      if (!hasRole && componentCode.includes('<div') && componentCode.includes('onClick')) {
        result.violations.push('Interactive div elements should have role attribute');
        result.isAccessible = false;
      }

      if (!hasAriaLabel && (componentCode.includes('button') || componentCode.includes('role='))) {
        result.violations.push('Interactive elements should have accessible labels');
        result.isAccessible = false;
      }

      // Recommendations
      if (!hasTabIndex && componentCode.includes('onClick')) {
        result.recommendations.push('Consider adding tabIndex for keyboard navigation');
      }

      if (!componentCode.includes('alt=') && componentCode.includes('<img')) {
        result.violations.push('Images should have alt text');
        result.isAccessible = false;
      }

    } catch (error) {
      result.isAccessible = false;
      result.violations.push(`Accessibility validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate database safety
   */
  async validateDatabaseSafety(fileContent: string, fileName: string): Promise<{
    isDatabaseFile: boolean;
    allowedModifications: boolean;
    recommendation: string;
  }> {
    const result = {
      isDatabaseFile: false,
      allowedModifications: false,
      recommendation: ''
    };

    try {
      // Check if this is a database-related file
      const databaseIndicators = [
        'schema.prisma',
        'migration',
        '.sql',
        'model ',
        'generator ',
        'datasource '
      ];

      result.isDatabaseFile = databaseIndicators.some(indicator => 
        fileName.includes(indicator) || fileContent.includes(indicator)
      );

      if (result.isDatabaseFile) {
        result.allowedModifications = false;
        result.recommendation = 'Database schema files should not be modified by the regression audit system. These changes require manual review and proper migration procedures.';
      } else {
        result.allowedModifications = true;
        result.recommendation = 'File is safe to modify as it does not contain database schema definitions.';
      }

    } catch (error) {
      result.isDatabaseFile = true; // Err on the side of caution
      result.allowedModifications = false;
      result.recommendation = `Database safety validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  }

  /**
   * Validate API route safety
   */
  async validateAPIRouteSafety(fileContent: string, fileName: string): Promise<{
    isAPIRoute: boolean;
    allowedModifications: boolean;
    recommendation: string;
  }> {
    const result = {
      isAPIRoute: false,
      allowedModifications: false,
      recommendation: ''
    };

    try {
      // Check if this is an API route file
      const apiIndicators = [
        '/api/',
        'route.ts',
        'route.js',
        'export async function GET',
        'export async function POST',
        'NextRequest',
        'NextResponse'
      ];

      result.isAPIRoute = apiIndicators.some(indicator => 
        fileName.includes(indicator) || fileContent.includes(indicator)
      );

      if (result.isAPIRoute) {
        result.allowedModifications = false;
        result.recommendation = 'API route files should not be modified by the regression audit system. These changes could affect backend functionality and require careful review.';
      } else {
        result.allowedModifications = true;
        result.recommendation = 'File is safe to modify as it does not contain API route definitions.';
      }

    } catch (error) {
      result.isAPIRoute = true; // Err on the side of caution
      result.allowedModifications = false;
      result.recommendation = `API route safety validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  }

  /**
   * Validate navigation safety
   */
  async validateNavigationSafety(fileContent: string, fileName: string): Promise<{
    isNavigationFile: boolean;
    allowedModifications: boolean;
    recommendation: string;
  }> {
    const result = {
      isNavigationFile: false,
      allowedModifications: false,
      recommendation: ''
    };

    try {
      // Check if this is a navigation-related file
      const navigationIndicators = [
        'navigation',
        'router',
        'routes',
        'useRouter',
        'Link',
        'redirect',
        'pathname'
      ];

      result.isNavigationFile = navigationIndicators.some(indicator => 
        fileName.includes(indicator) || fileContent.includes(indicator)
      );

      if (result.isNavigationFile) {
        result.allowedModifications = false;
        result.recommendation = 'Navigation files should not be modified by the regression audit system. These changes could affect application routing and user experience.';
      } else {
        result.allowedModifications = true;
        result.recommendation = 'File is safe to modify as it does not contain navigation logic.';
      }

    } catch (error) {
      result.isNavigationFile = true; // Err on the side of caution
      result.allowedModifications = false;
      result.recommendation = `Navigation safety validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  }

  /**
   * Validate feature preservation
   */
  async validateFeaturePreservation(componentCode: string): Promise<{
    kiroFeaturesDetected: string[];
    preservationStatus: 'safe' | 'warning' | 'unsafe';
    conflicts: string[];
  }> {
    const result = {
      kiroFeaturesDetected: [] as string[],
      preservationStatus: 'safe' as 'safe' | 'warning' | 'unsafe',
      conflicts: [] as string[]
    };

    try {
      // Detect Kiro-era features
      const kiroFeatures = [
        'useTelemetry',
        'TelemetryPanel',
        'useAnalytics',
        'AnalyticsProvider',
        'trackEvent',
        'logMetric'
      ];

      kiroFeatures.forEach(feature => {
        if (componentCode.includes(feature)) {
          result.kiroFeaturesDetected.push(feature);
        }
      });

      // Check for potential conflicts
      if (result.kiroFeaturesDetected.length > 0) {
        // Look for patterns that might interfere with telemetry
        const conflictPatterns = [
          'telemetry',
          'analytics',
          'tracking',
          'metrics'
        ];

        conflictPatterns.forEach(pattern => {
          if (componentCode.toLowerCase().includes(pattern) && 
              !result.kiroFeaturesDetected.some(feature => feature.toLowerCase().includes(pattern))) {
            result.conflicts.push(`Potential conflict with ${pattern} functionality`);
          }
        });

        if (result.conflicts.length > 0) {
          result.preservationStatus = 'warning';
        }
      }

    } catch (error) {
      result.preservationStatus = 'unsafe';
      result.conflicts.push(`Feature preservation validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Generate comprehensive safety report
   */
  generateComprehensiveReport(result: ComprehensiveSafetyResult): string {
    const report = [];
    
    report.push('# Comprehensive Safety Validation Report\n');
    
    // Executive Summary
    report.push('## Executive Summary');
    report.push(`- **Overall Status**: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
    report.push(`- **Risk Level**: ${result.overallRiskLevel.toUpperCase()}`);
    report.push(`- **Confidence**: ${Math.round(result.summary.confidence * 100)}%`);
    report.push(`- **Ready for Deployment**: ${result.summary.readyForDeployment ? '✅ YES' : '❌ NO'}`);
    report.push(`- **Files Processed**: ${result.summary.totalFiles}`);
    report.push(`- **Files with Issues**: ${result.summary.filesWithIssues}`);
    report.push('');

    // Issue Summary
    report.push('## Issue Summary');
    report.push(`- **Critical Issues**: ${result.summary.criticalIssues}`);
    report.push(`- **High Priority Issues**: ${result.summary.highPriorityIssues}`);
    report.push(`- **Medium Priority Issues**: ${result.summary.mediumPriorityIssues}`);
    report.push('');

    // Blockers
    if (result.blockers.length > 0) {
      report.push('## 🚨 Blocking Issues');
      result.blockers.forEach(blocker => {
        report.push(`- ${blocker}`);
      });
      report.push('');
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      report.push('## 📋 Recommendations');
      result.recommendations.forEach(rec => {
        report.push(`- ${rec}`);
      });
      report.push('');
    }

    // Detailed Results
    report.push('## Detailed Validation Results\n');

    // TypeScript Validation
    report.push('### TypeScript Validation');
    report.push(`**Status**: ${result.typeScriptValidation.isValid ? '✅ PASS' : '❌ FAIL'}`);
    if (result.typeScriptValidation.errors.length > 0) {
      report.push('**Errors**:');
      result.typeScriptValidation.errors.forEach(error => {
        report.push(`- ${error.file}:${error.line} - ${error.message}`);
      });
    }
    if (result.typeScriptValidation.missingImports.length > 0) {
      report.push('**Missing Imports**:');
      result.typeScriptValidation.missingImports.forEach(imp => {
        report.push(`- ${imp}`);
      });
    }
    report.push('');

    // Feature Preservation
    report.push('### Feature Preservation');
    report.push(`**Status**: ${result.featurePreservation.isValid ? '✅ PASS' : '❌ FAIL'}`);
    report.push(`**Preserved Features**: ${result.featurePreservation.preservedFeatures.length}`);
    if (result.featurePreservation.conflicts.length > 0) {
      report.push('**Conflicts**:');
      result.featurePreservation.conflicts.forEach(conflict => {
        report.push(`- ${conflict.severity.toUpperCase()}: ${conflict.file} - ${conflict.conflict}`);
      });
    }
    report.push('');

    // Safety Checks
    report.push('### Safety Checks');
    report.push(`**Status**: ${result.safetyChecks.isValid ? '✅ PASS' : '❌ FAIL'}`);
    report.push(`**Risk Level**: ${result.safetyChecks.summary.riskLevel.toUpperCase()}`);
    if (result.safetyChecks.violations.length > 0) {
      report.push('**Violations**:');
      result.safetyChecks.violations.forEach(violation => {
        report.push(`- ${violation.severity.toUpperCase()}: ${violation.file} - ${violation.description}`);
      });
    }
    if (result.safetyChecks.allowedChanges.length > 0) {
      report.push('**Allowed Changes**:');
      result.safetyChecks.allowedChanges.forEach(change => {
        report.push(`- ${change.file}: ${change.description} (${Math.round(change.confidence * 100)}% confidence)`);
      });
    }
    
    return report.join('\n');
  }
}