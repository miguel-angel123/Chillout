/**
 * Diagnóstico profundo de hidratación del lado cliente.
 *   node scripts/debug-hydration.mjs
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })

const errors = []
const failed = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 120)}`))
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`)
})

await page.goto(BASE + '/producto/quarterzip-solid', { waitUntil: 'domcontentloaded', timeout: 90_000 })
await page.waitForSelector('button[aria-pressed]', { timeout: 60_000 })
await page.waitForTimeout(4000)

// 1. ¿Cargaron los chunks de JS?
const scripts = await page.evaluate(() =>
  [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).filter(Boolean).length,
)
const rsc = await page.evaluate(() => (typeof self.__next_f !== 'undefined' ? 'sí' : 'no'))
console.log('scripts con src:', scripts, '| payload RSC:', rsc)

// 2. Geometría y hit-test del botón
const three = page.getByRole('button', { name: /ver en 3d/i }).first()
const box = await three.boundingBox()
console.log('boundingBox:', box)
if (box) {
  const hit = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y)
      return el ? `${el.tagName}.${String(el.className).slice(0, 60)}` : 'nada'
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  )
  console.log('elementFromPoint sobre el botón:', hit)
}

// 3. Click nativo dentro del contexto de la página
const before = await three.getAttribute('aria-pressed')
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button[aria-pressed]')]
  const target = buttons.find((b) => /ver en 3d/i.test(b.textContent ?? ''))
  target?.click()
})
await page.waitForTimeout(3000)
const after = await three.getAttribute('aria-pressed')
console.log(`aria-pressed: antes=${before} después=${after}`)
console.log('canvas tras click nativo:', await page.locator('canvas').count())

// 4. ¿Otro componente cliente responde? (muestra de color)
const swatches = page.locator('button[aria-label][aria-pressed]')
console.log('swatches de color:', await swatches.count())
if ((await swatches.count()) > 1) {
  const other = swatches.nth(1)
  console.log('   antes:', await other.getAttribute('aria-pressed'))
  await other.click({ force: true })
  await page.waitForTimeout(1200)
  console.log('   después:', await other.getAttribute('aria-pressed'))
}

console.log('\nFallos de red:', failed.length)
for (const f of [...new Set(failed)].slice(0, 15)) console.log(' -', f)
console.log('\nErrores JS:', errors.length)
for (const e of [...new Set(errors)].slice(0, 15)) console.log(' -', e.slice(0, 300))

await browser.close()
