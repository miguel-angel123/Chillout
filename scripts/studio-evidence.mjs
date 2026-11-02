/**
 * Captura el 3D Studio (tres vistas) y la galería de la ficha con las tres fotos.
 *   node scripts/studio-evidence.mjs [baseUrl]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

// Login y 3D Studio
await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="password"]')
await page.fill('input[type="password"]', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForURL('**/admin', { timeout: 30_000 })
await page.goto(`${BASE}/admin/3d-studio`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="file"]', { state: 'attached' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/studio-tres-vistas.png`, fullPage: true })
console.log('✓ studio-tres-vistas.png')

// Galería de la ficha con las tres fotos
await page.goto(`${BASE}/producto/prueba-tres-vistas`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/ficha-tres-fotos.png` })
console.log('✓ ficha-tres-fotos.png')

const thumbs = await page.locator('ul button[aria-label^="Ver imagen"]').count()
console.log('miniaturas en la galería:', thumbs)

await browser.close()
console.log(errors.length ? `errores: ${errors.join(' | ')}` : 'sin errores')
