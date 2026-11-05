/** Calibra la escala del modelo midiendo la prenda en pantalla. */
import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = 'hoodie-acanalado-carbon'

const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function medir(escala) {
  const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
  const url = `${BASE}/producto/${SLUG}${escala ? `?escala=${escala}` : ''}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
  await page.getByRole('button', { name: /ver en 3d/i }).click()
  await page.waitForSelector('canvas', { timeout: 60_000 })
  await page.waitForTimeout(8000)

  // Screenshot recortado a nivel de página: compone el WebGL (el de elemento
  // devuelve un lienzo negro en algunos drivers).
  const caja = await page.locator('canvas').first().boundingBox()
  const buffer = await page.screenshot({
    clip: { x: caja.x, y: caja.y, width: caja.width, height: caja.height },
  })
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4
      if (data[i] + data[i + 1] + data[i + 2] < 600) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const ancho = maxX - minX + 1
  const alto = maxY - minY + 1
  const recortado = minX <= 1 || minY <= 1 || maxX >= info.width - 2 || maxY >= info.height - 2

  console.log(
    `  escala=${String(escala ?? 'auto').padEnd(5)} ancho=${((ancho / info.width) * 100).toFixed(1)}% alto=${((alto / info.height) * 100).toFixed(1)}% márgenes L${minX} T${minY} R${info.width - maxX - 1} B${info.height - maxY - 1} ${recortado ? 'RECORTADO' : 'completo'}`,
  )

  await page.close()
  return { ancho, alto, recortado }
}

console.log('')
console.log('  Calibración de encuadre')
await medir(null)
for (const e of [0.35, 0.5, 0.65, 0.8]) await medir(e)
console.log('')

await browser.close()
