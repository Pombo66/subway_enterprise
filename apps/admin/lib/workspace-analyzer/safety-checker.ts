import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

export interface SafetyCheckResult {
  isValid: boolean;
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
  allowedChanges: AllowedChange[];
  summary: SafetySummary;
}

export interface SafetyViolation {
  type: 'database-schema' | 'api-route' | 'navigation' | 'backend-logic' | 'config-change';
  file: string;
  line: number;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  suggestion: string;
}

export interface SafetyWarning {
  type: 'potential-risk' | 'review-needed' | 'best-practice';
  file: string;
  line: number;
  description: string;
  recommendation: string;
}

export interface AllowedChange {
  type: 'frontend-styling' | 'component-structure' | 'ui-enhancement';
  file: string;
  description: string;
  confidence: number;
}

export interface SafetySummary {
  totalFiles: number;
  violationCount: number;
  warningCount: number;
  allowedChangeCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class SafetyChecker {
  private databaseFiles = [
    'schema.prisma',
    'migration.sql',
    'seed.mjs',
    'seed.ts',
    'seed.js'
  ];

  private routePatterns = [
    /\/api\//,
    /router\./,
    /Route\s*=/,
    /useRouter\s*\(/,
    /redirect\s*\(/,
    /navigate\s*\(/
  ];

  private backendPatterns = [
    /\.controller\./,
    /\.service\./,
    /\.repository\./,
    /\.entity\./,
    /\.dto\./,
    /express\./,
    /nestjs/i,
    /fastify/i
  ];

  private configFiles = [
    'next.config.js',
    'next.config.ts',
    'tailwind.config.js',
    'tailwind.config.ts',
    'package.json',
    'tsconfig.json',
    'eslint.config.js',
    '.env',
    '.env.local'
  ];

  constructor(private projectRoot: string) {}

  /**
   * Perform comprehensive safety checks on modified files
   */
  async performSafetyChecks(
    modifiedFiles: Map<string, string>,
    originalFiles: Map<string, string>
  ): Promise<SafetyCheckResult> {
    const result: SafetyCheckResult = {
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
    };

    // Check each modified file
    for (const [filePath, newContent] of modifiedFiles) {
      const originalContent = originalFiles.get(filePath) || '';
      
      // Database schema checks
      const dbViolations = await this.checkDatabaseModifications(filePath, originalContent, newContent);
      result.violations.push(...dbViolations);

      // API route checks
      const routeViolations = await this.checkRouteModifications(filePath, originalContent, newContent);
      result.violations.push(...routeViolations);

      // Navigation checks
      const navViolations = await this.checkNavigationModifications(filePath, originalContent, newContent);
      result.violations.push(...navViolations);

      // Backend logic checks
      const backendViolations = await this.checkBackendModifications(filePath, originalContent, newContent);
      result.violations.push(...backendViolations);

      // Configuration checks
      const configViolations = await this.checkConfigurationModifications(filePath, originalContent, newContent);
      result.violations.push(...configViolations);

      // Identify allowed changes
      const allowedChanges = await this.identifyAllowedChanges(filePath, originalContent, newContent);
      result.allowedChanges.push(...allowedChanges);

      // Generate warnings
      const warnings = await this.generateWarnings(filePath, originalContent, newContent);
      result.warnings.push(...warnings);
    }

    // Update summary
    result.summary.violationCount = result.violations.length;
    result.summary.warningCount = result.warnings.length;
    result.summary.allowedChangeCount = result.allowedChanges.length;
    result.summary.riskLevel = this.calculateRiskLevel(result.violations);
    result.isValid = result.violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;

    return result;
  }

  /**
   * Check for database schema modifications
   */
  async checkDatabaseModifications(filePath: string, original: string, modified: string): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    
    // Check if it's a database-related file
    const fileName = filePath.split('/').pop() || '';
    const isDatabaseFile = this.databaseFiles.some(dbFile => fileName.includes(dbFile));
    
    if (isDatabaseFile) {
      violations.push({
        type: 'database-schema',
        file: filePath,
        line: 1,
        description: 'Database schema file modification detected',
        severity: 'critical',
        suggestion: 'Database modifications are out of scope. Only frontend changes are allowed.'
      });
    }

    // Check for Prisma schema modifications in any file
    const prismaPatterns = [
      /model\s+\w+\s*{/,
      /@@map\s*\(/,
      /@@index\s*\(/,
      /@@unique\s*\(/,
      /generator\s+/,
      /datasource\s+/
    ];

    prismaPatterns.forEach(pattern => {
      if (pattern.test(modified) && !pattern.test(original)) {
        const match = modified.match(pattern);
        if (match) {
          const line = this.getLineNumber(modified, modified.indexOf(match[0]));
          violations.push({
            type: 'database-schema',
            file: filePath,
            line,
            description: `Prisma schema modification detected: ${match[0]}`,
            severity: 'critical',
            suggestion: 'Remove database schema changes. Focus only on frontend improvements.'
          });
        }
      }
    });

    // Check for SQL modifications
    const sqlPatterns = [
      /CREATE\s+TABLE/i,
      /ALTER\s+TABLE/i,
      /DROP\s+TABLE/i,
      /CREATE\s+INDEX/i,
      /DROP\s+INDEX/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /DELETE\s+FROM/i
    ];

    sqlPatterns.forEach(pattern => {
      if (pattern.test(modified) && !pattern.test(original)) {
        const match = modified.match(pattern);
        if (match) {
          const line = this.getLineNumber(modified, modified.indexOf(match[0]));
          violations.push({
            type: 'database-schema',
            file: filePath,
            line,
            description: `SQL modification detected: ${match[0]}`,
            severity: 'critical',
            suggestion: 'Remove SQL modifications. Database changes are not allowed.'
          });
        }
      }
    });

    return violations;
  }

  /**
   * Check for API route modifications
   */
  async checkRouteModifications(filePath: string, original: string, modified: string): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    
    // Check if it's an API route file
    const isAPIRoute = filePath.includes('/api/') || filePath.includes('route.ts') || filePath.includes('route.js');
    
    if (isAPIRoute && original !== modified) {
      violations.push({
        type: 'api-route',
        file: filePath,
        line: 1,
        description: 'API route file modification detected',
        severity: 'high',
        suggestion: 'API route changes are out of scope. Only frontend modifications are allowed.'
      });
    }

    // Check for new API endpoint definitions
    const apiPatterns = [
      /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/,
      /app\.(get|post|put|delete|patch)\s*\(/,
      /router\.(get|post|put|delete|patch)\s*\(/,
      /@(Get|Post|Put|Delete|Patch)\s*\(/
    ];

    apiPatterns.forEach(pattern => {
      const originalMatches = original.match(new RegExp(pattern.source, 'g')) || [];
      const modifiedMatches = modified.match(new RegExp(pattern.source, 'g')) || [];
      
      if (modifiedMatches.length > originalMatches.length) {
        const newMatch = modifiedMatches[originalMatches.length];
        const line = this.getLineNumber(modified, modified.indexOf(newMatch));
        violations.push({
          type: 'api-route',
          file: filePath,
          line,
          description: `New API endpoint detected: ${newMatch}`,
          severity: 'high',
          suggestion: 'Remove new API endpoints. Only frontend changes are allowed.'
        });
      }
    });

    return violations;
  }

  /**
   * Check for navigation modifications
   */
  async checkNavigationModifications(filePath: string, original: string, modified: string): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    
    // Check for routing changes
    const routingPatterns = [
      /useRouter\s*\(\s*\)/,
      /router\.push\s*\(/,
      /router\.replace\s*\(/,
      /redirect\s*\(/,
      /notFound\s*\(\s*\)/,
      /permanentRedirect\s*\(/
    ];

    routingPatterns.forEach(pattern => {
      const originalMatches = original.match(new RegExp(pattern.source, 'g')) || [];
      const modifiedMatches = modified.match(new RegExp(pattern.source, 'g')) || [];
      
      if (modifiedMatches.length > originalMatches.length) {
        const newMatch = modifiedMatches[originalMatches.length];
        const line = this.getLineNumber(modified, modified.indexOf(newMatch));
        violations.push({
          type: 'navigation',
          file: filePath,
          line,
          description: `New navigation logic detected: ${newMatch}`,
          severity: 'medium',
          suggestion: 'Avoid adding new navigation logic. Focus on visual improvements only.'
        });
      }
    });

    // Check for new route definitions
    const routeDefinitionPatterns = [
      /path\s*:\s*['"`][^'"`]+['"`]/,
      /route\s*:\s*['"`][^'"`]+['"`]/,
      /<Route\s+path=/,
      /createBrowserRouter\s*\(/
    ];

    routeDefinitionPatterns.forEach(pattern => {
      if (pattern.test(modified) && !pattern.test(original)) {
        const match = modified.match(pattern);
        if (match) {
          const line = this.getLineNumber(modified, modified.indexOf(match[0]));
          violations.push({
            type: 'navigation',
            file: filePath,
            line,
            description: `New route definition detected: ${match[0]}`,
            severity: 'high',
            suggestion: 'Remove new route definitions. Navigation changes are not allowed.'
          });
        }
      }
    });

    return violations;
  }

  /**
   * Check for backend logic modifications
   */
  async checkBackendModifications(filePath: string, original: string, modified: string): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    
    // Check if it's a backend file
    const isBackendFile = this.backendPatterns.some(pattern => 
      pattern.test(filePath) || pattern.test(modified)
    );
    
    if (isBackendFile && original !== modified) {
      violations.push({
        type: 'backend-logic',
        file: filePath,
        line: 1,
        description: 'Backend logic modification detected',
        severity: 'high',
        suggestion: 'Backend modifications are out of scope. Focus only on frontend changes.'
      });
    }

    // Check for server-side logic patterns
    const serverPatterns = [
      /export\s+async\s+function\s+\w+\s*\([^)]*req/i,
      /NextRequest/,
      /NextResponse/,
      /cookies\(\)\.set/,
      /headers\(\)\.set/,
      /revalidatePath\s*\(/,
      /revalidateTag\s*\(/
    ];

    serverPatterns.forEach(pattern => {
      if (pattern.test(modified) && !pattern.test(original)) {
        const match = modified.match(pattern);
        if (match) {
          const line = this.getLineNumber(modified, modified.indexOf(match[0]));
          violations.push({
            type: 'backend-logic',
            file: filePath,
            line,
            description: `Server-side logic detected: ${match[0]}`,
            severity: 'high',
            suggestion: 'Remove server-side logic. Only client-side frontend changes are allowed.'
          });
        }
      }
    });

    return violations;
  }

  /**
   * Check for configuration modifications
   */
  async checkConfigurationModifications(filePath: string, original: string, modified: string): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    
    const fileName = filePath.split('/').pop() || '';
    const isConfigFile = this.configFiles.some(configFile => fileName === configFile);
    
    if (isConfigFile && original !== modified) {
      // Allow certain safe config changes
      const safeConfigChanges = [
        /\/\*.*?\*\//s, // Comments
        /\/\/.*$/gm,    // Single line comments
        /\s+/g          // Whitespace changes
      ];
      
      let normalizedOriginal = original;
      let normalizedModified = modified;
      
      safeConfigChanges.forEach(pattern => {
        normalizedOriginal = normalizedOriginal.replace(pattern, '');
        normalizedModified = normalizedModified.replace(pattern, '');
      });
      
      if (normalizedOriginal !== normalizedModified) {
        violations.push({
          type: 'config-change',
          file: filePath,
          line: 1,
          description: `Configuration file modification detected: ${fileName}`,
          severity: 'medium',
          suggestion: 'Configuration changes should be minimal and reviewed carefully.'
        });
      }
    }

    return violations;
  }

  /**
   * Identify allowed frontend changes
   */
  async identifyAllowedChanges(filePath: string, original: string, modified: string): Promise<AllowedChange[]> {
    const allowedChanges: AllowedChange[] = [];
    
    // Frontend file extensions
    const frontendExtensions = ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss', '.module.css'];
    const isFrontendFile = frontendExtensions.some(ext => filePath.endsWith(ext));
    
    if (!isFrontendFile) return allowedChanges;

    // CSS/Styling changes
    const stylingPatterns = [
      /className\s*=\s*['"`][^'"`]*['"`]/g,
      /style\s*=\s*\{[^}]*\}/g,
      /s-\w+/g, // Custom styling tokens
      /grid-cols-\d+/g,
      /gap-\d+/g,
      /p-\d+/g,
      /m-\d+/g
    ];

    stylingPatterns.forEach(pattern => {
      const originalMatches = original.match(pattern) || [];
      const modifiedMatches = modified.match(pattern) || [];
      
      if (modifiedMatches.length > originalMatches.length) {
        allowedChanges.push({
          type: 'frontend-styling',
          file: filePath,
          description: `Styling improvements detected (${modifiedMatches.length - originalMatches.length} new classes)`,
          confidence: 0.9
        });
      }
    });

    // Component structure improvements
    const componentPatterns = [
      /<div[^>]*className=['"`][^'"`]*s-card[^'"`]*['"`]/g,
      /<div[^>]*className=['"`][^'"`]*s-blob[^'"`]*['"`]/g,
      /<div[^>]*className=['"`][^'"`]*s-k[^'"`]*['"`]/g,
      /<div[^>]*className=['"`][^'"`]*s-v[^'"`]*['"`]/g
    ];

    componentPatterns.forEach(pattern => {
      const originalMatches = original.match(pattern) || [];
      const modifiedMatches = modified.match(pattern) || [];
      
      if (modifiedMatches.length > originalMatches.length) {
        allowedChanges.push({
          type: 'component-structure',
          file: filePath,
          description: `Component structure improvements (${modifiedMatches.length - originalMatches.length} new elements)`,
          confidence: 0.85
        });
      }
    });

    // UI enhancements
    if (modified.includes('KPI') && !original.includes('KPI')) {
      allowedChanges.push({
        type: 'ui-enhancement',
        file: filePath,
        description: 'KPI tile restoration detected',
        confidence: 0.95
      });
    }

    return allowedChanges;
  }

  /**
   * Generate safety warnings
   */
  async generateWarnings(filePath: string, original: string, modified: string): Promise<SafetyWarning[]> {
    const warnings: SafetyWarning[] = [];
    
    // Large file changes
    const originalLines = original.split('\n').length;
    const modifiedLines = modified.split('\n').length;
    const changeRatio = Math.abs(modifiedLines - originalLines) / Math.max(originalLines, 1);
    
    if (changeRatio > 0.5) {
      warnings.push({
        type: 'review-needed',
        file: filePath,
        line: 1,
        description: `Large file change detected (${Math.round(changeRatio * 100)}% change)`,
        recommendation: 'Review changes carefully to ensure no unintended modifications'
      });
    }

    // Potential data binding changes
    const dataBindingPatterns = [
      /\{[^}]*\w+\.[^}]*\}/g,
      /props\.\w+/g,
      /useState\s*\(/g,
      /useEffect\s*\(/g
    ];

    dataBindingPatterns.forEach(pattern => {
      const originalMatches = original.match(pattern) || [];
      const modifiedMatches = modified.match(pattern) || [];
      
      if (modifiedMatches.length !== originalMatches.length) {
        warnings.push({
          type: 'potential-risk',
          file: filePath,
          line: 1,
          description: 'Data binding changes detected',
          recommendation: 'Verify that data flows remain intact and no functionality is broken'
        });
      }
    });

    // Import changes
    const importPattern = /import\s+.*?from\s+['"`][^'"`]+['"`]/g;
    const originalImports = original.match(importPattern) || [];
    const modifiedImports = modified.match(importPattern) || [];
    
    if (modifiedImports.length > originalImports.length) {
      warnings.push({
        type: 'review-needed',
        file: filePath,
        line: 1,
        description: `New imports added (${modifiedImports.length - originalImports.length})`,
        recommendation: 'Verify that all new imports are necessary and correctly used'
      });
    }

    return warnings;
  }

  private calculateRiskLevel(violations: SafetyViolation[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || mediumCount > 3) return 'medium';
    return 'low';
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Generate safety report
   */
  generateSafetyReport(result: SafetyCheckResult): string {
    const report = [];
    
    report.push('# Safety Check Report\n');
    
    // Summary
    report.push('## Summary');
    report.push(`- **Risk Level**: ${result.summary.riskLevel.toUpperCase()}`);
    report.push(`- **Total Files**: ${result.summary.totalFiles}`);
    report.push(`- **Violations**: ${result.summary.violationCount}`);
    report.push(`- **Warnings**: ${result.summary.warningCount}`);
    report.push(`- **Allowed Changes**: ${result.summary.allowedChangeCount}`);
    report.push(`- **Overall Status**: ${result.isValid ? '✅ SAFE' : '❌ UNSAFE'}\n`);
    
    // Violations
    if (result.violations.length > 0) {
      report.push('## 🚨 Safety Violations');
      result.violations.forEach(violation => {
        report.push(`### ${violation.severity.toUpperCase()}: ${violation.type}`);
        report.push(`**File**: ${violation.file}:${violation.line}`);
        report.push(`**Issue**: ${violation.description}`);
        report.push(`**Solution**: ${violation.suggestion}\n`);
      });
    }
    
    // Warnings
    if (result.warnings.length > 0) {
      report.push('## ⚠️ Warnings');
      result.warnings.forEach(warning => {
        report.push(`### ${warning.type}: ${warning.file}`);
        report.push(`**Description**: ${warning.description}`);
        report.push(`**Recommendation**: ${warning.recommendation}\n`);
      });
    }
    
    // Allowed Changes
    if (result.allowedChanges.length > 0) {
      report.push('## ✅ Allowed Changes');
      result.allowedChanges.forEach(change => {
        report.push(`### ${change.type}: ${change.file}`);
        report.push(`**Description**: ${change.description}`);
        report.push(`**Confidence**: ${Math.round(change.confidence * 100)}%\n`);
      });
    }
    
    return report.join('\n');
  }
}