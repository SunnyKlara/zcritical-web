import { test, expect } from '@playwright/test'

test.describe('Admin login', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/admin/login')
    // Brand wordmark visible
    await expect(page.getByRole('heading', { name: /CRITICAL/ })).toBeVisible()
    // Form has username + password inputs (locale-agnostic via type)
    await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('admin route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/admin\/login/)
    expect(page.url()).toContain('/admin/login')
  })

  test('admin pages all redirect when unauthenticated', async ({ page }) => {
    for (const path of ['/admin/leads', '/admin/orders', '/admin/firmware', '/admin/chat']) {
      await page.goto(path)
      await page.waitForURL(/\/admin\/login/, { timeout: 5_000 })
      expect(page.url()).toContain('/admin/login')
    }
  })
})
