import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import {
  IRedundancyDetector,
  ServiceDuplicate,
  FunctionalityOverlap,
  UnusedInterface,
  CodeDuplication,
  SimilarityMatrix,
  CrossServiceDuplication,
  RedundancyAnalysisResult,
  MethodOverlap,
  MethodSignature,
  Parameter,
  UsagePattern,
  CodeOccurrence,
  DuplicationType,
  ServiceCluster,
  ClusterType,
  ConsolidationRecommendation,
  DuplicatedElement,
  CodeLocation,
  CrossServiceStrategy,
  SharedPackageCandidate,
  ExtractionOpportunity
} from '../interfaces/redundancy-detector.interface';

const readFileAsync = promisify(fs.readFile);

/**
 * Redundancy Detector Service
 * Identifies duplicate services and overlapping functionality across admin and BFF applications
 */
export class RedundancyDetectorService implements IRedundancyDetector {
  private readonly workspaceRoot: string;
  private readonly adminServicesPath: string;
  private readonly bffServicesPath: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.adminServicesPath = path.join(workspaceRoot, 'apps/admin/lib/services');
    this.bffServicesPath = path.join(workspaceRoot, 'apps/bff/src/services');
  }

  async detectDuplicateServices(): Promise<ServiceDuplicate[]> {
    console.log('🔍 Detecting duplicate services...');
    
    const adminServices = await this.scanServices(this.adminServicesPath, 'admin');
    const bffServices = await this.scanServices(this.bffServicesPath, 'bff');
    const allServices = [...adminServices, ...bffServices];

    const duplicates: ServiceDuplicate[] = [];

    // Compare services for similarity
    for (let i = 0; i < allServices.length; i++) {
      for (let j = i + 1; j < allServices.length; j++) {
        const service1 = allServices[i];
        const service2 = allServices[j];

        const similarity = await this.calculateServiceSimilarity(service1, service2);
        
        if (similarity.score > 0.7) { // 70% similarity threshold
          const duplicate = await this.createServiceDuplicate(service1, service2, similarity);
          duplicates.push(duplicate);
        }
      }
    }

    return duplicates.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  async findOverlappingFunctionality(): Promise<FunctionalityOverlap[]> {
    console.log('🔄 Finding overlapping functionality...');
    
    const adminServices = await this.scanServices(this.adminServicesPath, 'admin');
    const bffServices = await this.scanServices(this.bffServicesPath, 'bff');
    
    const overlaps: FunctionalityOverlap[] = [];

    // Group services by functionality type
    const serviceGroups = this.groupServicesByType([...adminServices, ...bffServices]);

    for (const [type, services] of serviceGroups) {
      if (services.length > 1) {
        const overlap = await this.analyzeGroupOverlap(type, services);
        if (overlap.overlappingMethods.length > 0) {
          overlaps.push(overlap);
        }
      }
    }

    return overlaps.sort((a, b) => b.overlapPercentage - a.overlapPercentage);
  }

  async identifyUnusedInterfaces(): Promise<UnusedInterface[]> {
    console.log('🗑️ Identifying unused interfaces...');
    
    const interfaceFiles = await this.findInterfaceFiles();
    const unused: UnusedInterface[] = [];

    for (const file of interfaceFiles) {
      try {
        const content = await readFileAsync(file, 'utf-8');
        const interfaces = this.extractInterfaces(content);
        
        for (const iface of interfaces) {
          const usage = await this.analyzeInterfaceUsage(iface, file);
          if (usage.usageCount === 0) {
            unused.push({
              name: iface.name,
              file,
              definedAt: iface.line,
              reason: 'Interface not used in any service',
              potentialUsages: usage.potentialUsages,
              removalSafety: usage.safety
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to analyze interface file ${file}:`, error);
      }
    }

    return unused;
  }

  async analyzeCodeDuplication(): Promise<CodeDuplication[]> {
    console.log('📋 Analyzing code duplication...');
    
    const adminServices = await this.scanServices(this.adminServicesPath, 'admin');
    const bffServices = await this.scanServices(this.bffServicesPath, 'bff');
    const allServices = [...adminServices, ...bffServices];

    const duplications: CodeDuplication[] = [];
    const codeBlocks = new Map<string, CodeOccurrence[]>();

    // Extract and hash code blocks
    for (const service of allServices) {
      const blocks = await this.extractCodeBlocks(service.path);
      
      for (const block of blocks) {
        const hash = this.hashCode(block.code);
        if (!codeBlocks.has(hash)) {
          codeBlocks.set(hash, []);
        }
        codeBlocks.get(hash)!.push({ ...block, hash });
      }
    }

    // Find duplications
    for (const [hash, occurrences] of codeBlocks) {
      if (occurrences.length > 1) {
        const duplication = this.createCodeDuplication(hash, occurrences);
        duplications.push(duplication);
      }
    }

    return duplications.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }

  async generateSimilarityMatrix(): Promise<SimilarityMatrix> {
    console.log('📊 Generating similarity matrix...');
    
    const adminServices = await this.scanServices(this.adminServicesPath, 'admin');
    const bffServices = await this.scanServices(this.bffServicesPath, 'bff');
    const allServices = [...adminServices, ...bffServices];

    const serviceNames = allServices.map(s => s.name);
    const matrix: number[][] = [];

    // Calculate similarity matrix
    for (let i = 0; i < allServices.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < allServices.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          const similarity = await this.calculateServiceSimilarity(allServices[i], allServices[j]);
          matrix[i][j] = similarity.score;
        }
      }
    }

    const clusters = this.identifyServiceClusters(allServices, matrix);
    const recommendations = this.generateConsolidationRecommendations(clusters);

    return {
      services: serviceNames,
      matrix,
      clusters,
      recommendations
    };
  }

  async findCrossServiceDuplication(): Promise<CrossServiceDuplication[]> {
    console.log('🔀 Finding cross-service duplication...');
    
    const adminServices = await this.scanServices(this.adminServicesPath, 'admin');
    const bffServices = await this.scanServices(this.bffServicesPath, 'bff');

    const crossDuplications: CrossServiceDuplication[] = [];

    // Compare admin services with BFF services
    for (const adminService of adminServices) {
      for (const bffService of bffServices) {
        const duplication = await this.analyzeCrossServiceDuplication(adminService, bffService);
        if (duplication.duplicatedElements.length > 0) {
          crossDuplications.push(duplication);
        }
      }
    }

    return crossDuplications.sort((a, b) => b.duplicatedElements.length - a.duplicatedElements.length);
  }

  private async scanServices(servicesPath: string, type: 'admin' | 'bff'): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];
    
    try {
      const files = await this.findServiceFiles(servicesPath);
      
      for (const file of files) {
        try {
          const content = await readFileAsync(file, 'utf-8');
          const serviceInfo = this.parseServiceInfo(file, content, type);
          if (serviceInfo) {
            services.push(serviceInfo);
          }
        } catch (error) {
          console.warn(`Failed to parse service ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to scan services in ${servicesPath}:`, error);
    }

    return services;
  }

  private async findServiceFiles(servicesPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.name.endsWith('.service.ts')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist or be accessible
      }
    };

    await scanDirectory(servicesPath);
    return files;
  }

  private parseServiceInfo(filePath: string, content: string, type: 'admin' | 'bff'): ServiceInfo | null {
    const classMatch = content.match(/export\s+class\s+(\w+Service)/);
    if (!classMatch) return null;

    const serviceName = classMatch[1];
    const methods = this.extractServiceMethods(content);
    const interfaces = this.extractServiceInterfaces(content);
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);

    return {
      name: serviceName,
      path: filePath,
      type,
      content,
      methods,
      interfaces,
      imports,
      exports,
      linesOfCode: content.split('\n').length,
      complexity: this.calculateComplexity(content)
    };
  }

  private extractServiceMethods(content: string): MethodInfo[] {
    const methods: MethodInfo[] = [];
    const methodRegex = /(async\s+)?(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[2];
      if (methodName === 'constructor') continue;

      const isAsync = !!match[1];
      const parametersStr = match[3];
      const returnType = match[4].trim();
      
      const parameters = this.parseParameters(parametersStr);
      const signature = `${isAsync ? 'async ' : ''}${methodName}(${parametersStr}): ${returnType}`;
      
      methods.push({
        name: methodName,
        signature,
        parameters,
        returnType,
        isAsync,
        startLine: content.substring(0, match.index).split('\n').length,
        endLine: this.findMethodEndLine(content, match.index),
        body: this.extractMethodBody(content, match.index)
      });
    }

    return methods;
  }

  private parseParameters(parametersStr: string): Parameter[] {
    if (!parametersStr.trim()) return [];

    const parameters: Parameter[] = [];
    const paramRegex = /(\w+)(\?)?:\s*([^,=]+)(?:\s*=\s*([^,]+))?/g;
    let match;

    while ((match = paramRegex.exec(parametersStr)) !== null) {
      parameters.push({
        name: match[1],
        type: match[3].trim(),
        optional: !!match[2],
        defaultValue: match[4]?.trim()
      });
    }

    return parameters;
  }

  private extractServiceInterfaces(content: string): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = [];
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push({
        name: match[1],
        body: match[2],
        line: content.substring(0, match.index).split('\n').length
      });
    }

    return interfaces;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:class|interface|type|const|function)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private findMethodEndLine(content: string, startIndex: number): number {
    let braceCount = 0;
    let inMethod = false;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inMethod = true;
      }
      if (content[i] === '}') {
        braceCount--;
        if (inMethod && braceCount === 0) {
          return content.substring(0, i).split('\n').length;
        }
      }
    }

    return content.split('\n').length;
  }

  private extractMethodBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let methodStart = -1;
    let methodEnd = -1;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        if (methodStart === -1) methodStart = i;
        braceCount++;
      }
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          methodEnd = i;
          break;
        }
      }
    }

    return methodStart !== -1 && methodEnd !== -1 
      ? content.substring(methodStart + 1, methodEnd).trim()
      : '';
  }

  private calculateComplexity(content: string): number {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try', '&&', '||', '?'];
    let complexity = 1;

    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private async calculateServiceSimilarity(service1: ServiceInfo, service2: ServiceInfo): Promise<SimilarityResult> {
    // Method name similarity
    const methods1 = new Set(service1.methods.map(m => m.name));
    const methods2 = new Set(service2.methods.map(m => m.name));
    const methodIntersection = new Set([...methods1].filter(x => methods2.has(x)));
    const methodUnion = new Set([...methods1, ...methods2]);
    const methodSimilarity = methodIntersection.size / methodUnion.size;

    // Interface similarity
    const interfaces1 = new Set(service1.interfaces.map(i => i.name));
    const interfaces2 = new Set(service2.interfaces.map(i => i.name));
    const interfaceIntersection = new Set([...interfaces1].filter(x => interfaces2.has(x)));
    const interfaceUnion = new Set([...interfaces1, ...interfaces2]);
    const interfaceSimilarity = interfaceUnion.size > 0 ? interfaceIntersection.size / interfaceUnion.size : 0;

    // Import similarity
    const imports1 = new Set(service1.imports);
    const imports2 = new Set(service2.imports);
    const importIntersection = new Set([...imports1].filter(x => imports2.has(x)));
    const importUnion = new Set([...imports1, ...imports2]);
    const importSimilarity = importUnion.size > 0 ? importIntersection.size / importUnion.size : 0;

    // Structural similarity (method signatures)
    const structuralSimilarity = this.calculateStructuralSimilarity(service1, service2);

    // Weighted average
    const overallSimilarity = (
      methodSimilarity * 0.4 +
      structuralSimilarity * 0.3 +
      importSimilarity * 0.2 +
      interfaceSimilarity * 0.1
    );

    return {
      score: overallSimilarity,
      methodSimilarity,
      interfaceSimilarity,
      importSimilarity,
      structuralSimilarity,
      commonMethods: [...methodIntersection],
      commonInterfaces: [...interfaceIntersection],
      commonImports: [...importIntersection]
    };
  }

  private calculateStructuralSimilarity(service1: ServiceInfo, service2: ServiceInfo): number {
    let totalComparisons = 0;
    let similarSignatures = 0;

    for (const method1 of service1.methods) {
      for (const method2 of service2.methods) {
        if (method1.name === method2.name) {
          totalComparisons++;
          const signatureSimilarity = this.compareMethodSignatures(method1, method2);
          if (signatureSimilarity > 0.8) {
            similarSignatures++;
          }
        }
      }
    }

    return totalComparisons > 0 ? similarSignatures / totalComparisons : 0;
  }

  private compareMethodSignatures(method1: MethodInfo, method2: MethodInfo): number {
    // Compare parameter count
    if (method1.parameters.length !== method2.parameters.length) {
      return 0;
    }

    // Compare parameter types
    let matchingParams = 0;
    for (let i = 0; i < method1.parameters.length; i++) {
      if (method1.parameters[i].type === method2.parameters[i].type) {
        matchingParams++;
      }
    }

    const paramSimilarity = method1.parameters.length > 0 ? matchingParams / method1.parameters.length : 1;

    // Compare return types
    const returnTypeSimilarity = method1.returnType === method2.returnType ? 1 : 0;

    // Compare async nature
    const asyncSimilarity = method1.isAsync === method2.isAsync ? 1 : 0;

    return (paramSimilarity * 0.5 + returnTypeSimilarity * 0.3 + asyncSimilarity * 0.2);
  }

  private async createServiceDuplicate(service1: ServiceInfo, service2: ServiceInfo, similarity: SimilarityResult): Promise<ServiceDuplicate> {
    const consolidationStrategy = this.determineConsolidationStrategy(service1, service2);
    const estimatedSavings = this.calculateSavings(service1, service2, similarity);
    const migrationRisk = this.assessMigrationRisk(service1, service2);

    return {
      primaryService: service1.path,
      duplicateServices: [service2.path],
      similarityScore: similarity.score,
      duplicatedMethods: similarity.commonMethods,
      consolidationStrategy,
      estimatedSavings,
      migrationRisk
    };
  }

  private determineConsolidationStrategy(service1: ServiceInfo, service2: ServiceInfo): string {
    if (service1.type === 'admin' && service2.type === 'bff') {
      return 'Create shared package and import in both admin and BFF applications';
    } else if (service1.type === service2.type) {
      return 'Merge services within the same application';
    } else {
      return 'Extract common functionality to shared utility';
    }
  }

  private calculateSavings(service1: ServiceInfo, service2: ServiceInfo, similarity: SimilarityResult): { linesOfCode: number; files: number; complexity: number } {
    const duplicateLines = Math.floor(service2.linesOfCode * similarity.score);
    const duplicateComplexity = Math.floor(service2.complexity * similarity.score);

    return {
      linesOfCode: duplicateLines,
      files: 1, // One duplicate service file can be removed
      complexity: duplicateComplexity
    };
  }

  private assessMigrationRisk(service1: ServiceInfo, service2: ServiceInfo): 'low' | 'medium' | 'high' {
    const complexitySum = service1.complexity + service2.complexity;
    const locSum = service1.linesOfCode + service2.linesOfCode;

    if (complexitySum > 50 || locSum > 1000) return 'high';
    if (complexitySum > 20 || locSum > 500) return 'medium';
    return 'low';
  }

  private groupServicesByType(services: ServiceInfo[]): Map<string, ServiceInfo[]> {
    const groups = new Map<string, ServiceInfo[]>();

    for (const service of services) {
      const type = this.determineServiceType(service);
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(service);
    }

    return groups;
  }

  private determineServiceType(service: ServiceInfo): string {
    const fileName = path.basename(service.path).toLowerCase();
    
    if (fileName.includes('openai')) return 'openai';
    if (fileName.includes('market')) return 'market-analysis';
    if (fileName.includes('strategic')) return 'strategic';
    if (fileName.includes('location')) return 'location';
    if (fileName.includes('rationale')) return 'rationale';
    if (fileName.includes('expansion')) return 'expansion';
    
    return 'utility';
  }

  private async analyzeGroupOverlap(type: string, services: ServiceInfo[]): Promise<FunctionalityOverlap> {
    const overlappingMethods = this.findOverlappingMethods(services);
    const overlapPercentage = this.calculateOverlapPercentage(services, overlappingMethods);
    const extractionOpportunity = this.identifyExtractionOpportunity(type, overlappingMethods);

    return {
      services: services.map(s => s.path),
      overlappingMethods,
      suggestedConsolidation: `Consolidate ${type} services by extracting common functionality`,
      impactAssessment: this.assessOverlapImpact(services, overlapPercentage),
      overlapPercentage,
      extractionOpportunity
    };
  }

  private findOverlappingMethods(services: ServiceInfo[]): MethodOverlap[] {
    const methodGroups = new Map<string, ServiceInfo[]>();
    const overlaps: MethodOverlap[] = [];

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
        const signatures = this.extractMethodSignatures(methodName, methodServices);
        const usagePatterns = this.analyzeUsagePatterns(methodName, methodServices);
        const similarityScore = this.calculateMethodOverlapSimilarity(signatures);

        overlaps.push({
          methodName,
          services: methodServices.map(s => s.path),
          similarityScore,
          differences: this.identifyMethodDifferences(signatures),
          signatures,
          usagePatterns
        });
      }
    }

    return overlaps;
  }

  private extractMethodSignatures(methodName: string, services: ServiceInfo[]): MethodSignature[] {
    const signatures: MethodSignature[] = [];

    for (const service of services) {
      const method = service.methods.find(m => m.name === methodName);
      if (method) {
        signatures.push({
          service: service.path,
          signature: method.signature,
          parameters: method.parameters,
          returnType: method.returnType,
          isAsync: method.isAsync
        });
      }
    }

    return signatures;
  }

  private analyzeUsagePatterns(methodName: string, services: ServiceInfo[]): UsagePattern[] {
    const patterns: UsagePattern[] = [];

    for (const service of services) {
      const method = service.methods.find(m => m.name === methodName);
      if (method) {
        // Simplified usage analysis
        const calledBy = this.findMethodCallers(methodName, service.content);
        
        patterns.push({
          service: service.path,
          calledBy,
          frequency: calledBy.length,
          context: this.determineMethodContext(method.body)
        });
      }
    }

    return patterns;
  }

  private findMethodCallers(methodName: string, content: string): string[] {
    const callers: string[] = [];
    const callRegex = new RegExp(`this\\.${methodName}\\(`, 'g');
    const matches = content.match(callRegex);
    
    if (matches) {
      // Find the method that contains each call
      for (const match of matches) {
        const caller = this.findContainingMethod(content, content.indexOf(match));
        if (caller) {
          callers.push(caller);
        }
      }
    }

    return [...new Set(callers)];
  }

  private findContainingMethod(content: string, position: number): string | null {
    const beforePosition = content.substring(0, position);
    const methodMatch = beforePosition.match(/(\w+)\s*\([^)]*\)\s*:\s*[^{]+\{[^}]*$/);
    return methodMatch ? methodMatch[1] : null;
  }

  private determineMethodContext(methodBody: string): string {
    if (methodBody.includes('openai') || methodBody.includes('OpenAI')) return 'AI/OpenAI';
    if (methodBody.includes('fetch') || methodBody.includes('axios')) return 'HTTP/API';
    if (methodBody.includes('cache') || methodBody.includes('Cache')) return 'Caching';
    if (methodBody.includes('validate') || methodBody.includes('Validate')) return 'Validation';
    return 'Business Logic';
  }

  private calculateMethodOverlapSimilarity(signatures: MethodSignature[]): number {
    if (signatures.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < signatures.length; i++) {
      for (let j = i + 1; j < signatures.length; j++) {
        const method1 = { 
          parameters: signatures[i].parameters, 
          returnType: signatures[i].returnType, 
          isAsync: signatures[i].isAsync 
        } as MethodInfo;
        const method2 = { 
          parameters: signatures[j].parameters, 
          returnType: signatures[j].returnType, 
          isAsync: signatures[j].isAsync 
        } as MethodInfo;
        
        totalSimilarity += this.compareMethodSignatures(method1, method2);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private identifyMethodDifferences(signatures: MethodSignature[]): string[] {
    const differences: string[] = [];

    if (signatures.length < 2) return differences;

    // Check parameter differences
    const paramCounts = signatures.map(s => s.parameters.length);
    if (Math.max(...paramCounts) !== Math.min(...paramCounts)) {
      differences.push('Different parameter counts');
    }

    // Check return type differences
    const returnTypes = new Set(signatures.map(s => s.returnType));
    if (returnTypes.size > 1) {
      differences.push('Different return types');
    }

    // Check async differences
    const asyncTypes = new Set(signatures.map(s => s.isAsync));
    if (asyncTypes.size > 1) {
      differences.push('Mixed async/sync implementations');
    }

    return differences;
  }

  private calculateOverlapPercentage(services: ServiceInfo[], overlappingMethods: MethodOverlap[]): number {
    const totalMethods = services.reduce((sum, service) => sum + service.methods.length, 0);
    const overlappingMethodCount = overlappingMethods.reduce((sum, overlap) => sum + overlap.services.length, 0);
    
    return totalMethods > 0 ? (overlappingMethodCount / totalMethods) * 100 : 0;
  }

  private identifyExtractionOpportunity(type: string, overlappingMethods: MethodOverlap[]): ExtractionOpportunity {
    const extractedElements = overlappingMethods.map(m => m.methodName);
    
    return {
      type: 'shared_service',
      name: `Shared${type.charAt(0).toUpperCase() + type.slice(1)}Service`,
      description: `Extract common ${type} functionality to shared service`,
      extractedElements,
      targetLocation: `packages/shared-${type}/`,
      benefits: [
        'Eliminate code duplication',
        'Centralize common functionality',
        'Improve maintainability',
        'Reduce bundle size'
      ]
    };
  }

  private assessOverlapImpact(services: ServiceInfo[], overlapPercentage: number): string {
    const totalLoc = services.reduce((sum, s) => sum + s.linesOfCode, 0);
    
    if (overlapPercentage > 50 && totalLoc > 1000) {
      return 'High impact: Significant overlap with substantial code base';
    } else if (overlapPercentage > 30 || totalLoc > 500) {
      return 'Medium impact: Moderate overlap with potential for consolidation';
    } else {
      return 'Low impact: Minor overlap but still worth consolidating';
    }
  }

  private async findInterfaceFiles(): Promise<string[]> {
    const files: string[] = [];
    const patterns = [
      path.join(this.workspaceRoot, 'apps/admin/**/*.interface.ts'),
      path.join(this.workspaceRoot, 'apps/bff/**/*.interface.ts'),
      path.join(this.workspaceRoot, 'packages/**/*.interface.ts')
    ];

    // Simplified file finding - in real implementation, use glob
    const scanDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.includes('node_modules')) {
            await scanDir(fullPath);
          } else if (entry.name.endsWith('.interface.ts')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist
      }
    };

    await scanDir(path.join(this.workspaceRoot, 'apps'));
    await scanDir(path.join(this.workspaceRoot, 'packages'));

    return files;
  }

  private extractInterfaces(content: string): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = [];
    const interfaceRegex = /export\s+interface\s+(\w+)/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push({
        name: match[1],
        body: '',
        line: content.substring(0, match.index).split('\n').length
      });
    }

    return interfaces;
  }

  private async analyzeInterfaceUsage(iface: InterfaceInfo, file: string): Promise<InterfaceUsageAnalysis> {
    // Simplified usage analysis
    const allFiles = await this.getAllTypeScriptFiles();
    let usageCount = 0;
    const potentialUsages: string[] = [];

    for (const checkFile of allFiles) {
      if (checkFile === file) continue;

      try {
        const content = await readFileAsync(checkFile, 'utf-8');
        const usageRegex = new RegExp(`\\b${iface.name}\\b`, 'g');
        const matches = content.match(usageRegex);
        
        if (matches) {
          usageCount += matches.length;
        } else {
          // Check for potential usage patterns
          if (content.includes(iface.name.toLowerCase()) || 
              content.includes(iface.name.replace(/Interface$/, ''))) {
            potentialUsages.push(checkFile);
          }
        }
      } catch (error) {
        // File read error
      }
    }

    return {
      usageCount,
      potentialUsages,
      safety: usageCount === 0 ? (potentialUsages.length === 0 ? 'safe' : 'risky') : 'dangerous'
    };
  }

  private async getAllTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('dist')) {
            await scanDir(fullPath);
          } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist
      }
    };

    await scanDir(this.workspaceRoot);
    return files;
  }

  private async extractCodeBlocks(filePath: string): Promise<CodeOccurrence[]> {
    const content = await readFileAsync(filePath, 'utf-8');
    const blocks: CodeOccurrence[] = [];
    
    // Extract method bodies
    const methodRegex = /(async\s+)?(\w+)\s*\([^)]*\)\s*:\s*[^{]+\{/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodBody = this.extractMethodBody(content, match.index);
      if (methodBody.length > 50) { // Only consider substantial methods
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findMethodEndLine(content, match.index);
        
        blocks.push({
          file: filePath,
          startLine,
          endLine,
          code: methodBody,
          context: match[2], // method name
          hash: ''
        });
      }
    }

    return blocks;
  }

  private hashCode(code: string): string {
    const normalized = code
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/['"`][^'"`]*['"`]/g, 'STRING')
      .replace(/\b\d+\b/g, 'NUMBER')
      .trim();
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  private createCodeDuplication(hash: string, occurrences: CodeOccurrence[]): CodeDuplication {
    const estimatedSavings = (occurrences.length - 1) * occurrences[0].code.length;
    const complexity = this.calculateComplexity(occurrences[0].code);
    
    return {
      pattern: hash,
      occurrences,
      extractionOpportunity: this.suggestCodeExtraction(occurrences),
      estimatedSavings,
      complexity,
      type: this.determineDuplicationType(occurrences)
    };
  }

  private suggestCodeExtraction(occurrences: CodeOccurrence[]): string {
    const files = [...new Set(occurrences.map(o => path.basename(o.file)))];
    
    if (files.length === 1) {
      return `Extract to private method within ${files[0]}`;
    } else {
      return `Extract to shared utility function (used in ${files.length} files)`;
    }
  }

  private determineDuplicationType(occurrences: CodeOccurrence[]): DuplicationType {
    // Simplified type determination
    const firstCode = occurrences[0].code;
    
    if (occurrences.every(o => o.code === firstCode)) {
      return DuplicationType.EXACT_MATCH;
    } else {
      return DuplicationType.SIMILAR_LOGIC;
    }
  }

  private identifyServiceClusters(services: ServiceInfo[], matrix: number[][]): ServiceCluster[] {
    const clusters: ServiceCluster[] = [];
    const visited = new Set<number>();
    
    for (let i = 0; i < services.length; i++) {
      if (visited.has(i)) continue;
      
      const cluster: number[] = [i];
      visited.add(i);
      
      // Find similar services
      for (let j = i + 1; j < services.length; j++) {
        if (!visited.has(j) && matrix[i][j] > 0.6) {
          cluster.push(j);
          visited.add(j);
        }
      }
      
      if (cluster.length > 1) {
        const clusterServices = cluster.map(idx => services[idx]);
        const avgSimilarity = this.calculateAverageSimilarity(cluster, matrix);
        
        clusters.push({
          services: clusterServices.map(s => s.path),
          averageSimilarity: avgSimilarity,
          clusterType: this.determineClusterType(clusterServices),
          consolidationPotential: this.calculateConsolidationPotential(clusterServices, avgSimilarity)
        });
      }
    }
    
    return clusters.sort((a, b) => b.consolidationPotential - a.consolidationPotential);
  }

  private calculateAverageSimilarity(cluster: number[], matrix: number[][]): number {
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        totalSimilarity += matrix[cluster[i]][cluster[j]];
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private determineClusterType(services: ServiceInfo[]): ClusterType {
    const types = services.map(s => this.determineServiceType(s));
    const typeCount = new Map<string, number>();
    
    for (const type of types) {
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }
    
    const dominantType = [...typeCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
    
    switch (dominantType) {
      case 'openai': return ClusterType.OPENAI_SERVICES;
      case 'market-analysis': return ClusterType.MARKET_ANALYSIS;
      case 'location': return ClusterType.LOCATION_SERVICES;
      default: return ClusterType.UTILITY_SERVICES;
    }
  }

  private calculateConsolidationPotential(services: ServiceInfo[], avgSimilarity: number): number {
    const totalLoc = services.reduce((sum, s) => sum + s.linesOfCode, 0);
    const avgComplexity = services.reduce((sum, s) => sum + s.complexity, 0) / services.length;
    
    // Higher potential for high similarity, large code base, and high complexity
    return avgSimilarity * 0.4 + (totalLoc / 1000) * 0.3 + (avgComplexity / 50) * 0.3;
  }

  private generateConsolidationRecommendations(clusters: ServiceCluster[]): ConsolidationRecommendation[] {
    const recommendations: ConsolidationRecommendation[] = [];
    
    for (const cluster of clusters) {
      if (cluster.consolidationPotential > 0.5) {
        recommendations.push({
          type: 'merge',
          services: cluster.services,
          description: `Merge ${cluster.clusterType} services with ${(cluster.averageSimilarity * 100).toFixed(1)}% similarity`,
          priority: cluster.consolidationPotential > 0.8 ? 'high' : 'medium',
          effort: cluster.services.length > 3 ? 'high' : 'medium',
          benefits: [
            'Eliminate duplicate code',
            'Reduce maintenance overhead',
            'Improve consistency',
            'Simplify testing'
          ],
          risks: [
            'Potential breaking changes',
            'Increased coupling',
            'Migration complexity'
          ]
        });
      }
    }
    
    return recommendations;
  }

  private async analyzeCrossServiceDuplication(adminService: ServiceInfo, bffService: ServiceInfo): Promise<CrossServiceDuplication> {
    const duplicatedElements: DuplicatedElement[] = [];
    
    // Compare methods
    for (const adminMethod of adminService.methods) {
      const bffMethod = bffService.methods.find(m => m.name === adminMethod.name);
      if (bffMethod) {
        const similarity = this.compareMethodSignatures(adminMethod, bffMethod);
        if (similarity > 0.7) {
          duplicatedElements.push({
            type: 'method',
            name: adminMethod.name,
            adminLocation: {
              file: adminService.path,
              startLine: adminMethod.startLine,
              endLine: adminMethod.endLine,
              code: adminMethod.body
            },
            bffLocation: {
              file: bffService.path,
              startLine: bffMethod.startLine,
              endLine: bffMethod.endLine,
              code: bffMethod.body
            },
            similarity,
            differences: this.identifyMethodDifferences([
              { service: adminService.path, signature: adminMethod.signature, parameters: adminMethod.parameters, returnType: adminMethod.returnType, isAsync: adminMethod.isAsync },
              { service: bffService.path, signature: bffMethod.signature, parameters: bffMethod.parameters, returnType: bffMethod.returnType, isAsync: bffMethod.isAsync }
            ])
          });
        }
      }
    }
    
    // Compare interfaces
    for (const adminInterface of adminService.interfaces) {
      const bffInterface = bffService.interfaces.find(i => i.name === adminInterface.name);
      if (bffInterface) {
        duplicatedElements.push({
          type: 'interface',
          name: adminInterface.name,
          adminLocation: {
            file: adminService.path,
            startLine: adminInterface.line,
            endLine: adminInterface.line,
            code: adminInterface.body
          },
          bffLocation: {
            file: bffService.path,
            startLine: bffInterface.line,
            endLine: bffInterface.line,
            code: bffInterface.body
          },
          similarity: 0.9, // Simplified
          differences: []
        });
      }
    }
    
    const consolidationStrategy = this.createCrossServiceStrategy(adminService, bffService, duplicatedElements);
    const sharedPackageCandidate = this.createSharedPackageCandidate(adminService, bffService, duplicatedElements);
    
    return {
      adminService: adminService.path,
      bffService: bffService.path,
      duplicatedElements,
      consolidationStrategy,
      sharedPackageCandidate
    };
  }

  private createCrossServiceStrategy(adminService: ServiceInfo, bffService: ServiceInfo, duplicatedElements: DuplicatedElement[]): CrossServiceStrategy {
    const elementCount = duplicatedElements.length;
    
    if (elementCount > 5) {
      return {
        approach: 'shared_package',
        rationale: 'High duplication warrants shared package creation',
        migrationSteps: [
          'Create shared package',
          'Move common functionality',
          'Update imports in both services',
          'Remove duplicate code'
        ],
        estimatedEffort: 'high'
      };
    } else if (elementCount > 2) {
      return {
        approach: 'shared_package',
        rationale: 'Moderate duplication can be consolidated',
        migrationSteps: [
          'Create shared utility package',
          'Extract common methods',
          'Update service dependencies'
        ],
        estimatedEffort: 'medium'
      };
    } else {
      return {
        approach: 'split_responsibility',
        rationale: 'Low duplication, consider splitting responsibilities',
        migrationSteps: [
          'Analyze service boundaries',
          'Determine ownership',
          'Refactor if necessary'
        ],
        estimatedEffort: 'low'
      };
    }
  }

  private createSharedPackageCandidate(adminService: ServiceInfo, bffService: ServiceInfo, duplicatedElements: DuplicatedElement[]): SharedPackageCandidate {
    const serviceName = adminService.name.replace('Service', '');
    const packageName = `@subway/shared-${serviceName.toLowerCase()}`;
    
    return {
      packageName,
      description: `Shared ${serviceName} functionality extracted from admin and BFF services`,
      contents: duplicatedElements.map(e => e.name),
      dependencies: [...new Set([...adminService.imports, ...bffService.imports])],
      consumers: [adminService.path, bffService.path]
    };
  }
}

// Supporting interfaces
interface ServiceInfo {
  name: string;
  path: string;
  type: 'admin' | 'bff';
  content: string;
  methods: MethodInfo[];
  interfaces: InterfaceInfo[];
  imports: string[];
  exports: string[];
  linesOfCode: number;
  complexity: number;
}

interface MethodInfo {
  name: string;
  signature: string;
  parameters: Parameter[];
  returnType: string;
  isAsync: boolean;
  startLine: number;
  endLine: number;
  body: string;
}

interface InterfaceInfo {
  name: string;
  body: string;
  line: number;
}

interface SimilarityResult {
  score: number;
  methodSimilarity: number;
  interfaceSimilarity: number;
  importSimilarity: number;
  structuralSimilarity: number;
  commonMethods: string[];
  commonInterfaces: string[];
  commonImports: string[];
}

interface InterfaceUsageAnalysis {
  usageCount: number;
  potentialUsages: string[];
  safety: 'safe' | 'risky' | 'dangerous';
}