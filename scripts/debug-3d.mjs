/**
 * Diagnóstico del visor 3D: errores de consola, estado del botón y montaje del canvas.
 *   node scripts/debug-3d.mjs
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })

const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

await page.goto(BASE + '/producto/quarterzip-solid', { waitUntil: 'domcontentloaded', timeout: 90_000 })
await page.waitForSelector('button[aria-pressed]', { timeout: 60_000 })
await page.waitForTimeout(2500)

const button = page.getByRole('button', { name: /ver en 3d/i })
console.log('botones que coinciden:', await button.count())
if ((await button.count()) > 0) {
  console.log('disabled :', await button.first().isDisabled())
  console.log('pressed  :', await button.first().getAttribute('aria-pressed'))
}

console.log('canvas antes:', await page.locator('canvas').count())
await button.first().click({ force: true })
await page.waitForTimeout(6000)

console.log('pressed después:', await button.first().getAttribute('aria-pressed'))
console.log('canvas después:', await page.locator('canvas').count())

// ¿Hay WebGL en este navegador?
const webgl = await page.evaluate(() => {
  const c = document.createElement('canvas')
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  return gl ? gl.getParameter(gl.VERSION) : 'sin WebGL'
})
console.log('WebGL:', webgl)

if (consoleErrors.length) {
  console.log('\nErrores de consola/página:')
  for (const e of [...new Set(consoleErrors)].slice(0, 12)) console.log(' -', e.slice(0, 300))
} else {
  console.log('\nSin errores.')
}

await page.screenshot({ path: 'docs/screenshots/debug-3d.png' })
await browser.close()
