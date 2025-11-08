import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { promisify } from 'util';
import {
  IExpansionSystemAuditor,
  CodebaseAnalysis,
  ServiceInventory,
  DependencyGraph,
  SimplificationReport,
  ExpansionService,
  ServiceType,
  ServiceMethod,
  DuplicatePattern,
  UnusedCodeBlock,
  ComplexityMetric,
  ServiceDuplicate,
  FunctionalityOverlap,
  ConsolidationOpportunity,
  ServiceNode,
  ServiceDependency,
  CircularDependency,
  UnusedDependency,
  MigrationStep,
  CodeOccurrence,
  MethodOverlap
} from '../interfaces/expansion-system-auditor.interface';

const readFileAsync = promisify(fs.readFile);

/**
 * Expansion System Auditor Service
 * Provides comprehensive analysis of expansion-related code across the codebase
 */
export class ExpansionSystemAuditorService implements IExpansionSystemAuditor {
  private readonly workspaceRoot: string;
  private readonly expansionPatterns = [
    '**/expansion*.ts',
    '**/openai*.service.ts',
    '**/market*.service.ts',
    '**/location*.service.ts',
    '**/strategic*.service.ts',
    '**/rationale*.service.ts',
    '**/ai/*.service.ts'
  ];

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  async scanCodebase(): Promise<CodebaseAnalysis> {
    console.log('🔍 Scanning codebase for expansion-related files...');
    
    const expansionFiles = await this.findExpansionFiles();
    const duplicates = await this.detectDuplicateLogic(expansionFiles);
    const unused = await this.findUnusedCode(expansionFiles);
    const complexity = await this.analyzeComplexity(expansionFiles);

    return {
      totalFiles: expansionFiles.length,
      expansionRelatedFiles: expansionFiles,
      duplicateLogic: duplicates,
      unusedCode: unused,
      complexityMetrics: complexity
    };
  }

  async identifyExpansionServices(): Promise<ServiceInventory> {
    console.log('📋 Identifying expansion services...');
    
    const files = await this.findExpansionFiles();
    const services = await this.parseServices(files);
    const duplicates = await this.findDuplicateServices(services);
    const overlaps = await this.findOverlappingFunctionality(services);
    const opportunities = await this.identifyConsolidationOpportunities(services, duplicates, overlaps);

    return {
      services,
      duplicateServices: duplicates,
      overlappingFunctionality: overlaps,
      consolidationOpportunities: opportunities
    };
  }

  async analyzeServiceDependencies(): Promise<DependencyGraph> {
    console.log('🔗 Analyzing service dependencies...');
    
    const files = await this.findExpansionFiles();
    const nodes = await this.buildServiceNodes(files);
    const edges = await this.buildDependencyEdges(files);
    const circular = this.detectCircularDependencies(nodes, edges);
    const unused = this.detectUnusedDependencies(nodes, edges);

    return {
      nodes,
      edges,
      circularDependencies: circular,
      unusedDependencies: unused
    };
  }

  async generateSimplificationReport(): Promise<SimplificationReport> {
    console.log('📊 Generating simplification report...');
    
    const codebaseAnalysis = await this.scanCodebase();
    const serviceInventory = await this.identifyExpansionServices();
    const dependencyGraph = await this.analyzeServiceDependencies();

    const migrationStrategy = this.createMigrationStrategy(
      serviceInventory.consolidationOpportunities
    );

    return {
      summary: {
        totalFilesAnalyzed: codebaseAnalysis.totalFiles,
        duplicateServicesFound: serviceInventory.duplicateServices.length,
        consolidationOpportunities: serviceInventory.consolidationOpportunities.length,
        estimatedCodeReduction: this.calculateCodeReduction(serviceInventory.consolidationOpportunities)
      },
      duplicateServices: serviceInventory.duplicateServices,
      overlappingFunctionality: serviceInventory.overlappingFunctionality,
      consolidationPlan: serviceInventory.consolidationOpportunities,
      migrationStrategy
    };
  }

  private async findExpansionFiles(): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of this.expansionPatterns) {
      const files = await glob(pattern, {
        cwd: this.workspaceRoot,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**']
      });
      allFiles.push(...files);
    }

    // Remove duplicates and return absolute paths
    const uniqueFiles = [...new Set(allFiles)];
    return uniqueFiles.map(file => path.resolve(this.workspaceRoot, file));
  }

  private async parseServices(files: string[]): Promise<ExpansionService[]> {
    const services: ExpansionService[] = [];

    for (const file of files) {
      try {
        const content = await readFileAsync(file, 'utf-8');
        const service = await this.parseServiceFile(file, content);
        if (service) {
          services.push(service);
        }
      } catch (error) {
        console.warn(`Failed to parse service file ${file}:`, error);
      }
    }

    return services;
  }

  private async parseServiceFile(filePath: string, content: string): Promise<ExpansionService | null> {
    // Extract service class name
    const classMatch = content.match(/export\s+class\s+(\w+Service)/);
    if (!classMatch) return null;

    const serviceName = classMatch[1];
    const serviceType = this.determineServiceType(filePath, content);
    const methods = this.extractMethods(content);
    const dependencies = this.extractDependencies(content);
    const complexity = this.calculateComplexity(content);
    const linesOfCode = content.split('\n').length;

    return {
      name: serviceName,
      path: filePath,
      type: serviceType,
      methods,
      dependencies,
      complexity,
      linesOfCode
    };
  }

  private determineServiceType(filePath: string, content: string): ServiceType {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('openai')) return ServiceType.OPENAI_SERVICE;
    if (fileName.includes('market-analysis')) return ServiceType.MARKET_ANALYSIS;
    if (fileName.includes('strategic-scoring')) return ServiceType.STRATEGIC_SCORING;
    if (fileName.includes('location-discovery')) return ServiceType.LOCATION_DISCOVERY;
    if (fileName.includes('rationale')) return ServiceType.RATIONALE_GENERATION;
    if (fileName.includes('expansion')) return ServiceType.EXPANSION_SERVICE;
    if (filePath.includes('/ai/')) return ServiceType.AI_SERVICE;
    if (fileName.includes('config')) return ServiceType.CONFIGURATION_SERVICE;
    
    return ServiceType.UTILITY_SERVICE;
  }

  private extractMethods(content: string): ServiceMethod[] {
    const methods: ServiceMethod[] = [];
    const methodRegex = /(async\s+)?(\w+)\s*\([^)]*\)\s*:\s*[^{]+\{/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[2];
      if (methodName === 'constructor') continue;

      methods.push({
        name: methodName,
        signature: match[0],
        complexity: this.calculateMethodComplexity(content, match.index),
        linesOfCode: this.calculateMethodLines(content, match.index),
        dependencies: this.extractMethodDependencies(content, match.index)
      });
    }

    return methods;
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Extract imports
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // Extract constructor injections
    const injectionRegex = /constructor\([^)]*@Inject\([^)]*\)\s+private\s+\w+:\s*(\w+)/g;
    while ((match = injectionRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  private calculateComplexity(content: string): number {
    // Simple cyclomatic complexity calculation
    const complexityKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try', '&&', '||', '?'
    ];
    
    let complexity = 1; // Base complexity
    
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private calculateMethodComplexity(content: string, startIndex: number): number {
    // Find method body
    let braceCount = 0;
    let methodEnd = startIndex;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          methodEnd = i;
          break;
        }
      }
    }

    const methodContent = content.substring(startIndex, methodEnd);
    return this.calculateComplexity(methodContent);
  }

  private calculateMethodLines(content: string, startIndex: number): number {
    const beforeMethod = content.substring(0, startIndex);
    const startLine = beforeMethod.split('\n').length;
    
    // Find method end (simplified)
    let braceCount = 0;
    let methodEnd = startIndex;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          methodEnd = i;
          break;
        }
      }
    }

    const methodContent = content.substring(startIndex, methodEnd);
    return methodContent.split('\n').length;
  }

  private extractMethodDependencies(content: string, startIndex: number): string[] {
    // Extract dependencies within method (simplified)
    const dependencies: string[] = [];
    
    // Find method body
    let braceCount = 0;
    let methodEnd = startIndex;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          methodEnd = i;
          break;
        }
      }
    }

    const methodContent = content.substring(startIndex, methodEnd);
    
    // Look for this.someService calls
    const serviceCallRegex = /this\.(\w+)\./g;
    let match;
    
    while ((match = serviceCallRegex.exec(methodContent)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  private async detectDuplicateLogic(files: string[]): Promise<DuplicatePattern[]> {
    const patterns: DuplicatePattern[] = [];
    const codeBlocks = new Map<string, CodeOccurrence[]>();

    for (const file of files) {
      try {
        const content = await readFileAsync(file, 'utf-8');
        const blocks = this.extractCodeBlocks(file, content);
        
        for (const block of blocks) {
          const normalized = this.normalizeCode(block.code);
          if (!codeBlocks.has(normalized)) {
            codeBlocks.set(normalized, []);
          }
          codeBlocks.get(normalized)!.push(block);
        }
      } catch (error) {
        console.warn(`Failed to analyze file ${file}:`, error);
      }
    }

    // Find duplicates
    for (const [pattern, occurrences] of codeBlocks) {
      if (occurrences.length > 1) {
        patterns.push({
          pattern,
          occurrences,
          similarity: this.calculateSimilarity(occurrences),
          extractionOpportunity: this.suggestExtraction(occurrences)
        });
      }
    }

    return patterns.sort((a, b) => b.similarity - a.similarity);
  }

  private extractCodeBlocks(file: string, content: string): CodeOccurrence[] {
    const blocks: CodeOccurrence[] = [];
    const lines = content.split('\n');
    
    // Extract method bodies as code blocks
    const methodRegex = /(async\s+)?(\w+)\s*\([^)]*\)\s*:\s*[^{]+\{/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      
      // Find method end
      let braceCount = 0;
      let methodEnd = match.index;
      
      for (let i = match.index; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            methodEnd = i;
            break;
          }
        }
      }

      const endLine = content.substring(0, methodEnd).split('\n').length;
      const methodContent = content.substring(match.index, methodEnd);

      if (methodContent.length > 100) { // Only consider substantial methods
        blocks.push({
          file,
          startLine,
          endLine,
          code: methodContent
        });
      }
    }

    return blocks;
  }

  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/['"`][^'"`]*['"`]/g, 'STRING') // Replace string literals
      .replace(/\b\d+\b/g, 'NUMBER') // Replace numbers
      .trim();
  }

  private calculateSimilarity(occurrences: CodeOccurrence[]): number {
    if (occurrences.length < 2) return 0;
    
    // Simple similarity based on normalized code length
    const lengths = occurrences.map(o => o.code.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    // Higher similarity for lower variance
    return Math.max(0, 1 - (variance / (avgLength * avgLength)));
  }

  private suggestExtraction(occurrences: CodeOccurrence[]): string {
    const files = [...new Set(occurrences.map(o => path.basename(o.file)))];
    
    if (files.length === 1) {
      return `Extract common method within ${files[0]}`;
    } else {
      return `Extract to shared utility class (used in ${files.length} files)`;
    }
  }

  private async findUnusedCode(files: string[]): Promise<UnusedCodeBlock[]> {
    const unused: UnusedCodeBlock[] = [];
    
    // This is a simplified implementation
    // In a real scenario, you'd use AST parsing and cross-reference analysis
    
    for (const file of files) {
      try {
        const content = await readFileAsync(file, 'utf-8');
        const fileUnused = this.findUnusedInFile(file, content, files);
        unused.push(...fileUnused);
      } catch (error) {
        console.warn(`Failed to analyze unused code in ${file}:`, error);
      }
    }

    return unused;
  }

  private findUnusedInFile(file: string, content: string, allFiles: string[]): UnusedCodeBlock[] {
    const unused: UnusedCodeBlock[] = [];
    
    // Find unused imports (simplified)
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const imports = match[1].split(',').map(i => i.trim());
      
      for (const importName of imports) {
        const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
        const usages = content.match(usageRegex);
        
        if (!usages || usages.length <= 1) { // Only import declaration
          const lineNumber = content.substring(0, match.index).split('\n').length;
          unused.push({
            file,
            type: 'import',
            name: importName,
            startLine: lineNumber,
            endLine: lineNumber,
            reason: 'Import not used in file'
          });
        }
      }
    }

    return unused;
  }

  private async analyzeComplexity(files: string[]): Promise<ComplexityMetric[]> {
    const metrics: ComplexityMetric[] = [];

    for (const file of files) {
      try {
        const content = await readFileAsync(file, 'utf-8');
        const metric = this.calculateFileComplexity(file, content);
        metrics.push(metric);
      } catch (error) {
        console.warn(`Failed to analyze complexity for ${file}:`, error);
      }
    }

    return metrics.sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity);
  }

  private calculateFileComplexity(file: string, content: string): ComplexityMetric {
    const cyclomaticComplexity = this.calculateComplexity(content);
    const cognitiveComplexity = this.calculateCognitiveComplexity(content);
    const linesOfCode = content.split('\n').filter(line => line.trim().length > 0).length;
    const maintainabilityIndex = this.calculateMaintainabilityIndex(cyclomaticComplexity, linesOfCode);

    return {
      file,
      cyclomaticComplexity,
      cognitiveComplexity,
      maintainabilityIndex,
      linesOfCode
    };
  }

  private calculateCognitiveComplexity(content: string): number {
    // Simplified cognitive complexity calculation
    let complexity = 0;
    let nestingLevel = 0;
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Increase nesting for control structures
      if (trimmed.match(/\b(if|while|for|switch|try)\b/)) {
        complexity += 1 + nestingLevel;
        nestingLevel++;
      }
      
      // Decrease nesting for closing braces
      if (trimmed === '}') {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Add complexity for logical operators
      const logicalOps = (trimmed.match(/&&|\|\|/g) || []).length;
      complexity += logicalOps;
    }

    return complexity;
  }

  private calculateMaintainabilityIndex(cyclomaticComplexity: number, linesOfCode: number): number {
    // Simplified maintainability index calculation
    // Higher is better (0-100 scale)
    const complexity = Math.max(1, cyclomaticComplexity);
    const loc = Math.max(1, linesOfCode);
    
    return Math.max(0, Math.min(100, 
      171 - 5.2 * Math.log(complexity) - 0.23 * complexity - 16.2 * Math.log(loc)
    ));
  }

  private async findDuplicateServices(services: ExpansionService[]): Promise<ServiceDuplicate[]> {
    const duplicates: ServiceDuplicate[] = [];
    
    for (let i = 0; i < services.length; i++) {
      for (let j = i + 1; j < services.length; j++) {
        const service1 = services[i];
        const service2 = services[j];
        
        const similarity = this.calculateServiceSimilarity(service1, service2);
        
        if (similarity > 0.7) { // 70% similarity threshold
          const duplicatedMethods = this.findDuplicatedMethods(service1, service2);
          
          duplicates.push({
            primaryService: service1.path,
            duplicateServices: [service2.path],
            similarityScore: similarity,
            duplicatedMethods,
            consolidationStrategy: this.suggestConsolidationStrategy(service1, service2)
          });
        }
      }
    }

    return duplicates;
  }

  private calculateServiceSimilarity(service1: ExpansionService, service2: ExpansionService): number {
    // Calculate similarity based on method names and signatures
    const methods1 = new Set(service1.methods.map(m => m.name));
    const methods2 = new Set(service2.methods.map(m => m.name));
    
    const intersection = new Set([...methods1].filter(x => methods2.has(x)));
    const union = new Set([...methods1, ...methods2]);
    
    return intersection.size / union.size;
  }

  private findDuplicatedMethods(service1: ExpansionService, service2: ExpansionService): string[] {
    const methods1 = service1.methods.map(m => m.name);
    const methods2 = new Set(service2.methods.map(m => m.name));
    
    return methods1.filter(method => methods2.has(method));
  }

  private suggestConsolidationStrategy(service1: ExpansionService, service2: ExpansionService): string {
    const path1 = service1.path;
    const path2 = service2.path;
    
    if (path1.includes('/admin/') && path2.includes('/bff/')) {
      return 'Move to shared package and import in both admin and BFF';
    } else if (path1.includes('/bff/') && path2.includes('/admin/')) {
      return 'Move to shared package and import in both admin and BFF';
    } else {
      return 'Merge into single service and remove duplicate';
    }
  }

  private async findOverlappingFunctionality(services: ExpansionService[]): Promise<FunctionalityOverlap[]> {
    const overlaps: FunctionalityOverlap[] = [];
    
    // Group services by type
    const servicesByType = new Map<ServiceType, ExpansionService[]>();
    
    for (const service of services) {
      if (!servicesByType.has(service.type)) {
        servicesByType.set(service.type, []);
      }
      servicesByType.get(service.type)!.push(service);
    }

    // Find overlaps within each type
    for (const [type, typeServices] of servicesByType) {
      if (typeServices.length > 1) {
        const overlap = this.analyzeTypeOverlap(type, typeServices);
        if (overlap.overlappingMethods.length > 0) {
          overlaps.push(overlap);
        }
      }
    }

    return overlaps;
  }

  private analyzeTypeOverlap(type: ServiceType, services: ExpansionService[]): FunctionalityOverlap {
    const overlappingMethods: MethodOverlap[] = [];
    const methodGroups = new Map<string, ExpansionService[]>();

    // Group services by method names
    for (const service of services) {
      for (const method of service.methods) {
        if (!methodGroups.has(method.name)) {
          methodGroups.set(method.name, []);
        }
        methodGroups.get(method.name)!.push(service);
      }
    }

    // Find methods that appear in multiple services
    for (const [methodName, methodServices] of methodGroups) {
      if (methodServices.length > 1) {
        overlappingMethods.push({
          methodName,
          services: methodServices.map(s => s.path),
          similarityScore: 0.8, // Simplified
          differences: ['Implementation details may vary']
        });
      }
    }

    return {
      services: services.map(s => s.path),
      overlappingMethods,
      suggestedConsolidation: this.suggestTypeConsolidation(type, services),
      impactAssessment: this.assessConsolidationImpact(services)
    };
  }

  private suggestTypeConsolidation(type: ServiceType, services: ExpansionService[]): string {
    const adminServices = services.filter(s => s.path.includes('/admin/'));
    const bffServices = services.filter(s => s.path.includes('/bff/'));

    if (adminServices.length > 0 && bffServices.length > 0) {
      return `Create shared ${type} package and remove duplicates from admin and BFF`;
    } else {
      return `Merge ${services.length} ${type} services into single optimized service`;
    }
  }

  private assessConsolidationImpact(services: ExpansionService[]): string {
    const totalLoc = services.reduce((sum, s) => sum + s.linesOfCode, 0);
    const avgComplexity = services.reduce((sum, s) => sum + s.complexity, 0) / services.length;

    if (totalLoc > 1000 && avgComplexity > 10) {
      return 'High impact: Significant code reduction and complexity improvement expected';
    } else if (totalLoc > 500 || avgComplexity > 5) {
      return 'Medium impact: Moderate code reduction and maintainability improvement';
    } else {
      return 'Low impact: Minor code reduction but improved organization';
    }
  }

  private async identifyConsolidationOpportunities(
    services: ExpansionService[],
    duplicates: ServiceDuplicate[],
    overlaps: FunctionalityOverlap[]
  ): Promise<ConsolidationOpportunity[]> {
    const opportunities: ConsolidationOpportunity[] = [];

    // Opportunities from duplicates
    for (const duplicate of duplicates) {
      opportunities.push({
        type: 'merge_services',
        description: `Merge duplicate services: ${path.basename(duplicate.primaryService)} and ${duplicate.duplicateServices.map(d => path.basename(d)).join(', ')}`,
        affectedServices: [duplicate.primaryService, ...duplicate.duplicateServices],
        estimatedSavings: this.calculateDuplicateSavings(duplicate, services),
        migrationComplexity: this.assessMigrationComplexity(duplicate.duplicateServices.length),
        priority: duplicate.similarityScore > 0.9 ? 'high' : 'medium'
      });
    }

    // Opportunities from overlaps
    for (const overlap of overlaps) {
      if (overlap.overlappingMethods.length > 2) {
        opportunities.push({
          type: 'extract_common',
          description: `Extract common functionality from ${overlap.services.length} services with ${overlap.overlappingMethods.length} overlapping methods`,
          affectedServices: overlap.services,
          estimatedSavings: this.calculateOverlapSavings(overlap, services),
          migrationComplexity: 'medium',
          priority: overlap.overlappingMethods.length > 5 ? 'high' : 'medium'
        });
      }
    }

    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateDuplicateSavings(duplicate: ServiceDuplicate, services: ExpansionService[]): { linesOfCode: number; files: number; complexity: number } {
    const duplicateServices = services.filter(s => duplicate.duplicateServices.includes(s.path));
    
    return {
      linesOfCode: duplicateServices.reduce((sum, s) => sum + s.linesOfCode, 0),
      files: duplicateServices.length,
      complexity: duplicateServices.reduce((sum, s) => sum + s.complexity, 0)
    };
  }

  private calculateOverlapSavings(overlap: FunctionalityOverlap, services: ExpansionService[]): { linesOfCode: number; files: number; complexity: number } {
    const overlapServices = services.filter(s => overlap.services.includes(s.path));
    const overlapRatio = overlap.overlappingMethods.length / Math.max(...overlapServices.map(s => s.methods.length));
    
    return {
      linesOfCode: Math.floor(overlapServices.reduce((sum, s) => sum + s.linesOfCode, 0) * overlapRatio * 0.5),
      files: 0, // No files removed, just code extracted
      complexity: Math.floor(overlapServices.reduce((sum, s) => sum + s.complexity, 0) * overlapRatio * 0.3)
    };
  }

  private assessMigrationComplexity(serviceCount: number): 'low' | 'medium' | 'high' {
    if (serviceCount <= 2) return 'low';
    if (serviceCount <= 4) return 'medium';
    return 'high';
  }

  private calculateCodeReduction(opportunities: ConsolidationOpportunity[]): number {
    return opportunities.reduce((sum, opp) => sum + opp.estimatedSavings.linesOfCode, 0);
  }

  private async buildServiceNodes(files: string[]): Promise<ServiceNode[]> {
    const nodes: ServiceNode[] = [];
    
    for (const file of files) {
      try {
        const content = await readFileAsync(file, 'utf-8');
        const classMatch = content.match(/export\s+class\s+(\w+Service)/);
        
        if (classMatch) {
          nodes.push({
            id: file,
            name: classMatch[1],
            path: file,
            type: this.determineServiceType(file, content)
          });
        }
      } catch (error) {
        console.warn(`Failed to build node for ${file}:`, error);
      }
    }

    return nodes;
  }

  private async buildDependencyEdges(files: string[]): Promise<ServiceDependency[]> {
    const edges: ServiceDependency[] = [];
    
    for (const file of files) {
      try {
        const content = await readFileAsync(file, 'utf-8');
        const fileDependencies = this.extractDependencies(content);
        
        for (const dep of fileDependencies) {
          // Find the target file for this dependency
          const targetFile = files.find(f => f.includes(dep) || path.basename(f).includes(dep));
          
          if (targetFile && targetFile !== file) {
            edges.push({
              from: file,
              to: targetFile,
              type: 'import',
              strength: 1
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to build edges for ${file}:`, error);
      }
    }

    return edges;
  }

  private detectCircularDependencies(nodes: ServiceNode[], edges: ServiceDependency[]): CircularDependency[] {
    const circular: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, pathArray: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = pathArray.indexOf(nodeId);
        const cycle = pathArray.slice(cycleStart).concat([nodeId]);
        
        circular.push({
          cycle: cycle.map(id => path.basename(id)),
          severity: cycle.length > 3 ? 'high' : 'medium',
          suggestion: `Break circular dependency by extracting common interface or using dependency injection`
        });
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(e => e.from === nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.to, [...pathArray, nodeId]);
      }

      recursionStack.delete(nodeId);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    return circular;
  }

  private detectUnusedDependencies(nodes: ServiceNode[], edges: ServiceDependency[]): UnusedDependency[] {
    const unused: UnusedDependency[] = [];
    
    // Find nodes with no incoming edges (potentially unused)
    const nodesWithIncoming = new Set(edges.map(e => e.to));
    
    for (const node of nodes) {
      if (!nodesWithIncoming.has(node.id)) {
        // Check if it's actually unused or just an entry point
        const isEntryPoint = node.name.includes('Controller') || 
                            node.name.includes('Module') ||
                            node.path.includes('main.ts');
        
        if (!isEntryPoint) {
          unused.push({
            service: node.name,
            dependency: 'none',
            type: 'import',
            reason: 'Service appears to be unused (no incoming dependencies)'
          });
        }
      }
    }

    return unused;
  }

  private createMigrationStrategy(opportunities: ConsolidationOpportunity[]): MigrationStep[] {
    const steps: MigrationStep[] = [];
    let stepOrder = 1;

    // Sort opportunities by priority and complexity
    const sortedOpportunities = opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const complexityOrder = { low: 1, medium: 2, high: 3 };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return complexityOrder[a.migrationComplexity] - complexityOrder[b.migrationComplexity];
    });

    for (const opportunity of sortedOpportunities) {
      if (opportunity.type === 'merge_services') {
        // Create steps for merging services
        steps.push({
          order: stepOrder++,
          description: `Create shared package for ${opportunity.description}`,
          type: 'create',
          affectedFiles: [`packages/shared-${opportunity.affectedServices[0].split('/').pop()?.replace('.service.ts', '')}/`],
          estimatedEffort: opportunity.migrationComplexity,
          dependencies: []
        });

        steps.push({
          order: stepOrder++,
          description: `Migrate primary service to shared package`,
          type: 'move',
          affectedFiles: [opportunity.affectedServices[0]],
          estimatedEffort: opportunity.migrationComplexity,
          dependencies: [stepOrder - 2]
        });

        steps.push({
          order: stepOrder++,
          description: `Update imports and remove duplicate services`,
          type: 'delete',
          affectedFiles: opportunity.affectedServices.slice(1),
          estimatedEffort: 'medium',
          dependencies: [stepOrder - 2]
        });

      } else if (opportunity.type === 'extract_common') {
        steps.push({
          order: stepOrder++,
          description: `Extract common functionality: ${opportunity.description}`,
          type: 'create',
          affectedFiles: [`packages/shared-utilities/`],
          estimatedEffort: opportunity.migrationComplexity,
          dependencies: []
        });

        steps.push({
          order: stepOrder++,
          description: `Update services to use extracted common functionality`,
          type: 'modify',
          affectedFiles: opportunity.affectedServices,
          estimatedEffort: opportunity.migrationComplexity,
          dependencies: [stepOrder - 2]
        });
      }
    }

    return steps;
  }
}