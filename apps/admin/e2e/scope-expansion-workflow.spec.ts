import { test, expect } from '@playwright/test';

test.describe('Scope-Based Expansion Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the map page
    await page.goto('/stores/map');
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });
    
    // Enable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]', { timeout: 5000 });
  });

  test('should complete full country scope workflow', async ({ page }) => {
    // Step 1: Select country scope
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    
    // Verify scope selection
    await expect(page.locator('[data-testid="selected-scope-display"]')).toContainText('United States');

    // Step 2: Adjust intensity
    const intensitySlider = page.locator('[data-testid="intensity-slider"]');
    await intensitySlider.fill('75');
    
    // Verify intensity readout
    await expect(page.locator('[data-testid="intensity-readout"]')).toContainText('75%');
    await expect(page.locator('[data-testid="target-suggestions"]')).toContainText('Target =');

    // Step 3: Toggle data mode
    await page.click('[data-testid="data-mode-toggle"]');
    await expect(page.locator('[data-testid="current-data-mode"]')).toContainText('Modelled');

    // Step 4: Adjust anti-cannibalization
    const minDistanceSlider = page.locator('[data-testid="min-distance-slider"]');
    await minDistanceSlider.fill('5.0');
    await expect(page.locator('[data-testid="min-distance-display"]')).toContainText('5.0 km');

    // Step 5: Trigger recomputation
    await page.click('[data-testid="recompute-button"]');
    
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'visible' });
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Step 6: Verify suggestions appear on map
    await page.waitForSelector('[data-testid="expansion-suggestions"]', { timeout: 10000 });
    const suggestions = page.locator('[data-testid="expansion-marker"]');
    await expect(suggestions.first()).toBeVisible();

    // Step 7: Interact with a suggestion
    await suggestions.first().hover();
    await page.waitForSelector('[data-testid="suggestion-popover"]', { timeout: 3000 });
    
    // Verify popover content
    await expect(page.locator('[data-testid="suggestion-popover"]')).toContainText('Score Breakdown');
    await expect(page.locator('[data-testid="suggestion-popover"]')).toContainText('Demand');
    await expect(page.locator('[data-testid="suggestion-popover"]')).toContainText('Cannibalization');

    // Step 8: Send to pipeline
    await page.click('[data-testid="send-to-pipeline-button"]');
    await expect(page.locator('[data-testid="pipeline-panel"]')).toContainText('1 items');

    // Step 9: Test AI analysis
    await suggestions.nth(1).hover();
    await page.waitForSelector('[data-testid="suggestion-popover"]');
    await page.click('[data-testid="ask-submind-button"]');
    
    // Should show AI analysis (placeholder or real response)
    await page.waitForSelector('[data-testid="ai-analysis-modal"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="ai-analysis-content"]')).toContainText('analysis');
  });

  test('should handle custom area drawing workflow', async ({ page }) => {
    // Step 1: Select custom area scope
    await page.selectOption('[data-testid="scope-type-selector"]', 'custom_area');
    
    // Step 2: Start drawing
    await page.click('[data-testid="draw-polygon-button"]');
    await expect(page.locator('[data-testid="drawing-instructions"]')).toBeVisible();

    // Step 3: Draw a polygon on the map (simulate clicks)
    const mapContainer = page.locator('[data-testid="living-map"]');
    
    // Draw a simple rectangle
    await mapContainer.click({ position: { x: 300, y: 200 } });
    await mapContainer.click({ position: { x: 400, y: 200 } });
    await mapContainer.click({ position: { x: 400, y: 300 } });
    await mapContainer.click({ position: { x: 300, y: 300 } });
    await mapContainer.click({ position: { x: 300, y: 200 } }); // Close polygon

    // Step 4: Verify custom area badge appears
    await page.waitForSelector('[data-testid="custom-area-badge"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="custom-area-badge"]')).toContainText('Custom Area');
    await expect(page.locator('[data-testid="custom-area-badge"]')).toContainText('km²');

    // Step 5: Verify gold outline on map
    await expect(page.locator('[data-testid="custom-area-outline"]')).toHaveCSS('stroke', 'rgb(255, 215, 0)'); // Gold color

    // Step 6: Set intensity and generate suggestions
    await page.fill('[data-testid="intensity-slider"]', '60');
    await page.click('[data-testid="recompute-button"]');

    // Wait for suggestions within custom area
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });
    await page.waitForSelector('[data-testid="expansion-suggestions"]', { timeout: 10000 });

    // Step 7: Clear custom area
    await page.click('[data-testid="clear-polygon-button"]');
    await expect(page.locator('[data-testid="custom-area-badge"]')).not.toBeVisible();
  });

  test('should handle state scope workflow', async ({ page }) => {
    // Step 1: Select state scope
    await page.selectOption('[data-testid="scope-type-selector"]', 'state');
    await page.selectOption('[data-testid="state-selector"]', 'CA');
    
    // Verify scope selection
    await expect(page.locator('[data-testid="selected-scope-display"]')).toContainText('California');

    // Step 2: Test intensity extremes
    await page.fill('[data-testid="intensity-slider"]', '0');
    await expect(page.locator('[data-testid="target-suggestions"]')).toContainText('Target = 0');

    await page.fill('[data-testid="intensity-slider"]', '100');
    await expect(page.locator('[data-testid="target-suggestions"]')).toContainText('capped at 300');

    // Step 3: Test lock suggestions
    await page.fill('[data-testid="intensity-slider"]', '50');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Lock suggestions
    await page.click('[data-testid="lock-toggle"]');
    await expect(page.locator('[data-testid="lock-status"]')).toContainText('locked');

    // Try to change intensity - should not trigger recomputation
    await page.fill('[data-testid="intensity-slider"]', '75');
    await expect(page.locator('[data-testid="recompute-button"]')).toBeDisabled();

    // Unlock and verify recomputation works
    await page.click('[data-testid="lock-toggle"]');
    await expect(page.locator('[data-testid="recompute-button"]')).toBeEnabled();
  });

  test('should handle zoom-aware visualization', async ({ page }) => {
    // Set up scope and generate suggestions
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '50');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Test heatmap view (zoom <= 4)
    await page.evaluate(() => {
      const map = (window as any).mapInstance;
      if (map) map.setZoom(3);
    });
    await page.waitForTimeout(1000); // Wait for zoom animation
    await expect(page.locator('[data-testid="expansion-heatmap"]')).toBeVisible();
    await expect(page.locator('[data-testid="expansion-markers"]')).not.toBeVisible();

    // Test cluster view (zoom 5-7)
    await page.evaluate(() => {
      const map = (window as any).mapInstance;
      if (map) map.setZoom(6);
    });
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="expansion-clusters"]')).toBeVisible();
    await expect(page.locator('[data-testid="expansion-heatmap"]')).not.toBeVisible();

    // Test individual pins (zoom >= 8)
    await page.evaluate(() => {
      const map = (window as any).mapInstance;
      if (map) map.setZoom(10);
    });
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="expansion-markers"]')).toBeVisible();
    await expect(page.locator('[data-testid="expansion-clusters"]')).not.toBeVisible();
  });

  test('should handle pipeline management workflow', async ({ page }) => {
    // Generate suggestions
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '30');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Add multiple suggestions to pipeline
    const suggestions = page.locator('[data-testid="expansion-marker"]');
    
    // Add first suggestion
    await suggestions.first().hover();
    await page.waitForSelector('[data-testid="suggestion-popover"]');
    await page.click('[data-testid="send-to-pipeline-button"]');
    await expect(page.locator('[data-testid="pipeline-stats"]')).toContainText('1');

    // Add second suggestion
    await suggestions.nth(1).hover();
    await page.waitForSelector('[data-testid="suggestion-popover"]');
    await page.click('[data-testid="send-to-pipeline-button"]');
    await expect(page.locator('[data-testid="pipeline-stats"]')).toContainText('2');

    // Expand pipeline panel
    await page.click('[data-testid="pipeline-panel-header"]');
    await expect(page.locator('[data-testid="pipeline-items-list"]')).toBeVisible();

    // Change status of first item
    await page.selectOption('[data-testid="pipeline-item-status"]:first-child', 'approved');
    await expect(page.locator('[data-testid="pipeline-stats-approved"]')).toContainText('1');

    // Export pipeline
    await page.click('[data-testid="export-pipeline-button"]');
    // Verify download was triggered (file download testing is complex in Playwright)
    
    // Clear pipeline
    await page.click('[data-testid="clear-pipeline-button"]');
    await page.click('[data-testid="confirm-clear-button"]'); // Confirmation dialog
    await expect(page.locator('[data-testid="pipeline-stats"]')).toContainText('0');
  });

  test('should handle performance monitoring', async ({ page }) => {
    // Enable performance monitoring
    await page.click('[data-testid="performance-monitor-toggle"]');
    
    // Generate suggestions with high intensity to trigger performance alerts
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '100');
    await page.click('[data-testid="recompute-button"]');
    
    // Wait for computation to complete
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 20000 });

    // Check for performance metrics
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="calculation-time"]')).toContainText('ms');
    await expect(page.locator('[data-testid="memory-usage"]')).toContainText('MB');

    // Check for performance alerts if any
    const alertsCount = await page.locator('[data-testid="performance-alert"]').count();
    if (alertsCount > 0) {
      await expect(page.locator('[data-testid="performance-alert"]').first()).toBeVisible();
    }
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test invalid scope
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'INVALID');
    await page.click('[data-testid="recompute-button"]');
    
    // Should show error message
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('error');

    // Test network error simulation
    await page.route('**/api/expansion/suggestions*', route => route.abort());
    
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.click('[data-testid="recompute-button"]');
    
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to fetch');

    // Clear route interception
    await page.unroute('**/api/expansion/suggestions*');
  });

  test('should maintain URL state persistence', async ({ page }) => {
    // Set up specific state
    await page.selectOption('[data-testid="scope-type-selector"]', 'state');
    await page.selectOption('[data-testid="state-selector"]', 'CA');
    await page.fill('[data-testid="intensity-slider"]', '75');
    await page.click('[data-testid="data-mode-toggle"]'); // Switch to modelled

    // Wait for URL to update
    await page.waitForTimeout(1000);
    
    // Verify URL contains state
    const url = page.url();
    expect(url).toContain('scopeType=state');
    expect(url).toContain('scopeValue=CA');
    expect(url).toContain('intensity=75');
    expect(url).toContain('dataMode=modelled');

    // Reload page and verify state is restored
    await page.reload();
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]', { timeout: 5000 });
    
    await expect(page.locator('[data-testid="scope-type-selector"]')).toHaveValue('state');
    await expect(page.locator('[data-testid="state-selector"]')).toHaveValue('CA');
    await expect(page.locator('[data-testid="intensity-slider"]')).toHaveValue('75');
    await expect(page.locator('[data-testid="current-data-mode"]')).toContainText('Modelled');
  });

  test('should respect 300 suggestion cap in UI', async ({ page }) => {
    // Set maximum intensity to try to exceed cap
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.fill('[data-testid="intensity-slider"]', '100');
    await page.click('[data-testid="recompute-button"]');
    
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 20000 });

    // Verify cap is enforced
    await expect(page.locator('[data-testid="target-suggestions"]')).toContainText('capped at 300');
    
    // Count actual markers on map (at high zoom)
    await page.evaluate(() => {
      const map = (window as any).mapInstance;
      if (map) map.setZoom(10);
    });
    await page.waitForTimeout(2000);
    
    const markerCount = await page.locator('[data-testid="expansion-marker"]').count();
    expect(markerCount).toBeLessThanOrEqual(300);
  });
});

test.describe('Non-Regression Tests', () => {
  test('should not affect existing Living Map functionality', async ({ page }) => {
    await page.goto('/stores/map');
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });

    // Verify existing store markers are visible
    await expect(page.locator('[data-testid="store-marker"]').first()).toBeVisible();

    // Enable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]');

    // Verify existing store markers are still visible
    await expect(page.locator('[data-testid="store-marker"]').first()).toBeVisible();

    // Verify existing map controls still work
    await page.click('[data-testid="zoom-in-button"]');
    await page.waitForTimeout(500);
    
    // Verify store marker click still works
    await page.locator('[data-testid="store-marker"]').first().click();
    await expect(page.locator('[data-testid="store-details-drawer"]')).toBeVisible();

    // Disable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForSelector('[data-testid="scope-based-expansion-system"]', { state: 'hidden' });

    // Verify everything still works normally
    await expect(page.locator('[data-testid="store-marker"]').first()).toBeVisible();
  });

  test('should not leave orphaned map layers', async ({ page }) => {
    await page.goto('/stores/map');
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });

    // Get initial layer count
    const initialLayers = await page.evaluate(() => {
      const map = (window as any).mapInstance;
      return map ? map.getStyle().layers.length : 0;
    });

    // Enable expansion mode and generate suggestions
    await page.click('[data-testid="expansion-toggle"]');
    await page.selectOption('[data-testid="scope-type-selector"]', 'country');
    await page.selectOption('[data-testid="country-selector"]', 'US');
    await page.click('[data-testid="recompute-button"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 15000 });

    // Disable expansion mode
    await page.click('[data-testid="expansion-toggle"]');
    await page.waitForTimeout(1000);

    // Verify layer count is back to normal (allowing for expansion layers to be hidden, not removed)
    const finalLayers = await page.evaluate(() => {
      const map = (window as any).mapInstance;
      return map ? map.getStyle().layers.length : 0;
    });

    // Should not have significantly more layers than initially
    expect(finalLayers - initialLayers).toBeLessThanOrEqual(5); // Allow for a few expansion layers
  });
});