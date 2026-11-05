/** Captura el modelo 3D desde cuatro ángulos para evaluarlo con criterio. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = process.argv[3] ?? 'hoodie-acanalado-carbon'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(6000)

// La prenda debe estar completamente visible: si el canvas queda por debajo
// del pliegue, el recorte corta el bajo y parece que la prenda no cabe.
const lienzo = page.locator('canvas').first()
await lienzo.scrollIntoViewIfNeeded()
await page.waitForTimeout(600)
const caja = await lienzo.boundingBox()
const cx = caja.x + caja.width / 2
const cy = caja.y + caja.height / 2

// Un clic detiene la auto-rotación (marca interactuado)
await page.mouse.click(cx, cy)
await page.waitForTimeout(800)

// Captura en 4 giros de ~90° cada uno
for (let k = 0; k < 4; k += 1) {
  await page.screenshot({
    path: `docs/screenshots/visor-angulo-${k}.png`,
    clip: { x: caja.x, y: caja.y, width: caja.width, height: caja.height },
  })
  console.log(`✓ ángulo ${k}`)

  // Arrastra para girar ~90°
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 260, cy, { steps: 25 })
  await page.mouse.up()
  await page.waitForTimeout(1200)
}

await browser.close()
