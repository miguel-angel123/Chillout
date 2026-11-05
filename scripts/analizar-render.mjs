/** Analiza numéricamente el render 3D: silueta, simetría, distribución. */
import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = process.argv[3] ?? 'hoodie-acanalado-carbon'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(9000)

const caja = await page.locator('canvas').first().boundingBox()
const buffer = await page.screenshot({
  clip: { x: caja.x, y: caja.y, width: caja.width, height: caja.height },
})
const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = info

// Prenda = pixel no blanco (fondo blanco)
const esPrenda = (i) => data[i] + data[i + 1] + data[i + 2] < 720

// perfil por fila: xmin, xmax, conteo
const filas = []
let totalPrenda = 0
let minX = width, maxX = -1, minY = height, maxY = -1

for (let y = 0; y < height; y += 1) {
  let xmin = width, xmax = -1, cuenta = 0
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4
    if (esPrenda(i)) {
      cuenta += 1
      if (x < xmin) xmin = x
      if (x > xmax) xmax = x
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  filas.push({ y, xmin, xmax, cuenta })
  totalPrenda += cuenta
}

const ancho = maxX - minX + 1
const alto = maxY - minY + 1
const centroX = (minX + maxX) / 2

// Simetría: comparar mitad izquierda vs derecha
let izq = 0, der = 0
for (const f of filas) {
  if (f.xmin < 0) continue
  for (let x = f.xmin; x <= f.xmax; x += 1) {
    const i = (f.y * width + x) * 4
    if (esPrenda(i)) (x < centroX ? izq++ : der++)
  }
}

console.log('')
console.log('  Análisis del render 3D')
console.log(`    canvas        : ${width} × ${height}`)
console.log(`    prenda bbox   : ${ancho} × ${alto} (x ${minX}..${maxX}, y ${minY}..${maxY})`)
console.log(`    ocupa         : ancho ${((ancho / width) * 100).toFixed(0)}% · alto ${((alto / height) * 100).toFixed(0)}%`)
console.log(`    píxeles prenda: ${totalPrenda} (${((totalPrenda / (width * height)) * 100).toFixed(1)}%)`)
console.log(`    simetría izq/der: ${izq} / ${der} (${(izq / Math.max(1, der)).toFixed(2)})`)
console.log(`    recortada      : ${minX <= 1 || minY <= 1 || maxX >= width - 2 || maxY >= height - 2 ? 'SÍ' : 'no'}`)
console.log('')

// Perfil de anchura por franja (para ver capota/hombros/bajo)
const franjas = 10
console.log('    perfil (abajo→arriba), anchura relativa:')
for (let k = 0; k < franjas; k += 1) {
  const y0 = Math.floor((k / franjas) * height)
  const y1 = Math.floor(((k + 1) / franjas) * height)
  let xmin = width, xmax = -1, cuenta = 0
  for (let y = y0; y < y1; y += 1) {
    const f = filas[y]
    if (f && f.cuenta > 0) {
      if (f.xmin < xmin) xmin = f.xmin
      if (f.xmax > xmax) xmax = f.xmax
      cuenta += f.cuenta
    }
  }
  const w = xmax >= xmin ? xmax - xmin + 1 : 0
  console.log(`      ${String(k).padStart(2)}/9  ancho ${String(w).padStart(3)}px  píxeles ${cuenta}`)
}
console.log('')

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
