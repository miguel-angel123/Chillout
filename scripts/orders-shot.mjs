/** Captura la bandeja de pedidos y la página de confirmación. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })

await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="password"]')
await page.fill('input[type="password"]', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForURL('**/admin', { timeout: 30_000 })

await page.goto(`${BASE}/admin/pedidos`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('table', { timeout: 30_000 })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${OUT}/admin-pedidos.png` })
console.log('✓ admin-pedidos.png')

const rows = await page.locator('tbody tr').count()
console.log('filas de pedidos:', rows)

await browser.close()
