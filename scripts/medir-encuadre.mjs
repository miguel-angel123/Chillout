/** Mide qué fracción del canvas ocupa la prenda (para calibrar el encuadre). */
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
const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

let minX = info.width
let minY = info.height
let maxX = -1
let maxY = -1

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const i = (y * info.width + x) * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Prenda = píxel oscuro (el fondo es blanco)
    if (r + g + b < 600) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}

const ancho = maxX - minX + 1
const alto = maxY - minY + 1

console.log('')
console.log('  Encuadre de la prenda en el canvas')
console.log(`    canvas            : ${info.width} × ${info.height}`)
console.log(`    prenda (px)       : ${ancho} × ${alto}`)
console.log(`    fracción ancho    : ${((ancho / info.width) * 100).toFixed(1)} %`)
console.log(`    fracción alto     : ${((alto / info.height) * 100).toFixed(1)} %`)
console.log(`    márgenes L/T/R/B  : ${minX} / ${minY} / ${info.width - maxX - 1} / ${info.height - maxY - 1}`)
console.log('')

const recortado = minX <= 1 || minY <= 1 || maxX >= info.width - 2 || maxY >= info.height - 2
console.log(recortado ? '  ✗ la prenda se sale del marco' : '  ✓ la prenda está completa dentro del marco')
console.log('')

await browser.close()
