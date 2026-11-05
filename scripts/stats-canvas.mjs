/** Mide el detalle del render: media y desviación del canvas en 3D. */
import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = process.argv[3] ?? 'hoodie-acanalado-carbon'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(9000)

const buffer = await page.locator('canvas').first().screenshot()
const stats = await sharp(buffer).stats()

console.log('')
console.log('  Detalle del render 3D')
for (const [i, nombre] of ['R', 'G', 'B'].entries()) {
  const c = stats.channels[i]
  console.log(`    ${nombre}: media ${c.mean.toFixed(1)} · desviación ${c.stdev.toFixed(1)} · min ${c.min} · max ${c.max}`)
}
console.log('')

const stdev = stats.channels.reduce((s, c) => s + c.stdev, 0) / 3
if (stdev < 8) {
  console.log('  ⚠ poco contraste: el modelo podría estar plano o mal iluminado')
} else {
  console.log(`  ✓ hay sombreado y textura (desviación media ${stdev.toFixed(1)})`)
}
console.log('')

await browser.close()
