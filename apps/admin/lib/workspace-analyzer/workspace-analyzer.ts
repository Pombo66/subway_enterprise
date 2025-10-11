import { promises as fs } from 'fs';
import path from 'path';
import {
  FileContent,
  ComponentInfo,
  StyleTokens,
  WorkspaceConfig,
  AnalysisError,
  WorkspaceAnalysisResult,
  WorkspaceType,
  PathResolutionOptions
} from './types';
import { 
  ReactComponentParser, 
  ComponentStructure, 
  KPIGridStructure,
  FeaturePanel,
  StyleToken,
  IconAlignment
} from './component-extractor';
import { StyleTokenExtractor, StyleTokenAnalysis } from './style-extractor';
import { FeaturePanelDetector, FeaturePanelAnalysis } from './feature-panel-detector';

/**
 * Dual workspace analyzer that can access both old baseline and current workspace
 * Handles file reading, component extraction, and error management
 */
export class WorkspaceAnalyzer {
  private config: WorkspaceConfig;
  private errors: AnalysisError[] = [];
  private componentParser: ReactComponentParser;
  private styleExtractor: StyleTokenExtractor;
  private panelDetector: FeaturePanelDetector;

  constructor(config: WorkspaceConfig) {
    this.config = config;
    this.componentParser = new ReactComponentParser();
    this.styleExtractor = new StyleTokenExtractor();
    this.panelDetector = new FeaturePanelDetector();
  }

  /**
   * Read file content from old baseline workspace
   */
  async readOldBaseline(relativePath: string): Promise<FileContent | null> {
    return this.readFile('old', relativePath);
  }

  /**
   * Read file content from current workspace
   */
  async readCurrentState(relativePath: string): Promise<FileContent | null> {
    return this.readFile('current', relativePath);
  }

  /**
   * List all components in specified workspace
   */
  async listComponents(workspace: WorkspaceType): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];
    const workspaceRoot = this.getWorkspaceRoot(workspace);
    const targetPath = path.join(workspaceRoot, this.config.targetScope);

    try {
      const files = await this.getAllFiles(targetPath, ['.tsx', '.ts', '.jsx', '.js']);
      
      for (const filePath of files) {
        try {
          const componentInfo = await this.extractComponentInfo(filePath);
          if (componentInfo) {
            components.push(componentInfo);
          }
        } catch (error) {
          this.addError('parse_error', filePath, `Failed to parse component: ${error}`);
        }
      }
    } catch (error) {
      this.addError('path_resolution', targetPath, `Failed to list components: ${error}`);
    }

    return components;
  }

  /**
   * Extract styling tokens from workspace
   */
  async extractStyleTokens(workspace: WorkspaceType): Promise<StyleTokens> {
    const tokens: StyleTokens = {
      customProperties: {},
      classNames: [],
      tailwindClasses: [],
      cssVariables: {}
    };

    const workspaceRoot = this.getWorkspaceRoot(workspace);
    const targetPath = path.join(workspaceRoot, this.config.targetScope);

    try {
      const cssFiles = await this.getAllFiles(targetPath, ['.css', '.scss', '.sass']);
      const componentFiles = await this.getAllFiles(targetPath, ['.tsx', '.ts', '.jsx', '.js']);

      // Extract from CSS files
      for (const cssFile of cssFiles) {
        try {
          const content = await this.readFileContent(cssFile);
          if (content) {
            this.extractCSSTokens(content.content, tokens);
          }
        } catch (error) {
          this.addError('parse_error', cssFile, `Failed to parse CSS: ${error}`);
        }
      }

      // Extract from component files
      for (const componentFile of componentFiles) {
        try {
          const content = await this.readFileContent(componentFile);
          if (content) {
            this.extractComponentTokens(content.content, tokens);
          }
        } catch (error) {
          this.addError('parse_error', componentFile, `Failed to parse component tokens: ${error}`);
        }
      }
    } catch (error) {
      this.addError('path_resolution', targetPath, `Failed to extract style tokens: ${error}`);
    }

    return tokens;
  }

  /**
   * Perform comprehensive workspace analysis
   */
  async analyzeWorkspace(workspace: WorkspaceType): Promise<WorkspaceAnalysisResult> {
    const startTime = Date.now();
    this.errors = []; // Reset errors for this analysis

    const [files, components, styleTokens] = await Promise.all([
      this.getAllFileContents(workspace),
      this.listComponents(workspace),
      this.extractStyleTokens(workspace)
    ]);

    const endTime = Date.now();

    return {
      files,
      components,
      styleTokens,
      errors: [...this.errors],
      metadata: {
        totalFiles: files.length + this.errors.filter(e => e.type === 'file_not_found').length,
        analyzedFiles: files.length,
        skippedFiles: this.errors.filter(e => e.type === 'file_not_found').length,
        analysisTime: endTime - startTime
      }
    };
  }

  /**
   * Extract KPI grid structure from dashboard component
   */
  async extractKPIGrid(workspace: WorkspaceType): Promise<KPIGridStructure | null> {
    try {
      const dashboardPath = 'app/dashboard/page.tsx';
      const content = await this.readFile(workspace, dashboardPath);
      
      if (!content) {
        this.addError('file_not_found', dashboardPath, 'Dashboard component not found');
        return null;
      }

      const kpiGrid = this.componentParser.extractKPIGrid(content.content, content.path);
      
      // Merge errors from component parser
      this.errors.push(...this.componentParser.getErrors());
      this.componentParser.clearErrors();
      
      return kpiGrid;
    } catch (error) {
      this.addError('parse_error', 'kpi-extraction', `Failed to extract KPI grid: ${error}`);
      return null;
    }
  }

  /**
   * Extract comprehensive style token analysis
   */
  async extractStyleAnalysis(workspace: WorkspaceType): Promise<StyleTokenAnalysis | null> {
    try {
      const themePath = 'app/styles/theme.css';
      const dashboardPath = 'app/dashboard/page.tsx';
      
      const [themeContent, dashboardContent] = await Promise.all([
        this.readFile(workspace, themePath),
        this.readFile(workspace, dashboardPath)
      ]);

      if (!themeContent) {
        this.addError('file_not_found', themePath, 'Theme CSS not found');
        return null;
      }

      const cssContent = themeContent.content;
      const componentContent = dashboardContent?.content || '';
      
      const analysis = this.styleExtractor.analyzeStyles(cssContent, componentContent, themeContent.path);
      
      // Merge errors from style extractor
      this.errors.push(...this.styleExtractor.getErrors());
      this.styleExtractor.clearErrors();
      
      return analysis;
    } catch (error) {
      this.addError('parse_error', 'style-extraction', `Failed to extract style analysis: ${error}`);
      return null;
    }
  }

  /**
   * Extract feature panel analysis
   */
  async extractFeaturePanelAnalysis(workspace: WorkspaceType): Promise<FeaturePanelAnalysis | null> {
    try {
      const dashboardPath = 'app/dashboard/page.tsx';
      const content = await this.readFile(workspace, dashboardPath);
      
      if (!content) {
        this.addError('file_not_found', dashboardPath, 'Dashboard component not found');
        return null;
      }

      const analysis = this.panelDetector.analyzeFeaturePanels(content.content, content.path);
      
      // Merge errors from panel detector
      this.errors.push(...this.panelDetector.getErrors());
      this.panelDetector.clearErrors();
      
      return analysis;
    } catch (error) {
      this.addError('parse_error', 'panel-extraction', `Failed to extract feature panel analysis: ${error}`);
      return null;
    }
  }

  /**
   * Extract icon alignment information
   */
  async extractIconAlignments(workspace: WorkspaceType): Promise<IconAlignment[]> {
    try {
      const dashboardPath = 'app/dashboard/page.tsx';
      const content = await this.readFile(workspace, dashboardPath);
      
      if (!content) {
        this.addError('file_not_found', dashboardPath, 'Dashboard component not found');
        return [];
      }

      const alignments = this.componentParser.extractIconAlignments(content.content, content.path);
      
      // Merge errors from component parser
      this.errors.push(...this.componentParser.getErrors());
      this.componentParser.clearErrors();
      
      return alignments;
    } catch (error) {
      this.addError('parse_error', 'icon-extraction', `Failed to extract icon alignments: ${error}`);
      return [];
    }
  }

  /**
   * Extract comprehensive component structure
   */
  async extractComponentStructure(workspace: WorkspaceType): Promise<ComponentStructure | null> {
    try {
      const [kpiGrid, featurePanelAnalysis, styleAnalysis, iconAlignments] = await Promise.all([
        this.extractKPIGrid(workspace),
        this.extractFeaturePanelAnalysis(workspace),
        this.extractStyleAnalysis(workspace),
        this.extractIconAlignments(workspace)
      ]);

      if (!kpiGrid || !featurePanelAnalysis || !styleAnalysis) {
        this.addError('parse_error', 'component-structure', 'Failed to extract complete component structure');
        return null;
      }

      return {
        kpiGrid,
        featurePanels: featurePanelAnalysis.panels,
        stylingTokens: styleAnalysis.customProperties,
        iconAlignments
      };
    } catch (error) {
      this.addError('parse_error', 'component-structure', `Failed to extract component structure: ${error}`);
      return null;
    }
  }

  /**
   * Get all errors encountered during analysis
   */
  getErrors(): AnalysisError[] {
    return [...this.errors];
  }

  /**
   * Clear accumulated errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  // Private helper methods

  private async readFile(workspace: WorkspaceType, relativePath: string): Promise<FileContent | null> {
    const workspaceRoot = this.getWorkspaceRoot(workspace);
    const fullPath = path.join(workspaceRoot, this.config.targetScope, relativePath);

    return this.readFileContent(fullPath);
  }

  private async readFileContent(filePath: string, options?: PathResolutionOptions): Promise<FileContent | null> {
    try {
      // Try the provided path first
      let resolvedPath = filePath;
      let stats = await fs.stat(resolvedPath).catch(() => null);

      // If file not found and fallback is enabled, try absolute path
      if (!stats && options?.fallbackToRelative) {
        resolvedPath = path.resolve(filePath);
        stats = await fs.stat(resolvedPath).catch(() => null);
      }

      if (!stats) {
        this.addError('file_not_found', filePath, 'File not found');
        return null;
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      const ext = path.extname(resolvedPath).slice(1);
      
      return {
        path: filePath,
        content,
        type: this.getFileType(ext),
        lastModified: stats.mtime,
        size: stats.size
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          this.addError('file_not_found', filePath, 'File not found');
        } else if (error.message.includes('EACCES')) {
          this.addError('permission_denied', filePath, 'Permission denied');
        } else {
          this.addError('parse_error', filePath, error.message);
        }
      }
      return null;
    }
  }

  private getWorkspaceRoot(workspace: WorkspaceType): string {
    return workspace === 'old' ? this.config.oldRoot : this.config.newRoot;
  }

  private getFileType(extension: string): FileContent['type'] {
    switch (extension.toLowerCase()) {
      case 'tsx':
      case 'jsx':
        return 'tsx';
      case 'ts':
        return 'ts';
      case 'js':
        return 'js';
      case 'css':
      case 'scss':
      case 'sass':
        return 'css';
      case 'json':
        return 'json';
      default:
        return 'ts'; // Default fallback
    }
  }

  private async getAllFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and other common ignore patterns
          if (!this.shouldSkipDirectory(entry.name)) {
            const subFiles = await this.getAllFiles(fullPath, extensions);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.addError('path_resolution', dirPath, `Failed to read directory: ${error}`);
    }

    return files;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipPatterns = [
      'node_modules',
      '.next',
      '.turbo',
      'dist',
      'build',
      '.git',
      'coverage',
      '.nyc_output'
    ];
    return skipPatterns.includes(dirName) || dirName.startsWith('.');
  }

  private async getAllFileContents(workspace: WorkspaceType): Promise<FileContent[]> {
    const workspaceRoot = this.getWorkspaceRoot(workspace);
    const targetPath = path.join(workspaceRoot, this.config.targetScope);
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.scss', '.sass', '.json'];
    
    const filePaths = await this.getAllFiles(targetPath, extensions);
    const fileContents: FileContent[] = [];

    for (const filePath of filePaths) {
      const content = await this.readFileContent(filePath);
      if (content) {
        fileContents.push(content);
      }
    }

    return fileContents;
  }

  private async extractComponentInfo(filePath: string): Promise<ComponentInfo | null> {
    const content = await this.readFileContent(filePath);
    if (!content) return null;

    // Basic component info extraction (can be enhanced with AST parsing)
    const name = path.basename(filePath, path.extname(filePath));
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Simple regex-based extraction (could be replaced with proper AST parsing)
    const exportMatches = content.content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g) || [];
    const importMatches = content.content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    
    const exports = exportMatches.map(match => {
      const nameMatch = match.match(/(\w+)$/);
      return nameMatch ? nameMatch[1] : '';
    }).filter(Boolean);

    const imports = importMatches.map(match => {
      const sourceMatch = match.match(/from\s+['"]([^'"]+)['"]/);
      const importMatch = match.match(/import\s+(.+?)\s+from/);
      
      if (sourceMatch && importMatch) {
        const source = sourceMatch[1];
        const importStr = importMatch[1].trim();
        const isDefault = !importStr.includes('{');
        const imports = isDefault ? [importStr] : 
          importStr.replace(/[{}]/g, '').split(',').map(s => s.trim());
        
        return { source, imports, isDefault };
      }
      return null;
    }).filter(Boolean) as any[];

    return {
      name,
      path: relativePath,
      type: this.determineComponentType(content.content, filePath),
      exports,
      imports
    };
  }

  private determineComponentType(content: string, filePath: string): ComponentInfo['type'] {
    if (filePath.includes('/pages/') || filePath.includes('/app/') && filePath.includes('page.')) {
      return 'page';
    }
    if (filePath.includes('layout.')) {
      return 'layout';
    }
    if (filePath.includes('/hooks/') || content.includes('use') && content.includes('function')) {
      return 'hook';
    }
    if (content.includes('export default function') || content.includes('export const') && content.includes('React')) {
      return 'component';
    }
    return 'utility';
  }

  private extractCSSTokens(cssContent: string, tokens: StyleTokens): void {
    // Extract CSS custom properties (--variable-name)
    const customPropMatches = cssContent.match(/--[\w-]+:\s*[^;]+/g) || [];
    customPropMatches.forEach(match => {
      const [name, value] = match.split(':').map(s => s.trim());
      tokens.customProperties[name] = value;
    });

    // Extract class names
    const classMatches = cssContent.match(/\.[\w-]+/g) || [];
    classMatches.forEach(match => {
      const className = match.slice(1); // Remove the dot
      if (!tokens.classNames.includes(className)) {
        tokens.classNames.push(className);
      }
    });
  }

  private extractComponentTokens(componentContent: string, tokens: StyleTokens): void {
    // Extract Tailwind classes from className attributes
    const classNameMatches = componentContent.match(/className=['"`]([^'"`]+)['"`]/g) || [];
    classNameMatches.forEach(match => {
      const classStr = match.match(/['"`]([^'"`]+)['"`]/)?.[1] || '';
      const classes = classStr.split(/\s+/).filter(Boolean);
      classes.forEach(cls => {
        if (!tokens.tailwindClasses.includes(cls)) {
          tokens.tailwindClasses.push(cls);
        }
      });
    });

    // Extract CSS variables used in style attributes
    const styleMatches = componentContent.match(/style=\{[^}]+\}/g) || [];
    styleMatches.forEach(match => {
      const varMatches = match.match(/var\(--[\w-]+\)/g) || [];
      varMatches.forEach(varMatch => {
        const varName = varMatch.match(/--[\w-]+/)?.[0];
        if (varName) {
          tokens.cssVariables[varName] = varMatch;
        }
      });
    });
  }

  private addError(type: AnalysisError['type'], path: string, message: string): void {
    this.errors.push({
      type,
      path,
      message,
      timestamp: new Date()
    });
  }
}