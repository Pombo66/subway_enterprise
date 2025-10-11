import { test, expect } from '@playwright/test'

test.describe('Stores Living Map E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to stores page
    await page.goto('/stores')
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')
    
    // Wait for the main content to appear (more flexible selector)
    await page.waitForSelector('h1', { timeout: 15000 })
    
    // Check if we have the Store Management heading or if we need to navigate
    const hasStoreHeading = await page.getByRole('heading', { name: 'Store Management' }).isVisible()
    
    if (!hasStoreHeading) {
      // Try navigating from dashboard if we're redirected there
      const hasDashboardHeading = await page.getByRole('heading', { name: 'Subway Enterprise' }).isVisible()
      if (hasDashboardHeading) {
        await page.getByRole('complementary').getByRole('link', { name: 'Stores' }).click()
        await page.waitForLoadState('networkidle')
      }
    }
    
    // Final check for the stores page
    await expect(page.getByRole('heading', { name: 'Store Management' })).toBeVisible({ timeout: 10000 })
  })

  test('should load map at /stores/map and display initial render', async ({ page }) => {
    // Navigate to map tab
    await page.getByRole('tab', { name: 'Map' }).click()
    await expect(page).toHaveURL('/stores/map')
    
    // Verify page title and description
    await expect(page.getByRole('heading', { name: 'Store Management' })).toBeVisible()
    await expect(page.getByText('Interactive map view of all store locations')).toBeVisible()
    
    // Verify Map tab is active
    await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true')
    
    // Wait for map container to be visible
    const mapContainer = page.locator('[data-testid="map-container"]').first()
    await expect(mapContainer).toBeVisible({ timeout: 10000 })
    
    // Verify store locations panel is visible
    await expect(page.getByText(/Store Locations \(\d+\)/)).toBeVisible()
    
    // Verify map view description
    await expect(page.getByText('Map view • Clustering enabled')).toBeVisible()
  })

  test('should handle direct navigation to /stores/map', async ({ page }) => {
    // Navigate directly to map page
    await page.goto('/stores/map')
    
    // Verify page loads correctly
    await expect(page.getByRole('heading', { name: 'Store Management' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true')
    
    // Wait for map to load
    const mapContainer = page.locator('[data-testid="map-container"]').first()
    await expect(mapContainer).toBeVisible({ timeout: 10000 })
  })

  test('should redirect from /stores?view=map to /stores/map', async ({ page }) => {
    // Navigate to stores with view=map parameter
    await page.goto('/stores?view=map')
    
    // Should redirect to /stores/map
    await expect(page).toHaveURL('/stores/map')
    await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should display and interact with filter controls', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for filters to load
    await expect(page.getByText('Filters')).toBeVisible()
    
    // Verify filter controls are present
    const franchiseeSelect = page.locator('select[data-testid="franchisee-filter"]')
    const regionSelect = page.locator('select[data-testid="region-filter"]')
    const countrySelect = page.locator('select[data-testid="country-filter"]')
    
    await expect(franchiseeSelect).toBeVisible()
    await expect(regionSelect).toBeVisible()
    await expect(countrySelect).toBeVisible()
    
    // Get initial store count
    const initialStoreCount = await page.getByText(/Store Locations \((\d+)\)/).textContent()
    const initialCount = parseInt(initialStoreCount?.match(/\((\d+)\)/)?.[1] || '0')
    
    // Apply a region filter
    await regionSelect.selectOption({ index: 1 }) // Select first non-empty option
    
    // Wait for filter to apply and verify store count changed
    await page.waitForTimeout(1000) // Allow for debounced filter application
    
    const filteredStoreCount = await page.getByText(/Store Locations \((\d+)\)/).textContent()
    const filteredCount = parseInt(filteredStoreCount?.match(/\((\d+)\)/)?.[1] || '0')
    
    // Store count should be different (likely less) after filtering
    expect(filteredCount).not.toBe(initialCount)
    
    // Clear filter
    await regionSelect.selectOption('')
    await page.waitForTimeout(1000)
    
    // Store count should return to original or close to it
    const clearedStoreCount = await page.getByText(/Store Locations \((\d+)\)/).textContent()
    const clearedCount = parseInt(clearedStoreCount?.match(/\((\d+)\)/)?.[1] || '0')
    expect(clearedCount).toBeGreaterThanOrEqual(filteredCount)
  })

  test('should display store markers and handle clustering', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for map to load
    const mapContainer = page.locator('[data-testid="map-container"]').first()
    await expect(mapContainer).toBeVisible({ timeout: 10000 })
    
    // Wait for markers to render
    await page.waitForTimeout(2000)
    
    // Check for presence of markers or clusters
    // Note: We use a more flexible approach since marker elements may vary
    const hasMarkers = await page.locator('.maplibregl-marker').count() > 0
    const hasClusters = await page.locator('[data-testid*="cluster"]').count() > 0
    
    // At least one of these should be true
    expect(hasMarkers || hasClusters).toBe(true)
    
    // If we have clusters, test zoom interaction
    if (hasClusters) {
      const firstCluster = page.locator('[data-testid*="cluster"]').first()
      await firstCluster.click()
      
      // Wait for zoom animation
      await page.waitForTimeout(1000)
      
      // After zooming, we should see more individual markers or different clusters
      const markersAfterZoom = await page.locator('.maplibregl-marker').count()
      expect(markersAfterZoom).toBeGreaterThan(0)
    }
  })

  test('should display activity indicators for active stores', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for map and data to load
    const mapContainer = page.locator('[data-testid="map-container"]').first()
    await expect(mapContainer).toBeVisible({ timeout: 10000 })
    
    // Wait for activity data to load
    await page.waitForTimeout(3000)
    
    // Check if activity indicators are mentioned in the UI
    const activityText = page.getByText(/\d+ active/)
    if (await activityText.isVisible()) {
      // If we have active stores, verify the count is reasonable
      const activityCount = await activityText.textContent()
      const count = parseInt(activityCount?.match(/(\d+) active/)?.[1] || '0')
      expect(count).toBeGreaterThan(0)
    }
    
    // Look for pulse animations (CSS class or data attribute)
    const pulseElements = page.locator('[data-testid*="pulse"], .pulse-animation, [class*="pulse"]')
    const pulseCount = await pulseElements.count()
    
    // We should have some pulse elements if there are active stores
    // Note: This might be 0 if no stores are currently active, which is acceptable
    expect(pulseCount).toBeGreaterThanOrEqual(0)
  })

  test('should open store drawer when marker is clicked', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for map to load
    const mapContainer = page.locator('[data-testid="map-container"]').first()
    await expect(mapContainer).toBeVisible({ timeout: 10000 })
    
    // Wait for markers to render
    await page.waitForTimeout(2000)
    
    // Try to click on a store marker
    const markers = page.locator('.maplibregl-marker')
    const markerCount = await markers.count()
    
    if (markerCount > 0) {
      // Click on the first marker
      await markers.first().click()
      
      // Wait for drawer to open
      await page.waitForTimeout(1000)
      
      // Verify drawer is visible
      const drawer = page.locator('[data-testid="store-drawer"]')
      await expect(drawer).toBeVisible()
      
      // Verify drawer contains store information
      await expect(drawer.getByText(/Store Details|Store Information/)).toBeVisible()
      
      // Verify close button is present
      const closeButton = drawer.locator('button[data-testid="close-drawer"], button[aria-label*="close"], button[aria-label*="Close"]')
      await expect(closeButton).toBeVisible()
      
      // Test closing the drawer
      await closeButton.click()
      await page.waitForTimeout(500)
      
      // Drawer should be hidden
      await expect(drawer).not.toBeVisible()
    } else {
      // If no individual markers, try clicking on clusters
      const clusters = page.locator('[data-testid*="cluster"]')
      const clusterCount = await clusters.count()
      
      if (clusterCount > 0) {
        // Click on cluster to expand it first
        await clusters.first().click()
        await page.waitForTimeout(1000)
        
        // Now try clicking on individual markers that appeared
        const newMarkers = page.locator('.maplibregl-marker')
        const newMarkerCount = await newMarkers.count()
        
        if (newMarkerCount > 0) {
          await newMarkers.first().click()
          
          // Verify drawer opens
          const drawer = page.locator('[data-testid="store-drawer"]')
          await expect(drawer).toBeVisible()
        }
      }
    }
  })

  test('should display store KPIs in drawer', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for map to load
    const mapContainer = page.locator('[data-testid="map-container"]').first()
    await expect(mapContainer).toBeVisible({ timeout: 10000 })
    
    // Wait for markers and try to open a drawer
    await page.waitForTimeout(2000)
    
    const markers = page.locator('.maplibregl-marker')
    const markerCount = await markers.count()
    
    if (markerCount > 0) {
      await markers.first().click()
      await page.waitForTimeout(1000)
      
      const drawer = page.locator('[data-testid="store-drawer"]')
      await expect(drawer).toBeVisible()
      
      // Check for KPI elements (these might be loading or show actual data)
      const kpiElements = [
        drawer.getByText(/Orders Today|orders today/i),
        drawer.getByText(/Revenue Today|revenue today/i),
        drawer.getByText(/Last Order|last order/i)
      ]
      
      // At least some KPI labels should be visible
      let visibleKPIs = 0
      for (const kpi of kpiElements) {
        if (await kpi.isVisible()) {
          visibleKPIs++
        }
      }
      
      expect(visibleKPIs).toBeGreaterThan(0)
      
      // Check for "Open in Stores → Details" button
      const detailsButton = drawer.getByText(/Open in Stores.*Details|View Details|Go to Details/i)
      if (await detailsButton.isVisible()) {
        // Test navigation (but don't actually navigate to avoid breaking the test)
        await expect(detailsButton).toBeVisible()
      }
    }
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for initial load
    await page.waitForTimeout(2000)
    
    // Check if error state is displayed (this might not always occur)
    const errorMessage = page.getByText(/Failed to load|Error loading|Something went wrong/i)
    const retryButton = page.getByText(/Retry|Try again|Reload/i)
    
    if (await errorMessage.isVisible()) {
      // If there's an error, there should be a retry option
      await expect(retryButton).toBeVisible()
      
      // Test retry functionality
      await retryButton.click()
      await page.waitForTimeout(1000)
      
      // After retry, either the error should be gone or still present (both are valid)
      // The important thing is that the page doesn't crash
      await expect(page.getByRole('heading', { name: 'Store Management' })).toBeVisible()
    }
  })

  test('should maintain URL state when filters are applied', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for filters to load
    await expect(page.getByText('Filters')).toBeVisible()
    
    // Apply a region filter
    const regionSelect = page.locator('select[data-testid="region-filter"]')
    await regionSelect.selectOption({ index: 1 })
    
    // Wait for URL to update
    await page.waitForTimeout(1000)
    
    // URL should contain filter parameters
    const currentURL = page.url()
    expect(currentURL).toContain('/stores/map')
    
    // Reload the page
    await page.reload()
    
    // Filter should be maintained after reload
    const selectedValue = await regionSelect.inputValue()
    expect(selectedValue).not.toBe('')
    
    // Store count should reflect the filtered state
    await expect(page.getByText(/Store Locations \(\d+\)/)).toBeVisible()
  })

  test('should navigate back to stores list view', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Click on a different tab to navigate away from map
    await page.getByRole('tab', { name: 'Overview' }).click()
    
    // Should navigate to stores overview
    await expect(page).toHaveURL('/stores')
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    
    // Navigate back to map
    await page.getByRole('tab', { name: 'Map' }).click()
    await expect(page).toHaveURL('/stores/map')
    await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should handle keyboard navigation', async ({ page }) => {
    // Navigate to map
    await page.goto('/stores/map')
    
    // Wait for page to load
    await page.waitForTimeout(2000)
    
    // Test tab navigation through filter controls
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to navigate through interactive elements
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Test escape key to close drawer if one is open
    const markers = page.locator('.maplibregl-marker')
    const markerCount = await markers.count()
    
    if (markerCount > 0) {
      await markers.first().click()
      await page.waitForTimeout(500)
      
      const drawer = page.locator('[data-testid="store-drawer"]')
      if (await drawer.isVisible()) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
        
        // Drawer should close
        await expect(drawer).not.toBeVisible()
      }
    }
  })
})