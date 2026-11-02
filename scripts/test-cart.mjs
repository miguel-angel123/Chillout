/**
 * Prueba del carrito: agrega una prenda desde la ficha y comprueba que el
 * panel lateral muestra la línea y el subtotal en COP.
 *   node scripts/test-cart.mjs [baseUrl]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })

const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/producto/hoodie-rib`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })

// Elegir talla disponible y agregar
const sizeButton = page.getByRole('button', { name: /^M$/ }).first()
await sizeButton.click()

const addButton = page.getByRole('button', { name: /añadir al carrito/i })
await addButton.click()
await page.waitForTimeout(1200)

// El panel debe estar abierto con la línea
const drawer = page.getByRole('complementary', { name: /carrito de compras/i })
const visible = await drawer.isVisible()
console.log('panel visible:', visible)

const text = (await drawer.innerText()).replace(/\s+/g, ' ')
console.log('contenido:', text.slice(0, 220))

const hasTotal = /\$\s?\d/.test(text)
console.log('muestra subtotal en COP:', hasTotal)

await page.screenshot({ path: `${OUT}/carrito.png` })
console.log('✓ carrito.png')

await browser.close()
console.log(errors.length ? `errores: ${errors.join(' | ')}` : 'sin errores')
