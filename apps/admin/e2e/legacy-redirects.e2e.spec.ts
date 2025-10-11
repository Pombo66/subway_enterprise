import { test, expect } from '@playwright/test'

test.describe('Legacy URL Redirects E2E', () => {
  test('should redirect /categories to /menu/categories', async ({ page }) => {
    await page.goto('/categories')
    
    // Should redirect to the new URL
    await expect(page).toHaveURL('/menu/categories')
    
    // Should show the categories page content
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
  })

  test('should redirect /items to /menu/items', async ({ page }) => {
    await page.goto('/items')
    
    // Should redirect to the new URL
    await expect(page).toHaveURL('/menu/items')
    
    // Should show the items page content
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'true')
  })

  test('should redirect /pricing to /menu/pricing', async ({ page }) => {
    await page.goto('/pricing')
    
    // Should redirect to the new URL
    await expect(page).toHaveURL('/menu/pricing')
    
    // Should show the pricing page content
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Pricing' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Pricing' })).toBeVisible()
  })

  test('should redirect /users to /settings/users', async ({ page }) => {
    await page.goto('/users')
    
    // Should redirect to the new URL
    await expect(page).toHaveURL('/settings/users')
    
    // Should show the users page content
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Users & Roles' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('User Management')).toBeVisible()
  })

  test('should redirect /audit to /settings/audit', async ({ page }) => {
    await page.goto('/audit')
    
    // Should redirect to the new URL
    await expect(page).toHaveURL('/settings/audit')
    
    // Should show the audit page content
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Audit Log' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.s-panelT').filter({ hasText: 'Audit Trail' })).toBeVisible()
  })

  test('should maintain functionality after redirect', async ({ page }) => {
    // Test that redirected pages maintain full functionality
    await page.goto('/categories')
    await expect(page).toHaveURL('/menu/categories')
    
    // Should be able to navigate to other tabs
    await page.getByRole('tab', { name: 'Items' }).click()
    await expect(page).toHaveURL('/menu/items')
    
    // Should be able to navigate back
    await page.getByRole('tab', { name: 'Categories' }).click()
    await expect(page).toHaveURL('/menu/categories')
  })

  test('should handle redirect with query parameters', async ({ page }) => {
    // Test redirects preserve query parameters if any
    await page.goto('/items?search=test')
    await expect(page).toHaveURL('/menu/items?search=test')
  })

  test('should handle redirect with hash fragments', async ({ page }) => {
    // Test redirects preserve hash fragments if any
    await page.goto('/users#profile')
    await expect(page).toHaveURL('/settings/users#profile')
  })

  test('should return proper HTTP status codes for redirects', async ({ page }) => {
    // Test that redirects return 301 (permanent redirect) status
    const response = await page.goto('/categories', { waitUntil: 'networkidle' })
    
    // The final response should be 200 after redirect
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL('/menu/categories')
  })

  test('should work with browser back/forward navigation after redirect', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard')
    
    // Navigate to legacy URL
    await page.goto('/categories')
    await expect(page).toHaveURL('/menu/categories')
    
    // Use browser back button
    await page.goBack()
    await expect(page).toHaveURL('/dashboard')
    
    // Use browser forward button
    await page.goForward()
    await expect(page).toHaveURL('/menu/categories')
  })

  test('should handle multiple redirects in sequence', async ({ page }) => {
    // Navigate through multiple legacy URLs
    await page.goto('/items')
    await expect(page).toHaveURL('/menu/items')
    
    await page.goto('/categories')
    await expect(page).toHaveURL('/menu/categories')
    
    await page.goto('/users')
    await expect(page).toHaveURL('/settings/users')
    
    await page.goto('/audit')
    await expect(page).toHaveURL('/settings/audit')
    
    // Each should maintain proper functionality
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Audit Log' })).toHaveAttribute('aria-selected', 'true')
  })
})