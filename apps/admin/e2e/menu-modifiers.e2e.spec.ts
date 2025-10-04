import { test, expect } from '@playwright/test'

test.describe('Menu Modifier Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the menu page
    await page.goto('/menu')
    
    // Wait for the page to load
    await expect(page.getByText('Menu Management')).toBeVisible()
  })

  test('should attach and detach modifiers from menu item', async ({ page }) => {
    // Wait for menu items to load
    await expect(page.locator('[data-testid="menu-table"]')).toBeVisible()
    
    // Find the first menu item and click the modifiers button
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await expect(firstModifiersButton).toBeVisible()
    await firstModifiersButton.click()

    // Wait for the modifiers drawer to open
    await expect(page.getByText('Manage Modifiers')).toBeVisible()
    
    // Check that we have available and attached sections
    await expect(page.getByText('Available Modifiers')).toBeVisible()
    await expect(page.getByText('Attached Modifiers')).toBeVisible()

    // Find an available modifier and attach it
    const attachButton = page.locator('[aria-label*="Attach"][aria-label*="modifier"]').first()
    if (await attachButton.isVisible()) {
      // Get the modifier name before attaching
      const modifierCard = attachButton.locator('..').locator('..')
      const modifierName = await modifierCard.locator('h4').textContent()
      
      await attachButton.click()
      
      // Wait for the optimistic update and success toast
      await expect(page.getByText(`${modifierName} modifier attached successfully`)).toBeVisible()
      
      // Verify the modifier moved to the attached section
      await expect(page.locator('[data-testid="attached-modifiers"]').getByText(modifierName!)).toBeVisible()
      
      // Now detach the modifier
      const detachButton = page.locator(`[aria-label*="Detach ${modifierName} modifier"]`)
      await detachButton.click()
      
      // Wait for the success toast
      await expect(page.getByText(`${modifierName} modifier detached successfully`)).toBeVisible()
      
      // Verify the modifier moved back to available section
      await expect(page.locator('[data-testid="available-modifiers"]').getByText(modifierName!)).toBeVisible()
    }

    // Close the drawer
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByText('Manage Modifiers')).not.toBeVisible()
  })

  test('should handle modifier attachment errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/menu/items/*/modifiers', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Failed to attach modifier' })
        })
      } else {
        await route.continue()
      }
    })

    // Open modifiers drawer
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await firstModifiersButton.click()
    await expect(page.getByText('Manage Modifiers')).toBeVisible()

    // Try to attach a modifier
    const attachButton = page.locator('[aria-label*="Attach"][aria-label*="modifier"]').first()
    if (await attachButton.isVisible()) {
      await attachButton.click()
      
      // Should show error toast
      await expect(page.getByText('Failed to attach modifier')).toBeVisible()
    }
  })

  test('should show loading states during operations', async ({ page }) => {
    // Slow down API responses to see loading states
    await page.route('**/menu/items/*/modifiers', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      } else {
        await route.continue()
      }
    })

    // Open modifiers drawer
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await firstModifiersButton.click()
    await expect(page.getByText('Manage Modifiers')).toBeVisible()

    // Try to attach a modifier and check for loading state
    const attachButton = page.locator('[aria-label*="Attach"][aria-label*="modifier"]').first()
    if (await attachButton.isVisible()) {
      await attachButton.click()
      
      // Should show loading spinner in the button
      await expect(attachButton.locator('.animate-spin')).toBeVisible()
    }
  })

  test('should refresh modifier data when refresh button is clicked', async ({ page }) => {
    // Open modifiers drawer
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await firstModifiersButton.click()
    await expect(page.getByText('Manage Modifiers')).toBeVisible()

    // Click refresh button
    const refreshButton = page.getByLabel('Refresh modifier data')
    await refreshButton.click()

    // Should show loading state briefly
    await expect(page.getByText('Loading modifiers...')).toBeVisible()
    
    // Should load data again
    await expect(page.getByText('Available Modifiers')).toBeVisible()
    await expect(page.getByText('Attached Modifiers')).toBeVisible()
  })

  test('should close drawer with ESC key', async ({ page }) => {
    // Open modifiers drawer
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await firstModifiersButton.click()
    await expect(page.getByText('Manage Modifiers')).toBeVisible()

    // Press ESC key
    await page.keyboard.press('Escape')
    
    // Drawer should close
    await expect(page.getByText('Manage Modifiers')).not.toBeVisible()
  })

  test('should close drawer when clicking backdrop', async ({ page }) => {
    // Open modifiers drawer
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await firstModifiersButton.click()
    await expect(page.getByText('Manage Modifiers')).toBeVisible()

    // Click on backdrop
    await page.locator('.bg-black.bg-opacity-50').click()
    
    // Drawer should close
    await expect(page.getByText('Manage Modifiers')).not.toBeVisible()
  })

  test('should display correct modifier counts', async ({ page }) => {
    // Open modifiers drawer
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await firstModifiersButton.click()
    await expect(page.getByText('Manage Modifiers')).toBeVisible()

    // Check that counts are displayed
    await expect(page.getByText(/Available Modifiers \(\d+\)/)).toBeVisible()
    await expect(page.getByText(/Attached Modifiers \(\d+\)/)).toBeVisible()
    await expect(page.getByText(/\d+ modifier(s)? attached/)).toBeVisible()
  })

  test('should handle empty states correctly', async ({ page }) => {
    // Mock empty responses
    await page.route('**/menu/modifier-groups', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      })
    })

    await page.route('**/menu/items/*/modifiers', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
        })
      } else {
        await route.continue()
      }
    })

    // Open modifiers drawer
    const firstModifiersButton = page.locator('[data-testid="modifiers-button"]').first()
    await firstModifiersButton.click()
    await expect(page.getByText('Manage Modifiers')).toBeVisible()

    // Should show empty states
    await expect(page.getByText('No available modifiers')).toBeVisible()
    await expect(page.getByText('No attached modifiers')).toBeVisible()
    await expect(page.getByText('0 modifiers attached')).toBeVisible()
  })
})