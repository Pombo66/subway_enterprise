import { test, expect } from '@playwright/test'

test.describe('Menu Items CRUD E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the menu items page
    await page.goto('/menu/items')
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.locator('[data-testid="menu-table"]')).toBeVisible()
  })

  test('should display menu items table with proper structure', async ({ page }) => {
    // Verify table headers
    await expect(page.getByText('Name')).toBeVisible()
    await expect(page.getByText('Price')).toBeVisible()
    await expect(page.getByText('Category')).toBeVisible()
    await expect(page.getByText('Modifiers')).toBeVisible()
    await expect(page.getByText('Actions')).toBeVisible()
    
    // Verify table has data
    const rows = page.locator('.menu-row')
    await expect(rows).toHaveCount(3) // Based on seed data
    
    // Verify each row has proper structure
    for (let i = 0; i < 3; i++) {
      const row = rows.nth(i)
      await expect(row.locator('.menu-cell')).toHaveCount(5) // Name, Price, Category, Modifiers, Actions
      await expect(row.locator('.menu-action-btn.menu-edit')).toBeVisible()
      await expect(row.locator('.menu-action-btn.menu-delete')).toBeVisible()
    }
  })

  test('should create new menu item successfully', async ({ page }) => {
    // Click Create Item button
    await page.getByRole('button', { name: 'Create Item' }).click()
    
    // Verify drawer opens
    await expect(page.getByText('Add New Menu Item')).toBeVisible()
    
    // Fill in item details
    await page.getByLabel('Item Name').fill('Test Burger')
    await page.getByLabel('Price (£)').fill('12.99')
    await page.getByLabel('Description (Optional)').fill('A delicious test burger')
    await page.getByLabel('Category (Optional)').selectOption('Meat')
    
    // Select some modifiers
    await page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]').check()
    await page.getByText('Extras').locator('..').locator('input[type="checkbox"]').check()
    
    // Submit form
    await page.getByRole('button', { name: 'Add Item' }).click()
    
    // Verify drawer closes
    await expect(page.getByText('Add New Menu Item')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Menu item created successfully')).toBeVisible()
    
    // Verify item appears in table
    await expect(page.getByText('Test Burger')).toBeVisible()
    const newItemRow = page.locator('.menu-row').filter({ hasText: 'Test Burger' })
    await expect(newItemRow.getByText('£12.99')).toBeVisible()
    await expect(newItemRow.getByText('Meat')).toBeVisible()
    await expect(newItemRow.getByText('2 groups')).toBeVisible()
  })

  test('should validate required fields when creating item', async ({ page }) => {
    // Click Create Item button
    await page.getByRole('button', { name: 'Create Item' }).click()
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Add Item' }).click()
    
    // Verify validation errors
    await expect(page.getByText('Item name is required')).toBeVisible()
    await expect(page.getByText('Price is required')).toBeVisible()
    
    // Fill only name
    await page.getByLabel('Item Name').fill('Test Item')
    await page.getByRole('button', { name: 'Add Item' }).click()
    
    // Should still show price validation
    await expect(page.getByText('Price is required')).toBeVisible()
    
    // Fill invalid price
    await page.getByLabel('Price (£)').fill('invalid')
    await page.getByRole('button', { name: 'Add Item' }).click()
    
    // Should show price format validation
    await expect(page.getByText('Price must be a valid number')).toBeVisible()
  })

  test('should edit existing menu item successfully', async ({ page }) => {
    // Click edit on first item
    const firstEditButton = page.locator('.menu-action-btn.menu-edit').first()
    await firstEditButton.click()
    
    // Verify edit drawer opens
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
    
    // Verify form is pre-populated
    const nameInput = page.getByLabel('Item Name')
    const priceInput = page.getByLabel('Price (£)')
    
    await expect(nameInput).not.toHaveValue('')
    await expect(priceInput).not.toHaveValue('')
    
    // Update item details
    await nameInput.fill('Updated Item Name')
    await priceInput.fill('15.99')
    
    // Toggle a modifier
    const breadCheckbox = page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]')
    const wasChecked = await breadCheckbox.isChecked()
    if (wasChecked) {
      await breadCheckbox.uncheck()
    } else {
      await breadCheckbox.check()
    }
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Verify drawer closes
    await expect(page.getByText('Edit Menu Item')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Menu item updated successfully')).toBeVisible()
    
    // Verify changes in table
    await expect(page.getByText('Updated Item Name')).toBeVisible()
    const updatedRow = page.locator('.menu-row').filter({ hasText: 'Updated Item Name' })
    await expect(updatedRow.getByText('£15.99')).toBeVisible()
  })

  test('should cancel edit without saving changes', async ({ page }) => {
    // Get original item name
    const firstRow = page.locator('.menu-row').first()
    const originalName = await firstRow.locator('.menu-cell').first().textContent()
    
    // Click edit
    const firstEditButton = page.locator('.menu-action-btn.menu-edit').first()
    await firstEditButton.click()
    
    // Make changes
    await page.getByLabel('Item Name').fill('Should Not Save')
    await page.getByLabel('Price (£)').fill('999.99')
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Verify drawer closes
    await expect(page.getByText('Edit Menu Item')).not.toBeVisible()
    
    // Verify original name is preserved
    await expect(page.getByText(originalName!)).toBeVisible()
    await expect(page.getByText('Should Not Save')).not.toBeVisible()
  })

  test('should delete menu item with confirmation', async ({ page }) => {
    // Get the first item name for verification
    const firstRow = page.locator('.menu-row').first()
    const itemName = await firstRow.locator('.menu-cell').first().textContent()
    
    // Click delete button
    const firstDeleteButton = page.locator('.menu-action-btn.menu-delete').first()
    await firstDeleteButton.click()
    
    // Verify confirmation dialog
    await expect(page.getByText('Delete Menu Item')).toBeVisible()
    await expect(page.getByText('Are you sure you want to delete this menu item?')).toBeVisible()
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Verify success message
    await expect(page.getByText('Menu item deleted successfully')).toBeVisible()
    
    // Verify item is removed from table
    await expect(page.getByText(itemName!)).not.toBeVisible()
    
    // Verify table has one less row
    const remainingRows = page.locator('.menu-row')
    await expect(remainingRows).toHaveCount(2)
  })

  test('should cancel delete operation', async ({ page }) => {
    // Get original row count
    const originalRows = page.locator('.menu-row')
    const originalCount = await originalRows.count()
    
    // Get first item name
    const firstRow = page.locator('.menu-row').first()
    const itemName = await firstRow.locator('.menu-cell').first().textContent()
    
    // Click delete button
    const firstDeleteButton = page.locator('.menu-action-btn.menu-delete').first()
    await firstDeleteButton.click()
    
    // Cancel deletion
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Verify dialog closes
    await expect(page.getByText('Delete Menu Item')).not.toBeVisible()
    
    // Verify item is still in table
    await expect(page.getByText(itemName!)).toBeVisible()
    
    // Verify row count unchanged
    const currentRows = page.locator('.menu-row')
    await expect(currentRows).toHaveCount(originalCount)
  })

  test('should filter items by search term', async ({ page }) => {
    // Type in search box
    const searchInput = page.getByPlaceholder('Search items...')
    await searchInput.fill('Chicken')
    
    // Verify filtered results
    const visibleRows = page.locator('.menu-row:visible')
    const rowCount = await visibleRows.count()
    
    // All visible rows should contain "Chicken"
    for (let i = 0; i < rowCount; i++) {
      const row = visibleRows.nth(i)
      await expect(row).toContainText('Chicken', { ignoreCase: true })
    }
    
    // Clear search
    await searchInput.fill('')
    
    // Verify all items are visible again
    await expect(page.locator('.menu-row')).toHaveCount(3)
  })

  test('should filter items by scope', async ({ page }) => {
    // Select scope filter
    const scopeSelect = page.getByLabel('Scope')
    await scopeSelect.selectOption('region')
    
    // Verify filter is applied (implementation depends on backend)
    // This test assumes the filter affects the displayed results
    await expect(page.locator('.menu-row')).toHaveCountGreaterThan(0)
    
    // Reset filter
    await scopeSelect.selectOption('global')
    await expect(page.locator('.menu-row')).toHaveCount(3)
  })

  test('should handle pagination if implemented', async ({ page }) => {
    // Check if pagination controls exist
    const paginationNext = page.getByRole('button', { name: 'Next' })
    const paginationPrev = page.getByRole('button', { name: 'Previous' })
    
    if (await paginationNext.isVisible()) {
      // Test pagination functionality
      const initialRows = await page.locator('.menu-row').count()
      
      await paginationNext.click()
      
      // Verify page changed (URL or content)
      // Implementation depends on pagination approach
      await expect(page.locator('.menu-row')).toHaveCountGreaterThan(0)
      
      // Go back to first page
      await paginationPrev.click()
      await expect(page.locator('.menu-row')).toHaveCount(initialRows)
    }
  })

  test('should handle keyboard navigation in forms', async ({ page }) => {
    // Open create form
    await page.getByRole('button', { name: 'Create Item' }).click()
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Item Name')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Price (£)')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Description (Optional)')).toBeFocused()
    
    // Test ESC to close
    await page.keyboard.press('Escape')
    await expect(page.getByText('Add New Menu Item')).not.toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error for create operation
    await page.route('**/menu/items', async route => {
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
    
    // Try to create item
    await page.getByRole('button', { name: 'Create Item' }).click()
    await page.getByLabel('Item Name').fill('Test Item')
    await page.getByLabel('Price (£)').fill('10.99')
    await page.getByRole('button', { name: 'Add Item' }).click()
    
    // Verify error message is shown
    await expect(page.getByText('Failed to create menu item')).toBeVisible()
    
    // Verify drawer remains open for retry
    await expect(page.getByText('Add New Menu Item')).toBeVisible()
  })
})