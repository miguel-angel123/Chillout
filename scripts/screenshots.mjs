/**
 * Capturas de verificación visual del sitio en ejecución.
 * Usa Edge instalado en el sistema (channel: 'msedge'), sin descargar Chromium.
 *
 *   node scripts/screenshots.mjs [baseUrl]
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'docs/screenshots'

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })

const desktop = await browser.newContext({
  viewport: { width: 1512, height: 950 },
  deviceScaleFactor: 1,
})
const page = await desktop.newPage()

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

async function settle(page) {
  // Recorre la página para disparar las imágenes con lazy-loading antes de
  // capturar a página completa; si no, las últimas quedan en blanco.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
}

async function shot(path, file, { fullPage = true, wait = 1400 } = {}) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForSelector('main', { timeout: 60_000 })
  await page.waitForTimeout(wait)
  if (fullPage) await settle(page)
  await page.screenshot({ path: `${OUT}/${file}`, fullPage })
  console.log('✓', file)
}

await shot('/', 'home.png')
await shot('/coleccion', 'coleccion.png')
await shot('/producto/hoodie-rib', 'producto.png')

// Visor 3D: se abre desde la ficha y se gira con un arrastre real.
await page.goto(BASE + '/producto/quarterzip-solid', { waitUntil: 'domcontentloaded', timeout: 90_000 })
await page.waitForSelector('button[aria-pressed]', { timeout: 60_000 })
await page.waitForTimeout(2000)
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(6000)
await page.screenshot({ path: `${OUT}/producto-3d.png` })
console.log('✓ producto-3d.png')

// Arrastre para girar y verificar que el modelo responde
const canvas = page.locator('canvas').first()
const box = await canvas.boundingBox()
if (box) {
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.24, box.y + box.height * 0.5, { steps: 24 })
  await page.mouse.up()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${OUT}/producto-3d-girado.png` })
  console.log('✓ producto-3d-girado.png')
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const mpage = await mobile.newPage()
await mpage.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90_000 })
await mpage.waitForTimeout(1400)
await mpage.screenshot({ path: `${OUT}/home-mobile.png` })
console.log('✓ home-mobile.png')

await browser.close()

if (errors.length) {
  console.log('\nErrores de consola:')
  for (const e of [...new Set(errors)]) console.log(' -', e)
} else {
  console.log('\nSin errores de consola.')
}
