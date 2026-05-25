import { test, expect } from '@playwright/test'

test.describe('Admin login', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: /CRITICAL/ })).toBeVisible()
    await expect(page.getByLabel('用户名')).toBeVisible()
    await expect(page.getByLabel('密码')).toBeVisible()
  })

  test('admin route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/admin\/login/)
    expect(page.url()).toContain('/admin/login')
  })
})
