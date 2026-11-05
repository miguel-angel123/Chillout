/** Prueba el tinte del GLB por color: mide el color medio del canvas. */
import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = process.argv[3] ?? 'quarterzip-stripe'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

const errores = []
const peticiones = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('response', (r) => {
  if (r.url().includes('.glb')) peticiones.push({ url: r.url().split('/').pop(), status: r.status() })
})

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(9000)

console.log('GLB:', JSON.stringify(peticiones))

const canvas = page.locator('canvas').first()

async function colorMedio(etiqueta) {
  const buffer = await canvas.screenshot()
  const stats = await sharp(buffer).stats()
  const [r, g, b] = stats.channels.map((c) => Math.round(c.mean))
  console.log(`${etiqueta}: rgb(${r}, ${g}, ${b})`)
  return { r, g, b }
}

const c1 = await colorMedio('color 1')

const botones = page.locator('button[aria-label]:not([aria-label*="imagen"])')
const nombres = []
for (let i = 0; i < (await botones.count()); i += 1) {
  const label = await botones.nth(i).getAttribute('aria-label')
  if (label && label.length < 20) nombres.push(label)
}
console.log('botones con nombre:', JSON.stringify(nombres))

// Cambia al segundo color del selector (los primeros botones son los swatches)
const swatches = page.locator('button[style*="background-color"]')
const total = await swatches.count()
console.log('colores disponibles:', total)

let c2 = null
if (total > 1) {
  await swatches.nth(1).click()
  await page.waitForTimeout(4000)
  c2 = await colorMedio('color 2')
  await page.screenshot({ path: 'docs/screenshots/visor-glb-color.png' })
  console.log('✓ visor-glb-color.png')
}

if (c2) {
  const delta = Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b)
  console.log('diferencia de color medio:', delta)
  console.log(delta > 6 ? 'TINTE FUNCIONA ✓' : 'el tinte NO cambió el render ✗')
}

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 3).join(' | ')}` : 'sin errores de consola')
