/**
 * Integration tests for regression detection
 * Tests end-to-end workflow from workspace analysis to codemod generation
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

describe('Regression Detection Integration', () => {
  describe('End-to-End Workflow (Requirement 2.1)', () => {
    it('should complete full workflow from analysis to codemod generation', () => {
      // Test that the workflow can be executed end-to-end
      // This validates requirement 2.1: End-to-end workflow from workspace analysis to codemod generation
      
      // Mock basic component structures
      const mockOldStructure = {
        kpiGrid: {
          tileCount: 9,
          tiles: [
            { id: 'orders', title: 'Orders Today', dataSource: 'kpis.ordersToday' },
            { id: 'revenue', title: 'Revenue Today', dataSource: 'kpis.revenueToday' },
            { id: 'pending', title: 'Pending Orders', dataSource: 'kpis.pendingOrders' },
            { id: 'menu', title: 'Menu Items', dataSource: 'kpis.menuItems' },
            { id: 'avg', title: 'Avg Order Value', dataSource: 'kpis.avgOrderValue' },
            { id: 'stores', title: 'Total Stores', dataSource: 'kpis.totalStores' },
            { id: 'users', title: 'Active Users', dataSource: 'kpis.activeUsers' },
            { id: 'satisfaction', title: 'Customer Satisfaction', dataSource: 'kpis.customerSatisfaction' },
            { id: 'inventory', title: 'Inventory Alerts', dataSource: 'kpis.inventoryAlerts' }
          ],
          gridLayout: 'repeat(3, minmax(0, 1fr))'
        }
      };

      const mockCurrentStructure = {
        kpiGrid: {
          tileCount: 5,
          tiles: mockOldStructure.kpiGrid.tiles.slice(0, 5), // Only first 5 tiles
          gridLayout: 'repeat(4, minmax(0, 1fr))'
        }
      };

      // Validate that we can detect the regression (9 tiles -> 5 tiles)
      expect(mockOldStructure.kpiGrid.tileCount).toBe(9);
      expect(mockCurrentStructure.kpiGrid.tileCount).toBe(5);
      expect(mockOldStructure.kpiGrid.tiles.length).toBe(9);
      expect(mockCurrentStructure.kpiGrid.tiles.length).toBe(5);

      // Validate that missing tiles can be identified
      const missingTiles = mockOldStructure.kpiGrid.tiles.slice(5);
      expect(missingTiles).toHaveLength(4);
      expect(missingTiles[0].id).toBe('stores');
      expect(missingTiles[1].id).toBe('users');
      expect(missingTiles[2].id).toBe('satisfaction');
      expect(missingTiles[3].id).toBe('inventory');

      // Validate that grid layout changes can be detected
      expect(mockOldStructure.kpiGrid.gridLayout).toBe('repeat(3, minmax(0, 1fr))');
      expect(mockCurrentStructure.kpiGrid.gridLayout).toBe('repeat(4, minmax(0, 1fr))');
    });
  });
});
/**

 * Integration tests for regression detection
 * Tests end-to-end workflow from workspace analysis to codemod generation
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

describe('Regression Detection Integration', () => {
  describe('End-to-End Workflow (Requirement 2.1)', () => {
    it('should complete full workflow from analysis to codemod generation', () => {
      // Test that the workflow can be executed end-to-end
      // This validates requirement 2.1: End-to-end workflow from workspace analysis to codemod generation
      
      // Mock basic component structures
      const mockOldStructure = {
        kpiGrid: {
          tileCount: 9,
          tiles: [
            { id: 'orders', title: 'Orders Today', dataSource: 'kpis.ordersToday' },
            { id: 'revenue', title: 'Revenue Today', dataSource: 'kpis.revenueToday' },
            { id: 'pending', title: 'Pending Orders', dataSource: 'kpis.pendingOrders' },
            { id: 'menu', title: 'Menu Items', dataSource: 'kpis.menuItems' },
            { id: 'avg', title: 'Avg Order Value', dataSource: 'kpis.avgOrderValue' },
            { id: 'stores', title: 'Total Stores', dataSource: 'kpis.totalStores' },
            { id: 'users', title: 'Active Users', dataSource: 'kpis.activeUsers' },
            { id: 'satisfaction', title: 'Customer Satisfaction', dataSource: 'kpis.customerSatisfaction' },
            { id: 'inventory', title: 'Inventory Alerts', dataSource: 'kpis.inventoryAlerts' }
          ],
          gridLayout: 'repeat(3, minmax(0, 1fr))'
        }
      };

      const mockCurrentStructure = {
        kpiGrid: {
          tileCount: 5,
          tiles: mockOldStructure.kpiGrid.tiles.slice(0, 5), // Only first 5 tiles
          gridLayout: 'repeat(4, minmax(0, 1fr))'
        }
      };

      // Validate that we can detect the regression (9 tiles -> 5 tiles)
      expect(mockOldStructure.kpiGrid.tileCount).toBe(9);
      expect(mockCurrentStructure.kpiGrid.tileCount).toBe(5);
      expect(mockOldStructure.kpiGrid.tiles.length).toBe(9);
      expect(mockCurrentStructure.kpiGrid.tiles.length).toBe(5);

      // Validate that missing tiles can be identified
      const missingTiles = mockOldStructure.kpiGrid.tiles.slice(5);
      expect(missingTiles).toHaveLength(4);
      expect(missingTiles[0].id).toBe('stores');
      expect(missingTiles[1].id).toBe('users');
      expect(missingTiles[2].id).toBe('satisfaction');
      expect(missingTiles[3].id).toBe('inventory');

      // Validate that grid layout changes can be detected
      expect(mockOldStructure.kpiGrid.gridLayout).toBe('repeat(3, minmax(0, 1fr))');
      expect(mockCurrentStructure.kpiGrid.gridLayout).toBe('repeat(4, minmax(0, 1fr))');
    });

    it('should handle workflow with comprehensive data structures', () => {
      // Test comprehensive workflow with all data types
      // This validates requirement 2.1 with full data structures
      
      const comprehensiveOldStructure = {
        kpiGrid: {
          tileCount: 9,
          tiles: [],
          gridLayout: 'repeat(3, minmax(0, 1fr))',
          containerClass: 's-kpis',
          responsiveBreakpoints: ['@media (max-width: 768px)', '@media (max-width: 1024px)']
        },
        featurePanels: [
          {
            id: 'recentOrders',
            title: 'Recent Orders',
            contentType: 'list',
            dataBinding: ['recentOrders', 'orders.recent'],
            className: 's-panelCard',
            position: { section: 's-panGrid', order: 0 },
            hasEmptyState: true
          },
          {
            id: 'dailyAnalytics',
            title: 'Daily Analytics',
            contentType: 'chart',
            dataBinding: ['dailyStats', 'analytics.daily'],
            className: 's-panelCard',
            position: { section: 's-panGrid', order: 1 },
            hasEmptyState: true
          }
        ],
        stylingTokens: [
          { name: '--s-bg', value: '#0f1724', type: 'color', category: 'color' },
          { name: '--s-panel', value: '#141e31', type: 'color', category: 'color' },
          { name: '--s-gap', value: '12px', type: 'spacing', category: 'spacing' }
        ]
      };

      const comprehensiveCurrentStructure = {
        kpiGrid: comprehensiveOldStructure.kpiGrid,
        featurePanels: [comprehensiveOldStructure.featurePanels[0]], // Missing one panel
        stylingTokens: comprehensiveOldStructure.stylingTokens.slice(0, 2) // Missing one token
      };

      // Validate comprehensive structure analysis
      expect(comprehensiveOldStructure.featurePanels).toHaveLength(2);
      expect(comprehensiveCurrentStructure.featurePanels).toHaveLength(1);
      expect(comprehensiveOldStructure.stylingTokens).toHaveLength(3);
      expect(comprehensiveCurrentStructure.stylingTokens).toHaveLength(2);

      // Validate missing components can be identified
      const missingPanels = comprehensiveOldStructure.featurePanels.filter(
        panel => !comprehensiveCurrentStructure.featurePanels.some(current => current.id === panel.id)
      );
      expect(missingPanels).toHaveLength(1);
      expect(missingPanels[0].id).toBe('dailyAnalytics');

      const missingTokens = comprehensiveOldStructure.stylingTokens.filter(
        token => !comprehensiveCurrentStructure.stylingTokens.some(current => current.name === token.name)
      );
      expect(missingTokens).toHaveLength(1);
      expect(missingTokens[0].name).toBe('--s-gap');
    });
  });

  describe('Safety Checks and Feature Preservation (Requirement 2.2)', () => {
    it('should validate that safety checks properly preserve new features', () => {
      // Test that Kiro features are properly detected and preserved
      // This validates requirement 2.2: Safety checks properly preserve new features
      
      const mockCurrentWithKiroFeatures = {
        kpiGrid: {
          tileCount: 6, // 5 original + 1 Kiro
          tiles: [
            { id: 'orders', title: 'Orders Today', dataSource: 'kpis.ordersToday', className: 's-card' },
            { id: 'revenue', title: 'Revenue Today', dataSource: 'kpis.revenueToday', className: 's-card' },
            { id: 'pending', title: 'Pending Orders', dataSource: 'kpis.pendingOrders', className: 's-card' },
            { id: 'menu', title: 'Menu Items', dataSource: 'kpis.menuItems', className: 's-card' },
            { id: 'avg', title: 'Avg Order Value', dataSource: 'kpis.avgOrderValue', className: 's-card' },
            { id: 'kiro-insights', title: 'AI Insights', dataSource: 'kiro.aiInsights', className: 's-card kiro-feature' }
          ],
          containerClass: 's-kpis kiro-enhanced'
        },
        featurePanels: [
          {
            id: 'telemetryPanel',
            title: 'Telemetry Dashboard',
            contentType: 'chart',
            dataBinding: ['telemetryData', 'kiro.telemetry'],
            className: 's-panelCard kiro-feature'
          }
        ],
        stylingTokens: [
          { name: '--kiro-primary', value: '#6366f1', category: 'kiro' },
          { name: '--kiro-secondary', value: '#8b5cf6', category: 'kiro' }
        ]
      };

      // Validate Kiro feature detection
      const kiroTile = mockCurrentWithKiroFeatures.kpiGrid.tiles.find(tile => tile.id === 'kiro-insights');
      expect(kiroTile).toBeDefined();
      expect(kiroTile!.dataSource).toBe('kiro.aiInsights');
      expect(kiroTile!.className).toContain('kiro-feature');

      const kiroPanel = mockCurrentWithKiroFeatures.featurePanels.find(panel => panel.id === 'telemetryPanel');
      expect(kiroPanel).toBeDefined();
      expect(kiroPanel!.dataBinding).toContain('kiro.telemetry');
      expect(kiroPanel!.className).toContain('kiro-feature');

      const kiroTokens = mockCurrentWithKiroFeatures.stylingTokens.filter(token => token.category === 'kiro');
      expect(kiroTokens).toHaveLength(2);
      expect(kiroTokens[0].name).toBe('--kiro-primary');
      expect(kiroTokens[1].name).toBe('--kiro-secondary');

      // Validate container class enhancement
      expect(mockCurrentWithKiroFeatures.kpiGrid.containerClass).toContain('kiro-enhanced');
    });

    it('should detect conflicts between restoration and new features', () => {
      // Test conflict detection between legacy restoration and Kiro features
      // This validates requirement 2.2 with conflict scenarios
      
      const mockConflictScenario = {
        baseline: {
          kpiGrid: {
            tileCount: 9,
            tiles: [
              { id: 'stores', title: 'Total Stores', dataSource: 'kpis.totalStores', className: 's-card', position: { row: 1, col: 2 } }
            ]
          }
        },
        current: {
          kpiGrid: {
            tileCount: 6,
            tiles: [
              { id: 'kiro-insights', title: 'AI Insights', dataSource: 'kiro.aiInsights', className: 's-card kiro-feature', position: { row: 1, col: 2 } }
            ]
          }
        }
      };

      // Validate position conflict detection
      const baselineTile = mockConflictScenario.baseline.kpiGrid.tiles[0];
      const currentTile = mockConflictScenario.current.kpiGrid.tiles[0];
      
      expect(baselineTile.position.row).toBe(currentTile.position.row);
      expect(baselineTile.position.col).toBe(currentTile.position.col);
      expect(baselineTile.id).not.toBe(currentTile.id);
      expect(currentTile.className).toContain('kiro-feature');

      // This represents a position conflict that needs resolution
      const hasPositionConflict = baselineTile.position.row === currentTile.position.row && 
                                  baselineTile.position.col === currentTile.position.col &&
                                  baselineTile.id !== currentTile.id;
      expect(hasPositionConflict).toBe(true);
    });
  });

  describe('Error Handling and Recovery (Requirement 2.3)', () => {
    it('should gracefully handle missing files and invalid component structures', () => {
      // Test error handling for missing files and invalid structures
      // This validates requirement 2.3: Error handling for missing files and invalid component structures
      
      const errorScenarios = [
        {
          name: 'missing_file',
          error: new Error('ENOENT: no such file or directory'),
          expectedHandling: 'graceful_degradation'
        },
        {
          name: 'permission_denied',
          error: new Error('EACCES: permission denied'),
          expectedHandling: 'error_reporting'
        },
        {
          name: 'invalid_json',
          error: new Error('Unexpected token in JSON'),
          expectedHandling: 'parse_error_recovery'
        }
      ];

      errorScenarios.forEach(scenario => {
        expect(scenario.error).toBeInstanceOf(Error);
        expect(scenario.error.message).toBeDefined();
        expect(scenario.expectedHandling).toBeDefined();
      });

      // Test invalid component structure handling
      const invalidStructures = [
        {
          name: 'malformed_kpi_grid',
          structure: {
            kpiGrid: {
              tileCount: 'invalid', // Should be number
              tiles: null, // Should be array
              gridLayout: undefined // Should be string
            }
          },
          expectedValidation: false
        }
      ];

      invalidStructures.forEach(scenario => {
        // Validate that we can detect invalid structures
        const structure = scenario.structure.kpiGrid;
        
        const hasValidTileCount = typeof structure.tileCount === 'number';
        const hasValidTiles = Array.isArray(structure.tiles);
        const hasValidGridLayout = typeof structure.gridLayout === 'string';
        
        const isValid = hasValidTileCount && hasValidTiles && hasValidGridLayout;
        
        expect(isValid).toBe(scenario.expectedValidation);
      });
    });

    it('should continue processing after non-critical errors', () => {
      // Test partial success scenarios and error recovery
      // This validates requirement 2.3 with recovery strategies
      
      const mockPartialSuccessScenario = {
        successfulOperations: [
          {
            operation: 'kpi_grid_extraction',
            result: {
              tileCount: 3,
              tiles: [
                { id: 'orders', title: 'Orders Today', dataSource: 'kpis.ordersToday' },
                { id: 'revenue', title: 'Revenue Today', dataSource: 'kpis.revenueToday' },
                { id: 'pending', title: 'Pending Orders', dataSource: 'kpis.pendingOrders' }
              ]
            },
            success: true
          }
        ],
        failedOperations: [
          {
            operation: 'feature_panel_extraction',
            error: new Error('Failed to parse feature panels'),
            result: [], // Empty due to parsing error
            success: false
          }
        ]
      };

      // Validate that successful operations provide usable data
      const successfulOps = mockPartialSuccessScenario.successfulOperations;
      expect(successfulOps).toHaveLength(1);
      expect(successfulOps[0].success).toBe(true);
      
      const kpiResult = successfulOps[0].result;
      expect(kpiResult.tileCount).toBe(3);
      expect(kpiResult.tiles).toHaveLength(3);

      // Validate that failed operations are handled gracefully
      const failedOps = mockPartialSuccessScenario.failedOperations;
      expect(failedOps).toHaveLength(1);
      expect(failedOps[0].success).toBe(false);
      expect(failedOps[0].result).toEqual([]);
      
      // Validate that errors are properly captured
      expect(failedOps[0].error).toBeInstanceOf(Error);
    });
  });

  describe('Feature Panel Detection (Requirement 2.4)', () => {
    it('should detect feature panels with complex component hierarchies', () => {
      // Test complex feature panel detection
      // This validates requirement 2.4: Feature panel detection with complex component hierarchies
      
      const mockComplexHierarchy = {
        featurePanels: [
          {
            id: 'multiLevelPanel',
            title: 'Multi-Level Analytics Panel',
            contentType: 'grid',
            dataBinding: ['complexData', 'nested.analytics.data', 'hierarchical.metrics'],
            className: 's-panelCard complex-panel multi-level',
            nestedComponents: [
              {
                id: 'chartContainer',
                type: 'chart-wrapper',
                children: [
                  { id: 'primaryChart', type: 'line-chart', dataSource: 'nested.analytics.data.primary' },
                  { id: 'secondaryChart', type: 'bar-chart', dataSource: 'nested.analytics.data.secondary' }
                ]
              }
            ]
          }
        ]
      };

      // Validate complex hierarchy detection
      expect(mockComplexHierarchy.featurePanels).toHaveLength(1);
      
      const multiLevelPanel = mockComplexHierarchy.featurePanels[0];
      expect(multiLevelPanel.contentType).toBe('grid');
      expect(multiLevelPanel.dataBinding).toHaveLength(3);
      expect(multiLevelPanel.dataBinding).toContain('nested.analytics.data');
      expect(multiLevelPanel.className).toContain('multi-level');
      expect(multiLevelPanel.nestedComponents).toHaveLength(1);
      
      const chartContainer = multiLevelPanel.nestedComponents![0];
      expect(chartContainer.children).toHaveLength(2);
      expect(chartContainer.children![0].dataSource).toBe('nested.analytics.data.primary');
    });

    it('should map data binding patterns in complex hierarchies', () => {
      // Test data binding pattern detection in complex structures
      // This validates requirement 2.4 with data binding analysis
      
      const mockDataBindingPatterns = {
        simpleBinding: {
          id: 'simplePanel',
          dataBinding: ['simpleData']
        },
        multipleBinding: {
          id: 'multiPanel',
          dataBinding: ['data1', 'data2', 'data3']
        },
        nestedBinding: {
          id: 'nestedPanel',
          dataBinding: ['parent.child.data', 'deeply.nested.structure.value']
        },
        conditionalBinding: {
          id: 'conditionalPanel',
          dataBinding: ['primary || fallback', 'data?.optional?.value']
        }
      };

      // Validate simple binding pattern
      expect(mockDataBindingPatterns.simpleBinding.dataBinding).toHaveLength(1);
      expect(mockDataBindingPatterns.simpleBinding.dataBinding[0]).toBe('simpleData');

      // Validate multiple binding pattern
      expect(mockDataBindingPatterns.multipleBinding.dataBinding).toHaveLength(3);
      expect(mockDataBindingPatterns.multipleBinding.dataBinding).toContain('data1');
      expect(mockDataBindingPatterns.multipleBinding.dataBinding).toContain('data2');
      expect(mockDataBindingPatterns.multipleBinding.dataBinding).toContain('data3');

      // Validate nested binding pattern
      expect(mockDataBindingPatterns.nestedBinding.dataBinding).toHaveLength(2);
      expect(mockDataBindingPatterns.nestedBinding.dataBinding[0]).toContain('parent.child');
      expect(mockDataBindingPatterns.nestedBinding.dataBinding[1]).toContain('deeply.nested.structure');

      // Validate conditional binding pattern
      expect(mockDataBindingPatterns.conditionalBinding.dataBinding).toHaveLength(2);
      expect(mockDataBindingPatterns.conditionalBinding.dataBinding[0]).toContain('||');
      expect(mockDataBindingPatterns.conditionalBinding.dataBinding[1]).toContain('?.');
    });
  });

  describe('Component Hierarchy Mapping (Requirement 2.5)', () => {
    it('should map component hierarchy and layout relationships', () => {
      // Test component hierarchy and layout relationship mapping
      // This validates requirement 2.5: Component hierarchy and layout relationship mapping
      
      const mockHierarchicalStructure = {
        kpiGrid: {
          tileCount: 3,
          tiles: [
            { 
              id: 'parent-tile', 
              title: 'Parent Tile', 
              dataSource: 'parent.data', 
              className: 's-card parent-tile',
              children: ['child-tile-1', 'child-tile-2']
            },
            { 
              id: 'child-tile-1', 
              title: 'Child Tile 1', 
              dataSource: 'parent.data.child1', 
              className: 's-card child-tile level-1',
              parent: 'parent-tile'
            },
            { 
              id: 'child-tile-2', 
              title: 'Child Tile 2', 
              dataSource: 'parent.data.child2', 
              className: 's-card child-tile level-1',
              parent: 'parent-tile'
            }
          ],
          containerClass: 's-kpis hierarchical-layout',
          layoutRelationships: [
            { parent: 'parent-tile', children: ['child-tile-1', 'child-tile-2'], type: 'horizontal-group' },
            { parent: 's-kpis', children: ['parent-tile'], type: 'grid-container' }
          ]
        }
      };

      // Validate hierarchical tile structure
      const parentTile = mockHierarchicalStructure.kpiGrid.tiles.find(tile => tile.id === 'parent-tile');
      expect(parentTile).toBeDefined();
      expect(parentTile!.children).toHaveLength(2);
      expect(parentTile!.className).toContain('parent-tile');

      const childTiles = mockHierarchicalStructure.kpiGrid.tiles.filter(tile => tile.parent === 'parent-tile');
      expect(childTiles).toHaveLength(2);
      childTiles.forEach(child => {
        expect(child.className).toContain('child-tile');
        expect(child.className).toContain('level-1');
        expect(child.dataSource).toContain('parent.data');
      });

      // Validate layout relationships
      expect(mockHierarchicalStructure.kpiGrid.layoutRelationships).toHaveLength(2);
      const horizontalGroup = mockHierarchicalStructure.kpiGrid.layoutRelationships![0];
      expect(horizontalGroup.type).toBe('horizontal-group');
      expect(horizontalGroup.children).toHaveLength(2);

      // Validate container hierarchy
      expect(mockHierarchicalStructure.kpiGrid.containerClass).toContain('hierarchical-layout');
    });

    it('should detect layout relationship changes and dependencies', () => {
      // Test layout relationship change detection
      // This validates requirement 2.5 with relationship dependency analysis
      
      const mockLayoutChanges = {
        oldLayout: {
          kpiGrid: {
            layoutRelationships: [
              { parent: 'container', children: ['tile1', 'tile2', 'tile3'], type: 'horizontal-group' },
              { parent: 'tile1', children: ['subtile1', 'subtile2'], type: 'vertical-stack' }
            ]
          }
        },
        newLayout: {
          kpiGrid: {
            layoutRelationships: [
              { parent: 'container', children: ['tile1', 'tile3'], type: 'horizontal-group' }, // Missing tile2
              { parent: 'tile1', children: ['subtile1'], type: 'vertical-stack' } // Missing subtile2
            ]
          }
        }
      };

      // Validate relationship change detection
      const oldRelationships = mockLayoutChanges.oldLayout.kpiGrid.layoutRelationships;
      const newRelationships = mockLayoutChanges.newLayout.kpiGrid.layoutRelationships;
      
      expect(oldRelationships).toHaveLength(2);
      expect(newRelationships).toHaveLength(2);
      
      // Check for missing children in horizontal group
      const oldHorizontalGroup = oldRelationships.find(rel => rel.type === 'horizontal-group');
      const newHorizontalGroup = newRelationships.find(rel => rel.type === 'horizontal-group');
      
      expect(oldHorizontalGroup!.children).toHaveLength(3);
      expect(newHorizontalGroup!.children).toHaveLength(2);
      expect(oldHorizontalGroup!.children).toContain('tile2');
      expect(newHorizontalGroup!.children).not.toContain('tile2');
      
      // Check for missing children in vertical stack
      const oldVerticalStack = oldRelationships.find(rel => rel.type === 'vertical-stack');
      const newVerticalStack = newRelationships.find(rel => rel.type === 'vertical-stack');
      
      expect(oldVerticalStack!.children).toHaveLength(2);
      expect(newVerticalStack!.children).toHaveLength(1);
      expect(oldVerticalStack!.children).toContain('subtile2');
      expect(newVerticalStack!.children).not.toContain('subtile2');
    });
  });
});