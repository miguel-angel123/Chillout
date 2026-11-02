/**
 * Captura el 3D girado hasta la espalda para comprobar que el revés usa la
 * fotografía trasera real.
 *   node scripts/back-shot.mjs [baseUrl]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })

const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/producto/prueba-multivista`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(5000)

const canvas = page.locator('canvas').first()
const box = await canvas.boundingBox()

if (!box) {
  console.log('sin canvas')
  process.exit(1)
}

// Arrastre amplio: media vuelta para llegar a la espalda
await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.45)
await page.mouse.down()
await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.45, { steps: 40 })
await page.mouse.up()
await page.waitForTimeout(2500)

await page.screenshot({ path: `${OUT}/producto-3d-espalda.png` })
console.log('✓ producto-3d-espalda.png')

await browser.close()
console.log(errors.length ? `errores: ${errors.join(' | ')}` : 'sin errores')
