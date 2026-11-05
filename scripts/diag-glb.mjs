/** Diagnóstico completo: consola, errores y estado del canvas. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = process.argv[3] ?? 'hoodie-acanalado-carbon'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text().slice(0, 300)))
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 400)))

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForTimeout(12000)

const estado = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return c ? { ancho: c.width, alto: c.height, css: c.clientWidth + 'x' + c.clientHeight } : null
})
console.log('canvas:', JSON.stringify(estado))

await browser.close()
