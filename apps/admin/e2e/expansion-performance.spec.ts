import { test, expect } from '@playwright/test';

test.describe('Expansion Predictor Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stores/map');
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]', { timeout: 5000 });
  });

  test('should handle Web Worker calculations within performance thresholds', async ({ page }) => {
    // Enable performance monitoring
    await page.evaluate(() => {
      (window as any).performanceMonitoring = true;
    });

    // Set up high-intensity calculation
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '100');

    const startTime = Date.now();
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 20000 });
    const endTime = Date.now();

    const calculationTime = endTime - startTime;
    
    // Should complete within 15 seconds
    expect(calculationTime).toBeLessThan(15000);

    // Check Web Worker performance metrics
    const workerMetrics = await page.evaluate(() => {
      return (window as any).workerPerformanceMetrics;
    });

    if (workerMetrics) {
      expect(workerMetrics.calculationTime).toBeLessThan(10000); // 10 seconds max
      expect(workerMetrics.memoryUsage).toBeLessThan(200); // 200MB max
    }

    // Verify 300 suggestion cap is enforced
    const suggestionCount = await page.locator('[data-testid="expansion-marker"]').count();
    expect(suggestionCount).toBeLessThanOrEqual(300);
  });

  test('should maintain 60fps during map interactions', async ({ page }) => {
    // Generate suggestions first
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '75');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Start frame rate monitoring
    await page.evaluate(() => {
      (window as any).frameRateMonitor = {
        frames: 0,
        startTime: performance.now(),
        frameRate: 60
      };
      
      function countFrames() {
        (window as any).frameRateMonitor.frames++;
        requestAnimationFrame(countFrames);
      }
      requestAnimationFrame(countFrames);
    });

    // Perform intensive map interactions
    const mapContainer = page.locator('[data-testid="living-map"]');
    
    // Zoom in and out rapidly
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Equal'); // Zoom in
      await page.waitForTimeout(100);
      await page.keyboard.press('Minus'); // Zoom out
      await page.waitForTimeout(100);
    }

    // Pan around the map
    await mapContainer.dragTo(mapContainer, {
      sourcePosition: { x: 300, y: 300 },
      targetPosition: { x: 400, y: 200 }
    });

    await page.waitForTimeout(1000);

    // Check frame rate
    const frameRate = await page.evaluate(() => {
      const monitor = (window as any).frameRateMonitor;
      const elapsed = performance.now() - monitor.startTime;
      return (monitor.frames / elapsed) * 1000;
    });

    // Should maintain at least 30fps during interactions
    expect(frameRate).toBeGreaterThan(30);
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Monitor memory usage
    const getMemoryUsage = async () => {
      return await page.evaluate(() => {
        if ('memory' in performance) {
          const memInfo = (performance as any).memory;
          return Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // MB
        }
        return 0;
      });
    };

    const initialMemory = await getMemoryUsage();

    // Generate multiple sets of suggestions
    const scopes = [
      { type: 'country', value: 'US' },
      { type: 'country', value: 'CA' },
      { type: 'state', value: 'CA' },
      { type: 'state', value: 'NY' }
    ];

    for (const scope of scopes) {
      await page.selectOption('[data-testid="scope-type-selector"]', scope.type);
      if (scope.type === 'country') {
        await page.selectOption('[data-testid="country-selector"]', scope.value);
      } else {
        await page.selectOption('[data-testid="state-selector"]', scope.value);
      }
      
      await page.fill('[data-testid="intensity-slider"]', '50');
      await page.click('[data-testid="recompute-button"]');
      await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });
      
      await page.waitForTimeout(1000); // Let memory settle
    }

    const finalMemory = await getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100);
  });

  test('should handle rapid scope changes without performance degradation', async ({ page }) => {
    const performanceMetrics: number[] = [];

    // Rapidly change scopes and measure response times
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      
      // Alternate between different scopes
      if (i % 2 === 0) {
        await page.selectOption('[data-testid="scope-type-selector"]', 'country');
        await page.selectOption('[data-testid="country-selector"]', 'US');
      } else {
        await page.selectOption('[data-testid="scope-type-selector"]', 'state');
        await page.selectOption('[data-testid="state-selector"]', 'CA');
      }
      
      await page.fill('[data-testid="intensity-slider"]', (30 + i * 5).toString());
      await page.click('[data-testid="recompute-button"]');
      await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 10000 });
      
      const endTime = Date.now();
      performanceMetrics.push(endTime - startTime);
    }

    // Performance should not degrade significantly over time
    const firstHalf = performanceMetrics.slice(0, 5);
    const secondHalf = performanceMetrics.slice(5);
    
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    // Second half should not be more than 50% slower than first half
    expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
  });

  test('should handle custom area drawing performance', async ({ page }) => {
    await page.selectOption('[data-testid="scope-type-selector"]', 'custom_area');
    await page.click('[data-testid="draw-polygon-button"]');

    const mapContainer = page.locator('[data-testid="living-map"]');
    const startTime = Date.now();

    // Draw a complex polygon with many vertices
    const vertices = 20;
    const centerX = 400;
    const centerY = 300;
    const radius = 100;

    for (let i = 0; i < vertices; i++) {
      const angle = (i / vertices) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      await mapContainer.click({ position: { x, y } });
      await page.waitForTimeout(50); // Small delay between clicks
    }

    // Close the polygon
    const firstX = centerX + Math.cos(0) * radius;
    const firstY = centerY + Math.sin(0) * radius;
    await mapContainer.click({ position: { x: firstX, y: firstY } });

    const drawingTime = Date.now() - startTime;

    // Drawing should complete within reasonable time
    expect(drawingTime).toBeLessThan(5000);

    // Verify custom area badge appears quickly
    await page.waitForSelector('[data-testid="custom-area-badge"]', { timeout: 2000 });
    await expect(page.locator('[data-testid="custom-area-badge"]')).toContainText('km²');

    // Generate suggestions for the custom area
    await page.fill('[data-testid="intensity-slider"]', '50');
    const computeStartTime = Date.now();
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });
    const computeTime = Date.now() - computeStartTime;

    // Custom area computation should be efficient
    expect(computeTime).toBeLessThan(10000);
  });

  test('should handle zoom-aware rendering performance', async ({ page }) => {
    // Generate suggestions
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '100'); // Maximum suggestions
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 20000 });

    // Test zoom level transitions
    const zoomLevels = [3, 6, 10, 15];
    const transitionTimes: number[] = [];

    for (const zoomLevel of zoomLevels) {
      const startTime = Date.now();
      
      await page.evaluate((zoom) => {
        const map = (window as any).mapInstance;
        if (map) map.setZoom(zoom);
      }, zoomLevel);

      // Wait for zoom transition and layer switching
      await page.waitForTimeout(1000);
      
      const endTime = Date.now();
      transitionTimes.push(endTime - startTime);

      // Verify appropriate visualization is shown
      if (zoomLevel <= 4) {
        await expect(page.locator('[data-testid="expansion-heatmap"]')).toBeVisible();
      } else if (zoomLevel >= 5 && zoomLevel <= 7) {
        await expect(page.locator('[data-testid="expansion-clusters"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="expansion-markers"]')).toBeVisible();
      }
    }

    // All zoom transitions should be smooth (under 2 seconds)
    transitionTimes.forEach(time => {
      expect(time).toBeLessThan(2000);
    });
  });

  test('should handle API response caching effectively', async ({ page }) => {
    // First request - should be uncached
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '50');

    const firstRequestStart = Date.now();
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });
    const firstRequestTime = Date.now() - firstRequestStart;

    // Second identical request - should be cached
    const secondRequestStart = Date.now();
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 5000 });
    const secondRequestTime = Date.now() - secondRequestStart;

    // Cached request should be significantly faster
    expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
    expect(secondRequestTime).toBeLessThan(2000); // Should be under 2 seconds
  });

  test('should maintain performance with pipeline operations', async ({ page }) => {
    // Generate suggestions
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '75');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Add many items to pipeline rapidly
    const suggestions = page.locator('[data-testid="expansion-marker"]');
    const addToPipelineTimes: number[] = [];

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      
      await suggestions.nth(i).hover();
      await page.waitForSelector('[data-testid="suggestion-popover"]');
      await page.click('[data-testid="send-to-pipeline-button"]');
      
      // Wait for pipeline to update
      await expect(page.locator('[data-testid="pipeline-stats"]')).toContainText((i + 1).toString());
      
      const endTime = Date.now();
      addToPipelineTimes.push(endTime - startTime);
    }

    // Pipeline operations should remain fast
    const avgTime = addToPipelineTimes.reduce((a, b) => a + b, 0) / addToPipelineTimes.length;
    expect(avgTime).toBeLessThan(1000); // Average under 1 second

    // Export should be fast
    await page.click('[data-testid="pipeline-panel-header"]'); // Expand panel
    const exportStartTime = Date.now();
    await page.click('[data-testid="export-pipeline-button"]');
    const exportTime = Date.now() - exportStartTime;
    
    expect(exportTime).toBeLessThan(2000);
  });
});

test.describe('Regression Tests', () => {
  test('should not break existing map functionality', async ({ page }) => {
    await page.goto('/stores/map');
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });

    // Test existing functionality before enabling expansion
    await page.locator('[data-testid="store-marker"]').first().click();
    await expect(page.locator('[data-testid="store-details-drawer"]')).toBeVisible();
    await page.click('[data-testid="close-drawer"]');

    // Enable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]');

    // Test that existing functionality still works
    await page.locator('[data-testid="store-marker"]').first().click();
    await expect(page.locator('[data-testid="store-details-drawer"]')).toBeVisible();
    await page.click('[data-testid="close-drawer"]');

    // Generate expansion suggestions
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Test that existing functionality still works with expansion active
    await page.locator('[data-testid="store-marker"]').first().click();
    await expect(page.locator('[data-testid="store-details-drawer"]')).toBeVisible();
    await page.click('[data-testid="close-drawer"]');

    // Disable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]', { state: 'hidden' });

    // Test that everything still works after disabling
    await page.locator('[data-testid="store-marker"]').first().click();
    await expect(page.locator('[data-testid="store-details-drawer"]')).toBeVisible();
  });

  test('should not affect map performance when disabled', async ({ page }) => {
    await page.goto('/stores/map');
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });

    // Measure baseline performance
    const baselineStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Equal'); // Zoom in
      await page.waitForTimeout(100);
    }
    const baselineTime = Date.now() - baselineStart;

    // Enable and then disable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]');
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]', { state: 'hidden' });

    // Measure performance after expansion mode was used
    const afterStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Minus'); // Zoom out
      await page.waitForTimeout(100);
    }
    const afterTime = Date.now() - afterStart;

    // Performance should not be significantly degraded
    expect(afterTime).toBeLessThan(baselineTime * 1.2); // Allow 20% tolerance
  });

  test('should clean up resources properly', async ({ page }) => {
    await page.goto('/stores/map');
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });

    // Get initial resource counts
    const initialResources = await page.evaluate(() => {
      const map = (window as any).mapInstance;
      return {
        sources: Object.keys(map.getStyle().sources || {}).length,
        layers: (map.getStyle().layers || []).length,
        eventListeners: (window as any).eventListenerCount || 0
      };
    });

    // Enable expansion mode and use it
    await page.click('[data-testid="expansion-toggle"]');
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Disable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]', { state: 'hidden' });

    // Wait for cleanup
    await page.waitForTimeout(1000);

    // Check final resource counts
    const finalResources = await page.evaluate(() => {
      const map = (window as any).mapInstance;
      return {
        sources: Object.keys(map.getStyle().sources || {}).length,
        layers: (map.getStyle().layers || []).length,
        eventListeners: (window as any).eventListenerCount || 0
      };
    });

    // Resources should be cleaned up (allowing for some expansion layers to remain hidden)
    expect(finalResources.sources - initialResources.sources).toBeLessThanOrEqual(2);
    expect(finalResources.layers - initialResources.layers).toBeLessThanOrEqual(5);
  });

  test('should handle browser refresh gracefully', async ({ page }) => {
    await page.goto('/stores/map');
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });

    // Set up expansion state
    await page.click('[data-testid="expansion-toggle"]');
    await page.selectOption('[data-testid="scope-type-selector"]', 'state');
    await page.selectOption('[data-testid="state-selector"]', 'CA');
    await page.fill('[data-testid="intensity-slider"]', '75');

    // Refresh the page
    await page.reload();
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });

    // Verify state is restored from URL
    await expect(page.locator('[data-testid="expansion-toggle"]')).toBeChecked();
    await expect(page.locator('[data-testid="scope-type-selector"]')).toHaveValue('state');
    await expect(page.locator('[data-testid="state-selector"]')).toHaveValue('CA');
    await expect(page.locator('[data-testid="intensity-slider"]')).toHaveValue('75');

    // Verify functionality still works
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });
    await expect(page.locator('[data-testid="expansion-marker"]').first()).toBeVisible();
  });
});