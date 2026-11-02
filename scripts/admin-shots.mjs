/**
 * Capturas del panel del gerente y de la prenda recién publicada.
 *   node scripts/admin-shots.mjs [baseUrl]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })

const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

// Login
await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="password"]')
await page.screenshot({ path: `${OUT}/admin-login.png` })
console.log('✓ admin-login.png')

await page.fill('input[type="password"]', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForURL('**/admin', { timeout: 30_000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/admin-dashboard.png` })
console.log('✓ admin-dashboard.png')

// Studio
await page.goto(`${BASE}/admin/3d-studio`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="file"]', { state: 'attached' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/admin-studio.png`, fullPage: true })
console.log('✓ admin-studio.png')

// Prenda publicada por el pipeline, en 3D
await page.goto(`${BASE}/producto/sueter-prueba-studio`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 30_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 45_000 })
await page.waitForTimeout(6000)
await page.screenshot({ path: `${OUT}/studio-producto-3d.png` })
console.log('✓ studio-producto-3d.png')

await browser.close()

if (errors.length) {
  console.log('\nErrores:')
  for (const e of [...new Set(errors)].slice(0, 8)) console.log(' -', e.slice(0, 200))
} else {
  console.log('\nSin errores de consola.')
}
