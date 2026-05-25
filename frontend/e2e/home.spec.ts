import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('renders hero and main sections', async ({ page }) => {
    await page.goto('/')

    // Title contains brand
    await expect(page).toHaveTitle(/Critical/)

    // Navbar visible
    await expect(page.getByRole('link', { name: /CRITICAL/i }).first()).toBeVisible()

    // All section anchors render in DOM
    await expect(page.locator('#overview')).toBeAttached()
    await expect(page.locator('#features')).toBeAttached()
    await expect(page.locator('#app')).toBeAttached()
    await expect(page.locator('#specs')).toBeAttached()
  })

  test('contact form is reachable', async ({ page }) => {
    await page.goto('/')
    const contactSection = page.locator('#contact')
    await contactSection.scrollIntoViewIfNeeded()
    await expect(contactSection.getByRole('textbox', { name: /邮箱/ })).toBeVisible()
  })

  test('skip-to-content link is keyboard-accessible', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: '跳转到主内容' })
    await expect(skipLink).toBeFocused()
  })
})

test.describe('Static pages', () => {
  for (const path of ['/privacy', '/terms', '/support', '/download', '/firmware', '/blog']) {
    test(`${path} renders without error`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBeLessThan(400)
      // Page has a heading
      await expect(page.locator('h1').first()).toBeVisible()
    })
  }
})

test.describe('404 page', () => {
  test('unknown route shows custom 404', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('404')).toBeVisible()
  })
})

test.describe('SEO essentials', () => {
  test('robots.txt is served', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.ok()).toBe(true)
    const body = await res.text()
    expect(body).toContain('User-agent')
    expect(body).toContain('Sitemap')
  })

  test('sitemap.xml is served', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBe(true)
    const body = await res.text()
    expect(body).toContain('<urlset')
  })

  test('manifest is served', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.ok()).toBe(true)
    const json = await res.json()
    expect(json.name).toContain('Critical')
  })
})
