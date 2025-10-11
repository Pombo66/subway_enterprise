import { test, expect } from '@playwright/test'

test.describe('Store Pricing Overrides E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the stores page
    await page.goto('/stores')
    await expect(page.getByText('Stores')).toBeVisible()
  })

  test('should display stores list with proper structure', async ({ page }) => {
    // Verify page title
    await expect(page.getByText('Stores')).toBeVisible()
    
    // Verify table headers
    await expect(page.getByText('Store Name')).toBeVisible()
    await expect(page.getByText('Location')).toBeVisible()
    await expect(page.getByText('Region')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Actions')).toBeVisible()
    
    // Verify table has data
    const rows = page.locator('[data-testid="stores-table"] tbody tr')
    await expect(rows).toHaveCountGreaterThan(0)
    
    // Verify each row has view button
    const firstRow = rows.first()
    await expect(firstRow.getByRole('button', { name: 'View' })).toBeVisible()
  })

  test('should filter stores by scope', async ({ page }) => {
    // Test scope filtering
    const scopeSelect = page.getByLabel('Scope')
    await scopeSelect.selectOption('region')
    
    // Verify filter is applied
    await expect(page.locator('[data-testid="stores-table"] tbody tr')).toHaveCountGreaterThan(0)
    
    // Test different scope
    await scopeSelect.selectOption('country')
    await expect(page.locator('[data-testid="stores-table"] tbody tr')).toHaveCountGreaterThan(0)
    
    // Reset to global
    await scopeSelect.selectOption('global')
  })

  test('should search stores by name', async ({ page }) => {
    // Type in search box
    const searchInput = page.getByPlaceholder('Search stores...')
    await searchInput.fill('London')
    
    // Verify filtered results
    const visibleRows = page.locator('[data-testid="stores-table"] tbody tr:visible')
    const rowCount = await visibleRows.count()
    
    // All visible rows should contain "London"
    for (let i = 0; i < rowCount; i++) {
      const row = visibleRows.nth(i)
      await expect(row).toContainText('London', { ignoreCase: true })
    }
    
    // Clear search
    await searchInput.fill('')
  })

  test('should navigate to store details page', async ({ page }) => {
    // Click view button on first store
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    
    // Verify we're on store details page
    await expect(page).toHaveURL(/\/stores\/[^\/]+$/)
    await expect(page.getByText('Store Details')).toBeVisible()
    
    // Verify store information is displayed
    await expect(page.getByText('Store Information')).toBeVisible()
    await expect(page.getByText('Address')).toBeVisible()
    await expect(page.getByText('Region')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
  })

  test('should display pricing overrides tab in store details', async ({ page }) => {
    // Navigate to first store
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    
    // Verify pricing overrides tab exists
    await expect(page.getByRole('tab', { name: 'Pricing Overrides' })).toBeVisible()
    
    // Click on pricing overrides tab
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Verify we're on pricing overrides page
    await expect(page).toHaveURL(/\/stores\/[^\/]+\/pricing$/)
    await expect(page.getByText('Pricing Overrides')).toBeVisible()
  })

  test('should display pricing overrides table with base price comparison', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Verify table headers
    await expect(page.getByText('Item Name')).toBeVisible()
    await expect(page.getByText('Base Price')).toBeVisible()
    await expect(page.getByText('Override Price')).toBeVisible()
    await expect(page.getByText('Difference')).toBeVisible()
    await expect(page.getByText('Actions')).toBeVisible()
    
    // Verify table has data
    const rows = page.locator('[data-testid="pricing-overrides-table"] tbody tr')
    await expect(rows).toHaveCountGreaterThan(0)
    
    // Verify each row shows price comparison
    const firstRow = rows.first()
    await expect(firstRow.locator('td').nth(1)).toContainText('£') // Base price
    await expect(firstRow.locator('td').nth(2)).toContainText('£') // Override price
    await expect(firstRow.locator('td').nth(3)).toContainText(/[+-]£/) // Difference
  })

  test('should create new pricing override', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Click create override button
    await page.getByRole('button', { name: 'Add Price Override' }).click()
    
    // Verify modal opens
    await expect(page.getByText('Add Price Override')).toBeVisible()
    
    // Select an item
    await page.getByLabel('Menu Item').selectOption({ index: 1 })
    
    // Fill override price
    await page.getByLabel('Override Price (£)').fill('15.99')
    
    // Submit form
    await page.getByRole('button', { name: 'Create Override' }).click()
    
    // Verify modal closes
    await expect(page.getByText('Add Price Override')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Price override created successfully')).toBeVisible()
    
    // Verify override appears in table
    const overrideRow = page.locator('tr').filter({ hasText: '£15.99' })
    await expect(overrideRow).toBeVisible()
    
    // Verify difference is calculated
    await expect(overrideRow.locator('td').nth(3)).toContainText(/[+-]£/)
  })

  test('should validate pricing override fields', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Click create override button
    await page.getByRole('button', { name: 'Add Price Override' }).click()
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Create Override' }).click()
    
    // Verify validation errors
    await expect(page.getByText('Menu item is required')).toBeVisible()
    await expect(page.getByText('Override price is required')).toBeVisible()
    
    // Fill invalid price
    await page.getByLabel('Menu Item').selectOption({ index: 1 })
    await page.getByLabel('Override Price (£)').fill('invalid')
    await page.getByRole('button', { name: 'Create Override' }).click()
    
    // Should show price validation error
    await expect(page.getByText('Override price must be a valid number')).toBeVisible()
    
    // Fill negative price
    await page.getByLabel('Override Price (£)').fill('-5.00')
    await page.getByRole('button', { name: 'Create Override' }).click()
    
    // Should show positive price validation
    await expect(page.getByText('Override price must be positive')).toBeVisible()
  })

  test('should edit existing pricing override', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Click edit on first override
    const firstEditButton = page.locator('[data-testid="pricing-overrides-table"] tbody tr').first().getByRole('button', { name: 'Edit' })
    await firstEditButton.click()
    
    // Verify edit modal opens
    await expect(page.getByText('Edit Price Override')).toBeVisible()
    
    // Verify form is pre-populated
    const priceInput = page.getByLabel('Override Price (£)')
    await expect(priceInput).not.toHaveValue('')
    
    // Update price
    await priceInput.fill('18.99')
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Verify modal closes
    await expect(page.getByText('Edit Price Override')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Price override updated successfully')).toBeVisible()
    
    // Verify changes in table
    const updatedRow = page.locator('tr').filter({ hasText: '£18.99' })
    await expect(updatedRow).toBeVisible()
  })

  test('should delete pricing override', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Get the first override price for verification
    const firstRow = page.locator('[data-testid="pricing-overrides-table"] tbody tr').first()
    const overridePrice = await firstRow.locator('td').nth(2).textContent()
    
    // Click delete button
    const firstDeleteButton = firstRow.getByRole('button', { name: 'Delete' })
    await firstDeleteButton.click()
    
    // Verify confirmation dialog
    await expect(page.getByText('Delete Price Override')).toBeVisible()
    await expect(page.getByText('Are you sure you want to delete this price override?')).toBeVisible()
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Verify success message
    await expect(page.getByText('Price override deleted successfully')).toBeVisible()
    
    // Verify override is removed from table
    await expect(page.getByText(overridePrice!)).not.toBeVisible()
  })

  test('should clear all overrides and restore to base pricing', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Check if clear all button exists and there are overrides
    const clearAllButton = page.getByRole('button', { name: 'Clear All Overrides' })
    if (await clearAllButton.isVisible()) {
      // Get current override count
      const overrideRows = page.locator('[data-testid="pricing-overrides-table"] tbody tr')
      const initialCount = await overrideRows.count()
      
      if (initialCount > 0) {
        // Click clear all button
        await clearAllButton.click()
        
        // Verify confirmation dialog
        await expect(page.getByText('Clear All Price Overrides')).toBeVisible()
        await expect(page.getByText('This will restore all items to their base prices')).toBeVisible()
        
        // Confirm clearing
        await page.getByRole('button', { name: 'Clear All' }).click()
        
        // Verify success message
        await expect(page.getByText('All price overrides cleared successfully')).toBeVisible()
        
        // Verify table shows base prices only
        const updatedRows = page.locator('[data-testid="pricing-overrides-table"] tbody tr')
        const finalCount = await updatedRows.count()
        
        // Should have fewer or no override rows
        expect(finalCount).toBeLessThanOrEqual(initialCount)
      }
    }
  })

  test('should show price difference calculations correctly', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Check each row for correct price difference calculation
    const rows = page.locator('[data-testid="pricing-overrides-table"] tbody tr')
    const rowCount = await rows.count()
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const basePriceText = await row.locator('td').nth(1).textContent()
      const overridePriceText = await row.locator('td').nth(2).textContent()
      const differenceText = await row.locator('td').nth(3).textContent()
      
      // Extract numeric values
      const basePrice = parseFloat(basePriceText!.replace('£', ''))
      const overridePrice = parseFloat(overridePriceText!.replace('£', ''))
      const expectedDifference = overridePrice - basePrice
      
      // Verify difference is displayed correctly
      if (expectedDifference > 0) {
        await expect(row.locator('td').nth(3)).toContainText('+£')
      } else if (expectedDifference < 0) {
        await expect(row.locator('td').nth(3)).toContainText('-£')
      } else {
        await expect(row.locator('td').nth(3)).toContainText('£0.00')
      }
    }
  })

  test('should filter pricing overrides by item name', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Type in search box
    const searchInput = page.getByPlaceholder('Search items...')
    await searchInput.fill('Chicken')
    
    // Verify filtered results
    const visibleRows = page.locator('[data-testid="pricing-overrides-table"] tbody tr:visible')
    const rowCount = await visibleRows.count()
    
    // All visible rows should contain "Chicken"
    for (let i = 0; i < rowCount; i++) {
      const row = visibleRows.nth(i)
      await expect(row).toContainText('Chicken', { ignoreCase: true })
    }
    
    // Clear search
    await searchInput.fill('')
  })

  test('should handle bulk price override operations', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Check if bulk operations are available
    const bulkActionsButton = page.getByRole('button', { name: 'Bulk Actions' })
    if (await bulkActionsButton.isVisible()) {
      // Select multiple items
      const checkboxes = page.locator('input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      for (let i = 0; i < Math.min(checkboxCount, 2); i++) {
        await checkboxes.nth(i).check()
      }
      
      // Open bulk actions menu
      await bulkActionsButton.click()
      
      // Test bulk price increase
      const bulkIncreaseButton = page.getByRole('button', { name: 'Increase Prices' })
      if (await bulkIncreaseButton.isVisible()) {
        await bulkIncreaseButton.click()
        
        // Fill percentage increase
        await page.getByLabel('Percentage Increase').fill('10')
        await page.getByRole('button', { name: 'Apply Increase' }).click()
        
        // Verify success message
        await expect(page.getByText('Bulk price increase applied successfully')).toBeVisible()
      }
    }
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to store pricing overrides
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Mock API error for create operation
    await page.route('**/stores/*/pricing-overrides', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' })
        })
      } else {
        await route.continue()
      }
    })
    
    // Try to create override
    await page.getByRole('button', { name: 'Add Price Override' }).click()
    await page.getByLabel('Menu Item').selectOption({ index: 1 })
    await page.getByLabel('Override Price (£)').fill('12.99')
    await page.getByRole('button', { name: 'Create Override' }).click()
    
    // Verify error message is shown
    await expect(page.getByText('Failed to create price override')).toBeVisible()
    
    // Verify modal remains open for retry
    await expect(page.getByText('Add Price Override')).toBeVisible()
  })

  test('should navigate back to stores list from store details', async ({ page }) => {
    // Navigate to store details
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    
    // Click back to stores button
    const backButton = page.getByRole('button', { name: 'Back to Stores' })
    await backButton.click()
    
    // Verify we're back on stores list
    await expect(page).toHaveURL('/stores')
    await expect(page.getByText('Stores')).toBeVisible()
    await expect(page.locator('[data-testid="stores-table"]')).toBeVisible()
  })

  test('should maintain store context when switching between tabs', async ({ page }) => {
    // Navigate to store details
    const firstViewButton = page.locator('[data-testid="stores-table"] tbody tr').first().getByRole('button', { name: 'View' })
    await firstViewButton.click()
    
    // Get store name from details
    const storeName = await page.getByTestId('store-name').textContent()
    
    // Switch to pricing overrides tab
    await page.getByRole('tab', { name: 'Pricing Overrides' }).click()
    
    // Verify store context is maintained
    await expect(page.getByTestId('store-name')).toContainText(storeName!)
    
    // Switch back to store info tab
    await page.getByRole('tab', { name: 'Store Information' }).click()
    
    // Verify we're back on store info
    await expect(page.getByText('Store Information')).toBeVisible()
    await expect(page.getByTestId('store-name')).toContainText(storeName!)
  })
})