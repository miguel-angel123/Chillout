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
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(wait)
  if (fullPage) await settle(page)
  await page.screenshot({ path: `${OUT}/${file}`, fullPage })
  console.log('✓', file)
}

await shot('/', 'home.png')
await shot('/coleccion', 'coleccion.png')
await shot('/producto/hoodie-rib', 'producto.png')

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
