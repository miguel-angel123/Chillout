/** Captura la pasarela digital y prueba la navegación. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/pasarela`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('section[aria-label="Pasarela digital"]', { timeout: 45_000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/pasarela.png` })
console.log('✓ pasarela.png')

const headingBefore = (await page.locator('section h2').first().innerText()).trim()

const imageState = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('section img')]
  return imgs.map((img) => ({
    src: img.getAttribute('src')?.slice(0, 60),
    natural: img.naturalWidth,
    opacity: getComputedStyle(img).opacity,
  }))
})
console.log('imágenes:', JSON.stringify(imageState, null, 1))

await page.getByRole('button', { name: /prenda siguiente/i }).click()
await page.waitForTimeout(1200)
const headingAfter = (await page.locator('section h2').first().innerText()).trim()

console.log('prenda inicial:', headingBefore)
console.log('tras siguiente:', headingAfter)
console.log('cambió:', headingBefore !== headingAfter)

await page.screenshot({ path: `${OUT}/pasarela-siguiente.png` })
console.log('✓ pasarela-siguiente.png')

await browser.close()
console.log(errors.length ? `errores: ${errors.join(' | ')}` : 'sin errores')
