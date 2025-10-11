import { test, expect } from '@playwright/test'

test.describe('Menu Categories CRUD E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the menu categories page
    await page.goto('/menu/categories')
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should display categories table with proper structure', async ({ page }) => {
    // Verify page title and description
    await expect(page.getByText('Categories')).toBeVisible()
    
    // Verify table headers
    await expect(page.getByText('Name')).toBeVisible()
    await expect(page.getByText('Description')).toBeVisible()
    await expect(page.getByText('Items Count')).toBeVisible()
    await expect(page.getByText('Actions')).toBeVisible()
    
    // Verify table has data
    const rows = page.locator('[data-testid="categories-table"] tbody tr')
    await expect(rows).toHaveCountGreaterThan(0)
    
    // Verify each row has proper structure
    const firstRow = rows.first()
    await expect(firstRow.locator('td')).toHaveCount(4) // Name, Description, Items Count, Actions
    await expect(firstRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(firstRow.getByRole('button', { name: 'Delete' })).toBeVisible()
  })

  test('should create new category successfully', async ({ page }) => {
    // Click Create Category button
    await page.getByRole('button', { name: 'Create Category' }).click()
    
    // Verify modal opens
    await expect(page.getByText('Add New Category')).toBeVisible()
    
    // Fill in category details
    await page.getByLabel('Category Name').fill('Test Category')
    await page.getByLabel('Description (Optional)').fill('A test category for E2E testing')
    
    // Submit form
    await page.getByRole('button', { name: 'Create Category' }).click()
    
    // Verify modal closes
    await expect(page.getByText('Add New Category')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Category created successfully')).toBeVisible()
    
    // Verify category appears in table
    await expect(page.getByText('Test Category')).toBeVisible()
    const newCategoryRow = page.locator('tr').filter({ hasText: 'Test Category' })
    await expect(newCategoryRow.getByText('A test category for E2E testing')).toBeVisible()
    await expect(newCategoryRow.getByText('0')).toBeVisible() // Items count should be 0
  })

  test('should validate required fields when creating category', async ({ page }) => {
    // Click Create Category button
    await page.getByRole('button', { name: 'Create Category' }).click()
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Create Category' }).click()
    
    // Verify validation error
    await expect(page.getByText('Category name is required')).toBeVisible()
    
    // Fill name with invalid characters
    await page.getByLabel('Category Name').fill('Test@Category!')
    await page.getByRole('button', { name: 'Create Category' }).click()
    
    // Should show format validation (if implemented)
    // This depends on the specific validation rules
  })

  test('should edit existing category successfully', async ({ page }) => {
    // Click edit on first category
    const firstEditButton = page.locator('[data-testid="categories-table"] tbody tr').first().getByRole('button', { name: 'Edit' })
    await firstEditButton.click()
    
    // Verify edit modal opens
    await expect(page.getByText('Edit Category')).toBeVisible()
    
    // Verify form is pre-populated
    const nameInput = page.getByLabel('Category Name')
    const descriptionInput = page.getByLabel('Description (Optional)')
    
    await expect(nameInput).not.toHaveValue('')
    
    // Update category details
    await nameInput.fill('Updated Category Name')
    await descriptionInput.fill('Updated description for testing')
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Verify modal closes
    await expect(page.getByText('Edit Category')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Category updated successfully')).toBeVisible()
    
    // Verify changes in table
    await expect(page.getByText('Updated Category Name')).toBeVisible()
    const updatedRow = page.locator('tr').filter({ hasText: 'Updated Category Name' })
    await expect(updatedRow.getByText('Updated description for testing')).toBeVisible()
  })

  test('should cancel edit without saving changes', async ({ page }) => {
    // Get original category name
    const firstRow = page.locator('[data-testid="categories-table"] tbody tr').first()
    const originalName = await firstRow.locator('td').first().textContent()
    
    // Click edit
    const firstEditButton = firstRow.getByRole('button', { name: 'Edit' })
    await firstEditButton.click()
    
    // Make changes
    await page.getByLabel('Category Name').fill('Should Not Save')
    await page.getByLabel('Description (Optional)').fill('Should not be saved')
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Verify modal closes
    await expect(page.getByText('Edit Category')).not.toBeVisible()
    
    // Verify original name is preserved
    await expect(page.getByText(originalName!)).toBeVisible()
    await expect(page.getByText('Should Not Save')).not.toBeVisible()
  })

  test('should delete category with confirmation', async ({ page }) => {
    // Get the first category name for verification
    const firstRow = page.locator('[data-testid="categories-table"] tbody tr').first()
    const categoryName = await firstRow.locator('td').first().textContent()
    
    // Click delete button
    const firstDeleteButton = firstRow.getByRole('button', { name: 'Delete' })
    await firstDeleteButton.click()
    
    // Verify confirmation dialog
    await expect(page.getByText('Delete Category')).toBeVisible()
    await expect(page.getByText('Are you sure you want to delete this category?')).toBeVisible()
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Verify success message
    await expect(page.getByText('Category deleted successfully')).toBeVisible()
    
    // Verify category is removed from table
    await expect(page.getByText(categoryName!)).not.toBeVisible()
  })

  test('should cancel delete operation', async ({ page }) => {
    // Get original row count
    const originalRows = page.locator('[data-testid="categories-table"] tbody tr')
    const originalCount = await originalRows.count()
    
    // Get first category name
    const firstRow = originalRows.first()
    const categoryName = await firstRow.locator('td').first().textContent()
    
    // Click delete button
    const firstDeleteButton = firstRow.getByRole('button', { name: 'Delete' })
    await firstDeleteButton.click()
    
    // Cancel deletion
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Verify dialog closes
    await expect(page.getByText('Delete Category')).not.toBeVisible()
    
    // Verify category is still in table
    await expect(page.getByText(categoryName!)).toBeVisible()
    
    // Verify row count unchanged
    const currentRows = page.locator('[data-testid="categories-table"] tbody tr')
    await expect(currentRows).toHaveCount(originalCount)
  })

  test('should reorder categories with drag and drop', async ({ page }) => {
    // Get initial order of categories
    const rows = page.locator('[data-testid="categories-table"] tbody tr')
    const firstCategoryName = await rows.first().locator('td').first().textContent()
    const secondCategoryName = await rows.nth(1).locator('td').first().textContent()
    
    // Find drag handles
    const firstDragHandle = rows.first().locator('[data-testid="drag-handle"]')
    const secondRow = rows.nth(1)
    
    // Perform drag and drop
    await firstDragHandle.dragTo(secondRow)
    
    // Verify success message
    await expect(page.getByText('Category order updated successfully')).toBeVisible()
    
    // Verify order has changed
    const updatedRows = page.locator('[data-testid="categories-table"] tbody tr')
    const newFirstCategoryName = await updatedRows.first().locator('td').first().textContent()
    const newSecondCategoryName = await updatedRows.nth(1).locator('td').first().textContent()
    
    expect(newFirstCategoryName).toBe(secondCategoryName)
    expect(newSecondCategoryName).toBe(firstCategoryName)
  })

  test('should manage item assignments for category', async ({ page }) => {
    // Click on manage items button for first category
    const firstRow = page.locator('[data-testid="categories-table"] tbody tr').first()
    const manageItemsButton = firstRow.getByRole('button', { name: 'Manage Items' })
    
    if (await manageItemsButton.isVisible()) {
      await manageItemsButton.click()
      
      // Verify item assignment modal opens
      await expect(page.getByText('Manage Category Items')).toBeVisible()
      
      // Verify available and assigned items sections
      await expect(page.getByText('Available Items')).toBeVisible()
      await expect(page.getByText('Assigned Items')).toBeVisible()
      
      // Try to assign an item
      const assignButton = page.locator('[data-testid="assign-item-button"]').first()
      if (await assignButton.isVisible()) {
        await assignButton.click()
        
        // Verify success message
        await expect(page.getByText('Item assigned to category successfully')).toBeVisible()
      }
      
      // Close modal
      await page.getByRole('button', { name: 'Done' }).click()
      await expect(page.getByText('Manage Category Items')).not.toBeVisible()
    }
  })

  test('should search categories', async ({ page }) => {
    // Type in search box
    const searchInput = page.getByPlaceholder('Search categories...')
    await searchInput.fill('Meat')
    
    // Verify filtered results
    const visibleRows = page.locator('[data-testid="categories-table"] tbody tr:visible')
    const rowCount = await visibleRows.count()
    
    // All visible rows should contain "Meat"
    for (let i = 0; i < rowCount; i++) {
      const row = visibleRows.nth(i)
      await expect(row).toContainText('Meat', { ignoreCase: true })
    }
    
    // Clear search
    await searchInput.fill('')
    
    // Verify all categories are visible again
    await expect(page.locator('[data-testid="categories-table"] tbody tr')).toHaveCountGreaterThan(0)
  })

  test('should handle keyboard navigation in forms', async ({ page }) => {
    // Open create form
    await page.getByRole('button', { name: 'Create Category' }).click()
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Category Name')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Description (Optional)')).toBeFocused()
    
    // Test ESC to close
    await page.keyboard.press('Escape')
    await expect(page.getByText('Add New Category')).not.toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error for create operation
    await page.route('**/menu/categories', async route => {
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
    
    // Try to create category
    await page.getByRole('button', { name: 'Create Category' }).click()
    await page.getByLabel('Category Name').fill('Test Category')
    await page.getByRole('button', { name: 'Create Category' }).click()
    
    // Verify error message is shown
    await expect(page.getByText('Failed to create category')).toBeVisible()
    
    // Verify modal remains open for retry
    await expect(page.getByText('Add New Category')).toBeVisible()
  })

  test('should display correct items count for each category', async ({ page }) => {
    // Verify that each category shows the correct number of items
    const rows = page.locator('[data-testid="categories-table"] tbody tr')
    const rowCount = await rows.count()
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const itemsCountCell = row.locator('td').nth(2) // Items Count column
      const itemsCount = await itemsCountCell.textContent()
      
      // Verify it's a number
      expect(parseInt(itemsCount!)).toBeGreaterThanOrEqual(0)
    }
  })

  test('should prevent deletion of category with assigned items', async ({ page }) => {
    // Find a category with items (count > 0)
    const rowWithItems = page.locator('[data-testid="categories-table"] tbody tr').filter({
      has: page.locator('td').filter({ hasNotText: '0' }).nth(2)
    }).first()
    
    if (await rowWithItems.isVisible()) {
      // Try to delete category with items
      const deleteButton = rowWithItems.getByRole('button', { name: 'Delete' })
      await deleteButton.click()
      
      // Should show warning about assigned items
      await expect(page.getByText('Cannot delete category with assigned items')).toBeVisible()
      
      // Delete button should be disabled or warning shown
      const confirmDeleteButton = page.getByRole('button', { name: 'Delete' })
      if (await confirmDeleteButton.isVisible()) {
        await expect(confirmDeleteButton).toBeDisabled()
      }
    }
  })
})