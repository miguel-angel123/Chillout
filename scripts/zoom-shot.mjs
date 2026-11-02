/** Prueba la lupa macro sobre la foto de la ficha. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/producto/quarterzip-stripe`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.waitForTimeout(2000)

const photo = page.locator('div.touch-pan-y').first()
const box = await photo.boundingBox()
if (!box) {
  console.log('sin foto')
  process.exit(1)
}

console.log('hint visible:', await page.getByText(/mantén presionado para ampliar/i).count())

await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45)
await page.mouse.down()
await page.waitForTimeout(700)

const lens = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(
    (node) => node.className.includes('rounded-full') && node.className.includes('pointer-events-none'),
  )
  if (!el) return null
  const style = getComputedStyle(el)
  return { width: style.width, bgSize: style.backgroundSize, bgImage: style.backgroundImage.slice(0, 40) }
})
console.log('lente:', JSON.stringify(lens))

await page.screenshot({ path: `${OUT}/zoom-macro.png` })
console.log('✓ zoom-macro.png')

await page.mouse.up()
await browser.close()
console.log(errors.length ? `errores: ${errors.join(' | ')}` : 'sin errores')
