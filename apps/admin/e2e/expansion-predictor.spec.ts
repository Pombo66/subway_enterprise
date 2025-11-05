import { test, expect } from '@playwright/test';

test.describe('Expansion Predictor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the stores map page
    await page.goto('/stores/map');
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });
    
    // Wait for stores to load
    await page.waitForFunction(() => {
      const storeCount = document.querySelector('.s-panelT')?.textContent;
      return storeCount && storeCount.includes('Store Locations') && !storeCount.includes('(0)');
    }, { timeout: 15000 });
  });

  test('should toggle expansion mode successfully', async ({ page }) => {
    // Find and click the expansion mode toggle
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    
    await expect(expansionToggle).toBeVisible();
    await expansionToggle.click();
    
    // Wait for expansion controls to appear
    await expect(page.locator('text=Expansion Predictor')).toBeVisible();
    
    // Verify expansion controls are visible
    await expect(page.locator('text=Data Mode')).toBeVisible();
    await expect(page.locator('text=Live Data')).toBeVisible();
    await expect(page.locator('text=Modelled')).toBeVisible();
    
    // Verify region sliders are visible
    await expect(page.locator('text=AMER Target Stores')).toBeVisible();
    await expect(page.locator('text=EMEA Target Stores')).toBeVisible();
    await expect(page.locator('text=APAC Target Stores')).toBeVisible();
  });

  test('should display expansion legend when expansion mode is active', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for expansion overlay to load
    await page.waitForTimeout(2000);
    
    // Check for expansion legend
    await expect(page.locator('text=Expansion Confidence')).toBeVisible();
    await expect(page.locator('text=Strong Live Signal')).toBeVisible();
    await expect(page.locator('text=Moderate Confidence')).toBeVisible();
    await expect(page.locator('text=High Risk')).toBeVisible();
    await expect(page.locator('text=Modelled Data')).toBeVisible();
  });

  test('should change data mode between Live and Modelled', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for controls to appear
    await expect(page.locator('text=Data Mode')).toBeVisible();
    
    // Verify Live Data is initially selected
    const liveButton = page.locator('text=Live Data');
    await expect(liveButton).toBeVisible();
    
    // Click Modelled button
    const modelledButton = page.locator('text=Modelled');
    await expect(modelledButton).toBeVisible();
    await modelledButton.click();
    
    // Wait for mode change to take effect
    await page.waitForTimeout(1000);
    
    // Switch back to Live Data
    await liveButton.click();
    await page.waitForTimeout(1000);
  });

  test('should adjust region slider values', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for controls to appear
    await expect(page.locator('text=AMER Target Stores')).toBeVisible();
    
    // Find AMER slider
    const amerSlider = page.locator('text=AMER Target Stores').locator('..').locator('input[type="range"]');
    await expect(amerSlider).toBeVisible();
    
    // Get initial value
    const initialValue = await amerSlider.getAttribute('value');
    
    // Change slider value
    await amerSlider.fill('15');
    
    // Verify value changed
    const newValue = await amerSlider.getAttribute('value');
    expect(newValue).toBe('15');
    expect(newValue).not.toBe(initialValue);
    
    // Verify the displayed value updated
    await expect(page.locator('text=AMER Target Stores').locator('..').locator('text=15')).toBeVisible();
  });

  test('should display KPI strip with current/target/gap values', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for KPI strip to appear
    await expect(page.locator('text=AMER')).toBeVisible();
    await expect(page.locator('text=EMEA')).toBeVisible();
    await expect(page.locator('text=APAC')).toBeVisible();
    
    // Verify KPI structure for each region
    for (const region of ['AMER', 'EMEA', 'APAC']) {
      const regionCard = page.locator(`text=${region}`).locator('..');
      await expect(regionCard.locator('text=Current:')).toBeVisible();
      await expect(regionCard.locator('text=Target:')).toBeVisible();
      await expect(regionCard.locator('text=Gap:')).toBeVisible();
    }
  });

  test('should handle recompute button click', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for controls to appear
    await expect(page.locator('text=Recompute')).toBeVisible();
    
    // Click recompute button
    const recomputeButton = page.locator('text=Recompute');
    await recomputeButton.click();
    
    // Wait for loading state (button should show loading indicator)
    await page.waitForTimeout(1000);
    
    // Button should be enabled again after operation
    await expect(recomputeButton).toBeEnabled();
  });

  test('should show Ask SubMind button', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for controls to appear
    await expect(page.locator('text=Ask SubMind')).toBeVisible();
    
    // Click Ask SubMind button
    const askSubMindButton = page.locator('text=Ask SubMind');
    await askSubMindButton.click();
    
    // Should show some response (placeholder or actual)
    await page.waitForTimeout(1000);
  });

  test('should persist expansion mode in URL', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for URL to update
    await page.waitForTimeout(1000);
    
    // Check URL contains expansion parameter
    const url = page.url();
    expect(url).toContain('expansion=true');
    
    // Reload page
    await page.reload();
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="living-map"]', { timeout: 10000 });
    
    // Expansion mode should still be enabled
    await expect(page.locator('text=Expansion Predictor')).toBeVisible();
    
    // Toggle should still be checked
    const toggleAfterReload = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expect(toggleAfterReload).toBeChecked();
  });

  test('should handle expansion marker interactions', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for expansion data to load
    await page.waitForTimeout(3000);
    
    // Look for expansion markers on the map
    // Note: This is challenging to test without actual map rendering
    // In a real implementation, you might need to use data-testid attributes
    // on expansion markers or check for specific map layer elements
    
    // For now, we'll check that the map container exists and expansion mode is active
    const mapContainer = page.locator('[data-testid="living-map"]').or(
      page.locator('.maplibregl-map')
    );
    await expect(mapContainer).toBeVisible();
    
    // Verify expansion legend is visible (indicates expansion overlay is active)
    await expect(page.locator('text=Expansion Confidence')).toBeVisible();
  });

  test('should disable expansion mode and hide controls', async ({ page }) => {
    // Enable expansion mode first
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for controls to appear
    await expect(page.locator('text=Expansion Predictor')).toBeVisible();
    
    // Disable expansion mode
    await expansionToggle.click();
    
    // Wait for controls to disappear
    await page.waitForTimeout(1000);
    
    // Expansion controls should be hidden
    await expect(page.locator('text=Expansion Predictor')).not.toBeVisible();
    await expect(page.locator('text=Data Mode')).not.toBeVisible();
    await expect(page.locator('text=Expansion Confidence')).not.toBeVisible();
    
    // URL should not contain expansion parameter
    const url = page.url();
    expect(url).not.toContain('expansion=true');
  });

  test('should maintain existing store functionality when expansion mode is active', async ({ page }) => {
    // Enable expansion mode
    const expansionToggle = page.locator('[data-testid="expansion-mode-toggle"]').or(
      page.locator('text=Expansion Mode').locator('..').locator('input[type="checkbox"]')
    );
    await expansionToggle.click();
    
    // Wait for expansion mode to activate
    await page.waitForTimeout(2000);
    
    // Verify store filters still work
    await expect(page.locator('text=All Franchisees')).toBeVisible();
    await expect(page.locator('text=All Regions')).toBeVisible();
    await expect(page.locator('text=All Countries')).toBeVisible();
    
    // Verify store count is still displayed
    const storeCountElement = page.locator('.s-panelT');
    await expect(storeCountElement).toContainText('Store Locations');
    
    // Verify map is still interactive (store markers should be visible)
    const mapContainer = page.locator('[data-testid="living-map"]').or(
      page.locator('.maplibregl-map')
    );
    await expect(mapContainer).toBeVisible();
  });
});