/** Capturas del lookbook con conjuntos y del panel de conjuntos. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1100 } })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))

// Lookbook → sección conjuntos
await page.goto(`${BASE}/lookbook#conjuntos`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#conjuntos', { timeout: 45_000 })
await page.waitForTimeout(2000)
await page.locator('#conjuntos').scrollIntoViewIfNeeded()
await page.waitForTimeout(1200)
await page.screenshot({ path: 'docs/screenshots/lookbook-conjuntos.png' })
console.log('✓ lookbook-conjuntos.png')

// Panel
const login = await page.request.post(`${BASE}/api/admin/login`, { data: { password: PASSWORD } })
const cookies = login
  .headersArray()
  .filter((h) => h.name.toLowerCase() === 'set-cookie')
  .map((h) => {
    const [par] = h.value.split(';')
    const i = par.indexOf('=')
    return { name: par.slice(0, i), value: par.slice(i + 1), url: BASE }
  })
await page.context().addCookies(cookies)

await page.goto(`${BASE}/admin/conjuntos`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('form', { timeout: 45_000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'docs/screenshots/admin-conjuntos.png' })
console.log('✓ admin-conjuntos.png')

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
