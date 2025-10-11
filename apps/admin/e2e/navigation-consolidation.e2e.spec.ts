import { test, expect } from '@playwright/test'

test.describe('Navigation Consolidation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the dashboard
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Subway Enterprise' })).toBeVisible()
  })

  test('should display consolidated navigation with 6 top-level items', async ({ page }) => {
    // Verify the sidebar contains exactly 6 navigation items
    const navItems = page.locator('.sb-nav .sb-link')
    await expect(navItems).toHaveCount(6)
    
    // Verify each navigation item is present and correctly labeled
    await expect(navItems.nth(0)).toContainText('Dashboard')
    await expect(navItems.nth(1)).toContainText('Menu')
    await expect(navItems.nth(2)).toContainText('Orders')
    await expect(navItems.nth(3)).toContainText('Stores')
    await expect(navItems.nth(4)).toContainText('Analytics')
    await expect(navItems.nth(5)).toContainText('Settings')
    
    // Verify navigation items have correct hrefs
    await expect(navItems.nth(0)).toHaveAttribute('href', '/dashboard')
    await expect(navItems.nth(1)).toHaveAttribute('href', '/menu')
    await expect(navItems.nth(2)).toHaveAttribute('href', '/orders')
    await expect(navItems.nth(3)).toHaveAttribute('href', '/stores')
    await expect(navItems.nth(4)).toHaveAttribute('href', '/analytics')
    await expect(navItems.nth(5)).toHaveAttribute('href', '/settings')
  })

  test('should navigate to Menu section and show tab navigation', async ({ page }) => {
    // Click on Menu navigation
    await page.getByRole('complementary').getByRole('link', { name: 'Menu' }).click()
    
    // Verify we're on the menu page
    await expect(page).toHaveURL('/menu/items')
    await expect(page.getByText('Menu Management')).toBeVisible()
    
    // Verify tab navigation is present with 4 tabs
    const tabs = page.locator('[role="tablist"] [role="tab"]')
    await expect(tabs).toHaveCount(4)
    
    // Verify tab labels
    await expect(tabs.nth(0)).toContainText('Items')
    await expect(tabs.nth(1)).toContainText('Categories')
    await expect(tabs.nth(2)).toContainText('Modifiers')
    await expect(tabs.nth(3)).toContainText('Pricing')
    
    // Verify Items tab is active by default
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  })

  test('should navigate between menu tabs correctly', async ({ page }) => {
    await page.goto('/menu')
    
    // Navigate to Categories tab
    await page.getByRole('tab', { name: 'Categories' }).click()
    await expect(page).toHaveURL('/menu/categories')
    await expect(page.getByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'true')
    
    // Navigate to Modifiers tab
    await page.getByRole('tab', { name: 'Modifiers' }).click()
    await expect(page).toHaveURL('/menu/modifiers')
    await expect(page.getByRole('tab', { name: 'Modifiers' })).toHaveAttribute('aria-selected', 'true')
    
    // Navigate to Pricing tab
    await page.getByRole('tab', { name: 'Pricing' }).click()
    await expect(page).toHaveURL('/menu/pricing')
    await expect(page.getByRole('tab', { name: 'Pricing' })).toHaveAttribute('aria-selected', 'true')
    
    // Navigate back to Items tab
    await page.getByRole('tab', { name: 'Items' }).click()
    await expect(page).toHaveURL('/menu/items')
    await expect(page.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should navigate to Settings section and show tab navigation', async ({ page }) => {
    // Click on Settings navigation
    await page.getByRole('complementary').getByRole('link', { name: 'Settings' }).click()
    
    // Verify we're on the settings page
    await expect(page).toHaveURL('/settings/users')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    
    // Verify tab navigation is present with 3 tabs
    const tabs = page.locator('[role="tablist"] [role="tab"]')
    await expect(tabs).toHaveCount(3)
    
    // Verify tab labels
    await expect(tabs.nth(0)).toContainText('Users & Roles')
    await expect(tabs.nth(1)).toContainText('Audit Log')
    await expect(tabs.nth(2)).toContainText('Feature Flags')
    
    // Verify Users & Roles tab is active by default
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  })

  test('should navigate between settings tabs correctly', async ({ page }) => {
    await page.goto('/settings/users')
    
    // Navigate to Audit Log tab
    await page.getByRole('tab', { name: 'Audit Log' }).click()
    await expect(page).toHaveURL('/settings/audit')
    await expect(page.getByRole('tab', { name: 'Audit Log' })).toHaveAttribute('aria-selected', 'true')
    
    // Navigate to Feature Flags tab
    await page.getByRole('tab', { name: 'Feature Flags' }).click()
    await expect(page).toHaveURL('/settings/flags')
    await expect(page.getByRole('tab', { name: 'Feature Flags' })).toHaveAttribute('aria-selected', 'true')
    
    // Navigate back to Users & Roles tab
    await page.getByRole('tab', { name: 'Users & Roles' }).click()
    await expect(page).toHaveURL('/settings/users')
    await expect(page.getByRole('tab', { name: 'Users & Roles' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should navigate to other sections correctly', async ({ page }) => {
    // Test Orders navigation
    await page.getByRole('complementary').getByRole('link', { name: 'Orders' }).click()
    await expect(page).toHaveURL('/orders')
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible()
    
    // Test Stores navigation
    await page.getByRole('complementary').getByRole('link', { name: 'Stores' }).click()
    await expect(page).toHaveURL('/stores')
    await expect(page.getByRole('heading', { name: 'Store Management' })).toBeVisible()
    
    // Test Analytics navigation
    await page.getByRole('complementary').getByRole('link', { name: 'Analytics' }).click()
    await expect(page).toHaveURL('/analytics')
    await expect(page.getByText('Analytics Dashboard')).toBeVisible()
    
    // Test Dashboard navigation
    await page.getByRole('complementary').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: 'Subway Enterprise' })).toBeVisible()
  })

  test('should maintain visual hierarchy and consistent styling', async ({ page }) => {
    // Check sidebar styling
    const sidebar = page.locator('.sb')
    await expect(sidebar).toBeVisible()
    
    // Check brand section
    await expect(page.locator('.sb-brand')).toBeVisible()
    await expect(page.getByText('Subway QSR')).toBeVisible()
    await expect(page.getByText('Admin Dashboard')).toBeVisible()
    
    // Check navigation styling
    const navLinks = page.locator('.sb-nav .sb-link')
    for (let i = 0; i < 6; i++) {
      const link = navLinks.nth(i)
      await expect(link).toHaveClass(/sb-link/)
      await expect(link.locator('.sb-ico')).toBeVisible()
      await expect(link.locator('.sb-txt')).toBeVisible()
    }
  })
})