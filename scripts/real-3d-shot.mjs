/** Captura el 3D de la prenda real: frente y espalda. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = 'hoodie-acanalado-carbon'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(6000)

await page.screenshot({ path: `${OUT}/real-3d-frente.png` })
console.log('✓ real-3d-frente.png')

const box = await page.locator('canvas').first().boundingBox()
if (box) {
  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.45)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.45, { steps: 40 })
  await page.mouse.up()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/real-3d-espalda.png` })
  console.log('✓ real-3d-espalda.png')
}

await browser.close()
console.log(errors.length ? `errores: ${errors.join(' | ')}` : 'sin errores')
