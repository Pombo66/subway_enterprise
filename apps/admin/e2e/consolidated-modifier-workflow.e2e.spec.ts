import { test, expect } from '@playwright/test'

test.describe('Consolidated Modifier Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the menu page
    await page.goto('/menu')
    
    // Wait for the page to load
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.locator('[data-testid="menu-table"]')).toBeVisible()
  })

  test('should create new item with modifiers via Edit drawer', async ({ page }) => {
    // Click the "Create Item" button
    await page.getByRole('button', { name: 'Create Item' }).click()
    
    // Wait for the Add Item drawer to open
    await expect(page.getByText('Add New Menu Item')).toBeVisible()
    
    // Fill in the basic item details
    await page.getByLabel('Item Name').fill('Test Sandwich')
    await page.getByLabel('Price (£)').fill('9.99')
    await page.getByLabel('Description (Optional)').fill('A delicious test sandwich')
    await page.getByLabel('Category (Optional)').selectOption('Meat')
    
    // Select modifiers using checkboxes
    await page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]').check()
    await page.getByText('Extras').locator('..').locator('input[type="checkbox"]').check()
    await page.getByText('Sauces').locator('..').locator('input[type="checkbox"]').check()
    
    // Verify all modifiers are selected
    await expect(page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]')).toBeChecked()
    await expect(page.getByText('Extras').locator('..').locator('input[type="checkbox"]')).toBeChecked()
    await expect(page.getByText('Sauces').locator('..').locator('input[type="checkbox"]')).toBeChecked()
    
    // Submit the form
    await page.getByRole('button', { name: 'Add Item' }).click()
    
    // Wait for drawer to close
    await expect(page.getByText('Add New Menu Item')).not.toBeVisible()
    
    // Verify the new item appears in the table with correct modifier count
    await expect(page.getByText('Test Sandwich')).toBeVisible()
    
    // Find the row containing our new item and check modifier count
    const itemRow = page.locator('.menu-row').filter({ hasText: 'Test Sandwich' })
    await expect(itemRow.getByText('3 groups')).toBeVisible()
  })

  test('should edit existing item modifiers via Edit drawer', async ({ page }) => {
    // Find the first item in the table and click Edit
    const firstEditButton = page.locator('.menu-action-btn.menu-edit').first()
    await expect(firstEditButton).toBeVisible()
    await firstEditButton.click()
    
    // Wait for the Edit Item drawer to open
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
    
    // Verify current modifier selections are loaded
    const breadCheckbox = page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]')
    const extrasCheckbox = page.getByText('Extras').locator('..').locator('input[type="checkbox"]')
    const saucesCheckbox = page.getByText('Sauces').locator('..').locator('input[type="checkbox"]')
    
    // Get initial state of checkboxes
    const initialBreadState = await breadCheckbox.isChecked()
    const initialExtrasState = await extrasCheckbox.isChecked()
    const initialSaucesState = await saucesCheckbox.isChecked()
    
    // Toggle some modifiers
    if (initialBreadState) {
      await breadCheckbox.uncheck()
    } else {
      await breadCheckbox.check()
    }
    
    if (!initialExtrasState) {
      await extrasCheckbox.check()
    }
    
    if (!initialSaucesState) {
      await saucesCheckbox.check()
    }
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Wait for drawer to close
    await expect(page.getByText('Edit Menu Item')).not.toBeVisible()
    
    // Verify the modifier count updated in the table
    // Count expected modifiers based on our changes
    let expectedCount = 0
    if (!initialBreadState) expectedCount++ // We toggled it
    expectedCount++ // We ensured extras is checked
    expectedCount++ // We ensured sauces is checked
    
    // Find the updated row and verify modifier count
    const updatedRow = page.locator('.menu-row').first()
    await expect(updatedRow.getByText(`${expectedCount} groups`)).toBeVisible()
  })

  test('should display correct modifier counts in table', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('[data-testid="menu-table"]')).toBeVisible()
    
    // Check that all items show modifier counts in the correct format
    const modifierCells = page.locator('.menu-cell').filter({ hasText: /\d+ groups/ })
    const count = await modifierCells.count()
    
    // Verify we have modifier count cells
    expect(count).toBeGreaterThan(0)
    
    // Verify each modifier count cell shows the correct format
    for (let i = 0; i < count; i++) {
      const cell = modifierCells.nth(i)
      await expect(cell).toHaveText(/^\d+ groups$/)
    }
    
    // Verify the modifiers column header exists
    await expect(page.getByText('Modifiers').first()).toBeVisible()
  })

  test('should not have any modifiers drawer functionality remaining', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('[data-testid="menu-table"]')).toBeVisible()
    
    // Verify there are no "Modifiers" buttons in the Actions column
    const modifiersButtons = page.locator('[data-testid="modifiers-button"]')
    await expect(modifiersButtons).toHaveCount(0)
    
    // Verify there are no buttons with "Modifiers" text in the actions column
    const actionButtons = page.locator('.menu-actions button')
    const actionButtonsCount = await actionButtons.count()
    
    for (let i = 0; i < actionButtonsCount; i++) {
      const button = actionButtons.nth(i)
      const buttonText = await button.textContent()
      expect(buttonText?.toLowerCase()).not.toContain('modifier')
    }
    
    // Verify only Edit and Delete buttons exist in actions
    await expect(page.locator('.menu-action-btn.menu-edit')).toHaveCount(3) // Based on mock data
    await expect(page.locator('.menu-action-btn.menu-delete')).toHaveCount(3) // Based on mock data
    
    // Verify no modifiers drawer can be opened
    await expect(page.getByText('Manage Modifiers')).not.toBeVisible()
    
    // Try clicking on the modifiers column - should not open any drawer
    const modifiersColumn = page.locator('.menu-cell').filter({ hasText: /\d+ groups/ }).first()
    await modifiersColumn.click()
    
    // Wait a moment and verify no drawer opened
    await page.waitForTimeout(500)
    await expect(page.getByText('Manage Modifiers')).not.toBeVisible()
  })

  test('should preserve modifier data when canceling edit', async ({ page }) => {
    // Get the first item's current modifier count
    const firstRow = page.locator('.menu-row').first()
    const originalModifierText = await firstRow.locator('.menu-cell').filter({ hasText: /\d+ groups/ }).textContent()
    
    // Click Edit on the first item
    const firstEditButton = page.locator('.menu-action-btn.menu-edit').first()
    await firstEditButton.click()
    
    // Wait for the Edit Item drawer to open
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
    
    // Make some changes to modifiers
    const breadCheckbox = page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]')
    const initialState = await breadCheckbox.isChecked()
    
    // Toggle the checkbox
    if (initialState) {
      await breadCheckbox.uncheck()
    } else {
      await breadCheckbox.check()
    }
    
    // Cancel instead of saving
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Wait for drawer to close
    await expect(page.getByText('Edit Menu Item')).not.toBeVisible()
    
    // Verify the modifier count is unchanged
    const updatedModifierText = await firstRow.locator('.menu-cell').filter({ hasText: /\d+ groups/ }).textContent()
    expect(updatedModifierText).toBe(originalModifierText)
  })

  test('should handle form validation for modifier selection', async ({ page }) => {
    // Click the "Create Item" button
    await page.getByRole('button', { name: 'Create Item' }).click()
    
    // Wait for the Add Item drawer to open
    await expect(page.getByText('Add New Menu Item')).toBeVisible()
    
    // Fill in required fields but leave modifiers unselected
    await page.getByLabel('Item Name').fill('Test Item No Modifiers')
    await page.getByLabel('Price (£)').fill('5.99')
    
    // Verify no modifiers are selected
    await expect(page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]')).not.toBeChecked()
    await expect(page.getByText('Extras').locator('..').locator('input[type="checkbox"]')).not.toBeChecked()
    await expect(page.getByText('Sauces').locator('..').locator('input[type="checkbox"]')).not.toBeChecked()
    
    // Submit the form (should work even without modifiers)
    await page.getByRole('button', { name: 'Add Item' }).click()
    
    // Wait for drawer to close
    await expect(page.getByText('Add New Menu Item')).not.toBeVisible()
    
    // Verify the new item appears with 0 modifiers
    await expect(page.getByText('Test Item No Modifiers')).toBeVisible()
    const itemRow = page.locator('.menu-row').filter({ hasText: 'Test Item No Modifiers' })
    await expect(itemRow.getByText('0 groups')).toBeVisible()
  })

  test('should maintain modifier state when switching between items', async ({ page }) => {
    // Edit first item
    const firstEditButton = page.locator('.menu-action-btn.menu-edit').first()
    await firstEditButton.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
    
    // Note the current state of modifiers
    const breadCheckbox = page.getByText('Bread Types').locator('..').locator('input[type="checkbox"]')
    const firstItemBreadState = await breadCheckbox.isChecked()
    
    // Close the drawer
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Edit Menu Item')).not.toBeVisible()
    
    // Edit second item
    const secondEditButton = page.locator('.menu-action-btn.menu-edit').nth(1)
    await secondEditButton.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
    
    // Note the state of modifiers for second item
    const secondItemBreadState = await breadCheckbox.isChecked()
    
    // Close and go back to first item
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Edit Menu Item')).not.toBeVisible()
    
    await firstEditButton.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
    
    // Verify the first item's state is preserved
    const restoredBreadState = await breadCheckbox.isChecked()
    expect(restoredBreadState).toBe(firstItemBreadState)
    
    // Close drawer
    await page.getByRole('button', { name: 'Cancel' }).click()
  })

  test('should handle ESC key to close edit drawer', async ({ page }) => {
    // Open edit drawer
    const firstEditButton = page.locator('.menu-action-btn.menu-edit').first()
    await firstEditButton.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
    
    // Press ESC key
    await page.keyboard.press('Escape')
    
    // Verify drawer closes
    await expect(page.getByText('Edit Menu Item')).not.toBeVisible()
  })

  test('should handle ESC key to close add drawer', async ({ page }) => {
    // Open add drawer
    await page.getByRole('button', { name: 'Create Item' }).click()
    await expect(page.getByText('Add New Menu Item')).toBeVisible()
    
    // Press ESC key
    await page.keyboard.press('Escape')
    
    // Verify drawer closes
    await expect(page.getByText('Add New Menu Item')).not.toBeVisible()
  })
})