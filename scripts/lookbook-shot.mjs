/** Prueba el lookbook: abre un hotspot y verifica la tarjeta. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/lookbook`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('figure', { timeout: 45_000 })
await page.waitForTimeout(2500)

const dots = await page.getByRole('button', { name: /^Ver /i }).count()
console.log('hotspots encontrados:', dots)

await page.screenshot({ path: `${OUT}/lookbook.png`, fullPage: true })
console.log('✓ lookbook.png')

// Abre el primer hotspot
await page.getByRole('button', { name: /^Ver /i }).first().click()
await page.waitForTimeout(900)

const opened = await page.getByRole('link', { name: /ver producto/i }).count()
console.log('tarjeta abierta con enlace:', opened > 0)

await page.screenshot({ path: `${OUT}/lookbook-hotspot.png` })
console.log('✓ lookbook-hotspot.png')

await browser.close()
console.log(errors.length ? `errores: ${errors.join(' | ')}` : 'sin errores')
