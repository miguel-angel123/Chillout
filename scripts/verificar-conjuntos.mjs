/** Verifica la página de conjuntos y el alta del look completo en el carrito. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))

await page.goto(`${BASE}/mix-and-match`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('article', { timeout: 45_000 })
await page.waitForTimeout(1800)

const info = await page.evaluate(() => {
  const articulo = document.querySelector('article')
  if (!articulo) return null
  const titulo = articulo.querySelector('h2')?.textContent?.trim() ?? null
  const piezas = articulo.querySelectorAll('ul li').length
  const tallas = [...articulo.querySelectorAll('button[aria-pressed]')].map((b) => b.textContent?.trim())
  const total = [...articulo.querySelectorAll('span')]
    .map((s) => s.textContent?.trim() ?? '')
    .find((t) => t.startsWith('$')) ?? null
  return { titulo, piezas, tallas, total }
})
console.log('conjunto :', JSON.stringify(info))

await page.screenshot({ path: 'docs/screenshots/conjuntos.png' })
console.log('✓ conjuntos.png')

// Talla L y añadir
const botonL = page.locator('article button[aria-pressed]', { hasText: /^L$/ }).first()
if (await botonL.count()) {
  await botonL.click()
  await page.waitForTimeout(400)
}

await page.getByRole('button', { name: /añadir el conjunto/i }).first().click()
await page.waitForTimeout(1600)

const carrito = await page.evaluate(() => {
  const crudo = localStorage.getItem('chillout-cart')
  if (!crudo) return null
  const datos = JSON.parse(crudo)
  const items = datos?.state?.items ?? []
  return {
    unidades: items.reduce((s, i) => s + (i.qty ?? 0), 0),
    piezas: items.map((i) => `${i.slug}·${i.size}`),
  }
})
console.log('carrito  :', JSON.stringify(carrito))

await page.screenshot({ path: 'docs/screenshots/conjuntos-carrito.png' })
console.log('✓ conjuntos-carrito.png')

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
