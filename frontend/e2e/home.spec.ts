import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('renders hero and main sections', async ({ page }) => {
    await page.goto('/')

    // Title contains brand
    await expect(page).toHaveTitle(/Critical/)

    // Brand wordmark visible (Hero h1)
    await expect(page.getByRole('heading', { name: /CRITICAL/i }).first()).toBeVisible()

    // All section anchors render in DOM
    await expect(page.locator('#overview')).toBeAttached()
    await expect(page.locator('#features')).toBeAttached()
    await expect(page.locator('#app')).toBeAttached()
    await expect(page.locator('#specs')).toBeAttached()
    await expect(page.locator('#usecases')).toBeAttached()
    await expect(page.locator('#contact')).toBeAttached()
  })

  test('contact form is reachable', async ({ page }) => {
    await page.goto('/')
    const contactSection = page.locator('#contact')
    await contactSection.scrollIntoViewIfNeeded()
    // Email input rendered (label is locale-dependent so query by type)
    await expect(contactSection.locator('input[type="email"]').first()).toBeVisible()
  })

  test('skip-to-content link is keyboard-accessible', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    // Skip link is the first tab stop. Locale text varies, so match by href.
    const skipLink = page.locator('a[href="#main"]').first()
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

test.describe('Locale routing', () => {
  test('English homepage renders', async ({ page }) => {
    await page.goto('/en')
    await expect(page).toHaveTitle(/Critical/)
    // English-only string we control via Hero.scrollHint shared, badge translated
    const html = await page.content()
    expect(html).toContain('Immersive Cycling Simulator')
  })

  test('Chinese homepage renders', async ({ page }) => {
    await page.goto('/zh')
    const html = await page.content()
    expect(html).toContain('沉浸式骑行模拟系统')
  })

  test('default route serves Chinese (default locale)', async ({ page }) => {
    await page.goto('/')
    const html = await page.content()
    expect(html).toContain('沉浸式骑行模拟系统')
  })

  test('hreflang alternates are emitted', async ({ page }) => {
    await page.goto('/')
    const alternates = await page.locator('link[rel="alternate"][hreflang]').count()
    expect(alternates).toBeGreaterThanOrEqual(2)
  })
})

test.describe('Order lookup', () => {
  test('lookup page renders', async ({ page }) => {
    const res = await page.goto('/order-lookup')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })
})

test.describe('Checkout', () => {
  test('checkout page renders', async ({ page }) => {
    const res = await page.goto('/checkout')
    expect(res?.status()).toBeLessThan(400)
    // Checkout has a heading and a shipping form
    await expect(page.locator('h1').first()).toBeVisible()
  })
})

test.describe('404 page', () => {
  test('unknown route shows custom 404', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist')
    expect(response?.status()).toBe(404)
    // 404 number visible in default locale (any locale)
    await expect(page.getByText('404').first()).toBeVisible()
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
    // Both locales should be mentioned in alternates
    expect(body).toContain('/en')
    expect(body).toContain('/zh')
  })

  test('manifest is served', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.ok()).toBe(true)
    const json = await res.json()
    expect(json.name).toContain('Critical')
    expect(json.icons).toBeDefined()
    expect(json.icons.length).toBeGreaterThan(0)
  })

  test('OG cover SVG is served', async ({ request }) => {
    const res = await request.get('/images/og-cover.svg')
    expect(res.ok()).toBe(true)
    expect(res.headers()['content-type']).toContain('svg')
  })

  test('PWA icon SVG is served', async ({ request }) => {
    const res = await request.get('/icons/icon.svg')
    expect(res.ok()).toBe(true)
    expect(res.headers()['content-type']).toContain('svg')
  })

  test('security.txt is served', async ({ request }) => {
    const res = await request.get('/.well-known/security.txt')
    expect(res.ok()).toBe(true)
    const body = await res.text()
    expect(body.toLowerCase()).toContain('contact:')
  })
})

test.describe('Security headers', () => {
  test('strict-transport-security is set', async ({ request }) => {
    const res = await request.get('/')
    const hsts = res.headers()['strict-transport-security']
    expect(hsts).toBeTruthy()
  })

  test('x-frame-options blocks framing', async ({ request }) => {
    const res = await request.get('/')
    const xfo = res.headers()['x-frame-options']
    expect(xfo).toBeTruthy()
  })
})
