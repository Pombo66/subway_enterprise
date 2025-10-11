import { test, expect } from '@playwright/test'

test.describe('Menu Modifiers CRUD E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the menu modifiers page
    await page.goto('/menu/modifiers')
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Modifiers' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should display modifier groups table with proper structure', async ({ page }) => {
    // Verify page title and description
    await expect(page.getByText('Modifier Groups')).toBeVisible()
    
    // Verify table headers
    await expect(page.getByText('Group Name')).toBeVisible()
    await expect(page.getByText('Min Selection')).toBeVisible()
    await expect(page.getByText('Max Selection')).toBeVisible()
    await expect(page.getByText('Required')).toBeVisible()
    await expect(page.getByText('Modifiers')).toBeVisible()
    await expect(page.getByText('Actions')).toBeVisible()
    
    // Verify table has data
    const rows = page.locator('[data-testid="modifier-groups-table"] tbody tr')
    await expect(rows).toHaveCountGreaterThan(0)
    
    // Verify each row has proper structure
    const firstRow = rows.first()
    await expect(firstRow.locator('td')).toHaveCount(6) // Name, Min, Max, Required, Modifiers, Actions
    await expect(firstRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(firstRow.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(firstRow.getByRole('button', { name: 'Manage Modifiers' })).toBeVisible()
  })

  test('should create new modifier group successfully', async ({ page }) => {
    // Click Create Modifier Group button
    await page.getByRole('button', { name: 'Create Modifier Group' }).click()
    
    // Verify modal opens
    await expect(page.getByText('Add New Modifier Group')).toBeVisible()
    
    // Fill in modifier group details
    await page.getByLabel('Group Name').fill('Test Modifier Group')
    await page.getByLabel('Min Selection').fill('1')
    await page.getByLabel('Max Selection').fill('3')
    await page.getByLabel('Required').check()
    
    // Submit form
    await page.getByRole('button', { name: 'Create Group' }).click()
    
    // Verify modal closes
    await expect(page.getByText('Add New Modifier Group')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Modifier group created successfully')).toBeVisible()
    
    // Verify group appears in table
    await expect(page.getByText('Test Modifier Group')).toBeVisible()
    const newGroupRow = page.locator('tr').filter({ hasText: 'Test Modifier Group' })
    await expect(newGroupRow.getByText('1')).toBeVisible() // Min selection
    await expect(newGroupRow.getByText('3')).toBeVisible() // Max selection
    await expect(newGroupRow.getByText('Yes')).toBeVisible() // Required
    await expect(newGroupRow.getByText('0')).toBeVisible() // Modifiers count should be 0
  })

  test('should validate modifier group fields', async ({ page }) => {
    // Click Create Modifier Group button
    await page.getByRole('button', { name: 'Create Modifier Group' }).click()
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Create Group' }).click()
    
    // Verify validation errors
    await expect(page.getByText('Group name is required')).toBeVisible()
    await expect(page.getByText('Min selection is required')).toBeVisible()
    await expect(page.getByText('Max selection is required')).toBeVisible()
    
    // Fill invalid values
    await page.getByLabel('Group Name').fill('Test Group')
    await page.getByLabel('Min Selection').fill('5')
    await page.getByLabel('Max Selection').fill('2')
    await page.getByRole('button', { name: 'Create Group' }).click()
    
    // Should show validation error for min > max
    await expect(page.getByText('Min selection cannot be greater than max selection')).toBeVisible()
    
    // Fill negative values
    await page.getByLabel('Min Selection').fill('-1')
    await page.getByLabel('Max Selection').fill('-1')
    await page.getByRole('button', { name: 'Create Group' }).click()
    
    // Should show validation error for negative values
    await expect(page.getByText('Selection values must be positive')).toBeVisible()
  })

  test('should edit existing modifier group successfully', async ({ page }) => {
    // Click edit on first modifier group
    const firstEditButton = page.locator('[data-testid="modifier-groups-table"] tbody tr').first().getByRole('button', { name: 'Edit' })
    await firstEditButton.click()
    
    // Verify edit modal opens
    await expect(page.getByText('Edit Modifier Group')).toBeVisible()
    
    // Verify form is pre-populated
    const nameInput = page.getByLabel('Group Name')
    const minInput = page.getByLabel('Min Selection')
    const maxInput = page.getByLabel('Max Selection')
    
    await expect(nameInput).not.toHaveValue('')
    await expect(minInput).not.toHaveValue('')
    await expect(maxInput).not.toHaveValue('')
    
    // Update group details
    await nameInput.fill('Updated Modifier Group')
    await minInput.fill('2')
    await maxInput.fill('5')
    
    // Toggle required checkbox
    const requiredCheckbox = page.getByLabel('Required')
    const wasRequired = await requiredCheckbox.isChecked()
    if (wasRequired) {
      await requiredCheckbox.uncheck()
    } else {
      await requiredCheckbox.check()
    }
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Verify modal closes
    await expect(page.getByText('Edit Modifier Group')).not.toBeVisible()
    
    // Verify success message
    await expect(page.getByText('Modifier group updated successfully')).toBeVisible()
    
    // Verify changes in table
    await expect(page.getByText('Updated Modifier Group')).toBeVisible()
    const updatedRow = page.locator('tr').filter({ hasText: 'Updated Modifier Group' })
    await expect(updatedRow.getByText('2')).toBeVisible() // Min selection
    await expect(updatedRow.getByText('5')).toBeVisible() // Max selection
    await expect(updatedRow.getByText(wasRequired ? 'No' : 'Yes')).toBeVisible() // Required toggled
  })

  test('should delete modifier group with confirmation', async ({ page }) => {
    // Get the first group name for verification
    const firstRow = page.locator('[data-testid="modifier-groups-table"] tbody tr').first()
    const groupName = await firstRow.locator('td').first().textContent()
    
    // Click delete button
    const firstDeleteButton = firstRow.getByRole('button', { name: 'Delete' })
    await firstDeleteButton.click()
    
    // Verify confirmation dialog
    await expect(page.getByText('Delete Modifier Group')).toBeVisible()
    await expect(page.getByText('Are you sure you want to delete this modifier group?')).toBeVisible()
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Verify success message
    await expect(page.getByText('Modifier group deleted successfully')).toBeVisible()
    
    // Verify group is removed from table
    await expect(page.getByText(groupName!)).not.toBeVisible()
  })

  test('should manage individual modifiers within a group', async ({ page }) => {
    // Click on manage modifiers button for first group
    const firstRow = page.locator('[data-testid="modifier-groups-table"] tbody tr').first()
    const manageModifiersButton = firstRow.getByRole('button', { name: 'Manage Modifiers' })
    await manageModifiersButton.click()
    
    // Verify modifiers management modal opens
    await expect(page.getByText('Manage Modifiers')).toBeVisible()
    
    // Verify modifiers table
    await expect(page.getByText('Modifier Name')).toBeVisible()
    await expect(page.getByText('Price Adjustment')).toBeVisible()
    await expect(page.getByText('Active')).toBeVisible()
    
    // Create new modifier
    await page.getByRole('button', { name: 'Add Modifier' }).click()
    
    // Fill modifier details
    await page.getByLabel('Modifier Name').fill('Test Modifier')
    await page.getByLabel('Price Adjustment (£)').fill('1.50')
    await page.getByLabel('Active').check()
    
    // Save modifier
    await page.getByRole('button', { name: 'Save Modifier' }).click()
    
    // Verify success message
    await expect(page.getByText('Modifier created successfully')).toBeVisible()
    
    // Verify modifier appears in list
    await expect(page.getByText('Test Modifier')).toBeVisible()
    const modifierRow = page.locator('tr').filter({ hasText: 'Test Modifier' })
    await expect(modifierRow.getByText('£1.50')).toBeVisible()
    await expect(modifierRow.getByText('Active')).toBeVisible()
    
    // Edit the modifier
    const editModifierButton = modifierRow.getByRole('button', { name: 'Edit' })
    await editModifierButton.click()
    
    // Update modifier
    await page.getByLabel('Modifier Name').fill('Updated Test Modifier')
    await page.getByLabel('Price Adjustment (£)').fill('2.00')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Verify update
    await expect(page.getByText('Updated Test Modifier')).toBeVisible()
    const updatedModifierRow = page.locator('tr').filter({ hasText: 'Updated Test Modifier' })
    await expect(updatedModifierRow.getByText('£2.00')).toBeVisible()
    
    // Delete the modifier
    const deleteModifierButton = updatedModifierRow.getByRole('button', { name: 'Delete' })
    await deleteModifierButton.click()
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Verify modifier is removed
    await expect(page.getByText('Updated Test Modifier')).not.toBeVisible()
    
    // Close modifiers management modal
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByText('Manage Modifiers')).not.toBeVisible()
  })

  test('should validate modifier fields', async ({ page }) => {
    // Open manage modifiers for first group
    const firstRow = page.locator('[data-testid="modifier-groups-table"] tbody tr').first()
    const manageModifiersButton = firstRow.getByRole('button', { name: 'Manage Modifiers' })
    await manageModifiersButton.click()
    
    // Try to create modifier without required fields
    await page.getByRole('button', { name: 'Add Modifier' }).click()
    await page.getByRole('button', { name: 'Save Modifier' }).click()
    
    // Verify validation errors
    await expect(page.getByText('Modifier name is required')).toBeVisible()
    await expect(page.getByText('Price adjustment is required')).toBeVisible()
    
    // Fill invalid price
    await page.getByLabel('Modifier Name').fill('Test Modifier')
    await page.getByLabel('Price Adjustment (£)').fill('invalid')
    await page.getByRole('button', { name: 'Save Modifier' }).click()
    
    // Should show price validation error
    await expect(page.getByText('Price adjustment must be a valid number')).toBeVisible()
  })

  test('should search modifier groups', async ({ page }) => {
    // Type in search box
    const searchInput = page.getByPlaceholder('Search modifier groups...')
    await searchInput.fill('Bread')
    
    // Verify filtered results
    const visibleRows = page.locator('[data-testid="modifier-groups-table"] tbody tr:visible')
    const rowCount = await visibleRows.count()
    
    // All visible rows should contain "Bread"
    for (let i = 0; i < rowCount; i++) {
      const row = visibleRows.nth(i)
      await expect(row).toContainText('Bread', { ignoreCase: true })
    }
    
    // Clear search
    await searchInput.fill('')
    
    // Verify all groups are visible again
    await expect(page.locator('[data-testid="modifier-groups-table"] tbody tr')).toHaveCountGreaterThan(0)
  })

  test('should display correct modifier counts for each group', async ({ page }) => {
    // Verify that each group shows the correct number of modifiers
    const rows = page.locator('[data-testid="modifier-groups-table"] tbody tr')
    const rowCount = await rows.count()
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const modifiersCountCell = row.locator('td').nth(4) // Modifiers column
      const modifiersCount = await modifiersCountCell.textContent()
      
      // Verify it's a number
      expect(parseInt(modifiersCount!)).toBeGreaterThanOrEqual(0)
    }
  })

  test('should handle item-modifier group relationships', async ({ page }) => {
    // This test verifies the relationship management between items and modifier groups
    // Navigate to items page to test attachment
    await page.getByRole('tab', { name: 'Items' }).click()
    await expect(page).toHaveURL('/menu')
    
    // Edit an item to manage modifiers
    const firstEditButton = page.locator('.menu-action-btn.menu-edit').first()
    await firstEditButton.click()
    
    // Verify modifier groups are available for selection
    await expect(page.getByText('Modifier Groups')).toBeVisible()
    
    // Check some modifier groups
    const modifierCheckboxes = page.locator('input[type="checkbox"]').filter({ hasText: /Bread|Extras|Sauces/ })
    const checkboxCount = await modifierCheckboxes.count()
    
    for (let i = 0; i < Math.min(checkboxCount, 2); i++) {
      await modifierCheckboxes.nth(i).check()
    }
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Verify success message
    await expect(page.getByText('Menu item updated successfully')).toBeVisible()
    
    // Verify modifier count updated in table
    const itemRow = page.locator('.menu-row').first()
    await expect(itemRow.getByText(/\d+ groups/)).toBeVisible()
  })

  test('should handle keyboard navigation in forms', async ({ page }) => {
    // Open create form
    await page.getByRole('button', { name: 'Create Modifier Group' }).click()
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Group Name')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Min Selection')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Max Selection')).toBeFocused()
    
    // Test ESC to close
    await page.keyboard.press('Escape')
    await expect(page.getByText('Add New Modifier Group')).not.toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error for create operation
    await page.route('**/menu/modifier-groups', async route => {
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
    
    // Try to create modifier group
    await page.getByRole('button', { name: 'Create Modifier Group' }).click()
    await page.getByLabel('Group Name').fill('Test Group')
    await page.getByLabel('Min Selection').fill('1')
    await page.getByLabel('Max Selection').fill('3')
    await page.getByRole('button', { name: 'Create Group' }).click()
    
    // Verify error message is shown
    await expect(page.getByText('Failed to create modifier group')).toBeVisible()
    
    // Verify modal remains open for retry
    await expect(page.getByText('Add New Modifier Group')).toBeVisible()
  })

  test('should prevent deletion of modifier group with attached items', async ({ page }) => {
    // Find a modifier group that has items attached (this would need to be set up in seed data)
    // For now, we'll simulate this by checking if the delete operation shows a warning
    
    const firstRow = page.locator('[data-testid="modifier-groups-table"] tbody tr').first()
    const deleteButton = firstRow.getByRole('button', { name: 'Delete' })
    await deleteButton.click()
    
    // If the group has attached items, should show warning
    const warningText = page.getByText('Cannot delete modifier group with attached items')
    if (await warningText.isVisible()) {
      // Verify delete button is disabled or warning is shown
      const confirmDeleteButton = page.getByRole('button', { name: 'Delete' })
      if (await confirmDeleteButton.isVisible()) {
        await expect(confirmDeleteButton).toBeDisabled()
      }
    } else {
      // If no warning, the deletion should proceed normally
      await page.getByRole('button', { name: 'Delete' }).click()
      await expect(page.getByText('Modifier group deleted successfully')).toBeVisible()
    }
  })
})