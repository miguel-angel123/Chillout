/** Verifica el panel de drops y que la tienda lea el drop desde la base. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1100 } })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))

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
console.log('login:', login.status)

// Panel
await page.goto(`${BASE}/admin/drops`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('form', { timeout: 45_000 })
await page.waitForTimeout(1500)

const panel = await page.evaluate(() => {
  const texto = document.body.innerText
  return {
    tieneSemilla: texto.includes('Carbón nocturno'),
    programados: /(\d+)\s+drops? programado/.exec(texto)?.[1] ?? null,
  }
})
console.log('panel drops:', JSON.stringify(panel))
await page.screenshot({ path: 'docs/screenshots/admin-drops.png' })
console.log('✓ admin-drops.png')

// Tienda
await page.goto(`${BASE}/drops`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('[role="timer"]', { timeout: 45_000 })
await page.waitForTimeout(1500)

const tienda = await page.evaluate(() => ({
  titulo: document.querySelector('h2')?.textContent?.trim() ?? null,
  cuenta: document.querySelector('[role="timer"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
}))
console.log('tienda drops:', JSON.stringify(tienda))
await page.screenshot({ path: 'docs/screenshots/drops-desde-bd.png' })
console.log('✓ drops-desde-bd.png')

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
