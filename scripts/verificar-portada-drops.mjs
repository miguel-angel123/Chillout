/** Verifica parallax de portada y cuenta regresiva de drops. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))

// ── Portada: parallax ────────────────────────────────────
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.hero-sheen', { timeout: 45_000 })
await page.waitForTimeout(2600)
await page.screenshot({ path: 'docs/screenshots/portada-hero.png' })
console.log('✓ portada-hero.png')

const leerTransform = () =>
  page.evaluate(() => document.querySelector('.hero-sheen > div')?.style.transform ?? null)

const antes = await leerTransform()
await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'instant' }))
await page.waitForTimeout(700)
const despues = await leerTransform()

console.log('parallax scroll 0   :', antes)
console.log('parallax scroll 420 :', despues)
console.log('parallax activo     :', Boolean(antes && despues && antes !== despues))

// ── Drops: cuenta regresiva ──────────────────────────────
await page.goto(`${BASE}/drops`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('[role="timer"]', { timeout: 45_000 })
await page.waitForTimeout(2400)

const cuenta = await page.evaluate(() => {
  const timer = document.querySelector('[role="timer"]')
  return timer ? timer.innerText.replace(/\s+/g, ' ').trim() : null
})
console.log('cuenta regresiva    :', cuenta)

await page.screenshot({ path: 'docs/screenshots/drops.png' })
console.log('✓ drops.png')

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
