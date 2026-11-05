/** Prueba el visor GLB: abre la ficha, entra en 3D y verifica que carga el modelo. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = 'hoodie-acanalado-carbon'
const OUT = 'docs/screenshots'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

const errores = []
const peticiones = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('response', (r) => {
  if (r.url().includes('.glb')) peticiones.push({ url: r.url().split('/').pop(), status: r.status() })
})

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('button[aria-pressed]', { timeout: 45_000 })
await page.getByRole('button', { name: /ver en 3d/i }).click()
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(9000)

console.log('peticiones GLB:', JSON.stringify(peticiones))
console.log('gancho 3D visible:', await page.getByText(/arrastra para girar/i).count())

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return c ? { ancho: c.width, alto: c.height } : null
})
console.log('canvas:', JSON.stringify(info))

await page.screenshot({ path: `${OUT}/visor-glb.png` })
console.log('✓ visor-glb.png')

// Cambiar de color y comprobar que el modelo sigue vivo
const colores = await page.locator('button[aria-label^="Color"]').count()
if (colores > 1) {
  await page.locator('button[aria-label^="Color"]').nth(1).click()
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${OUT}/visor-glb-color.png` })
  console.log('✓ visor-glb-color.png (color alternativo)')
}
console.log('colores disponibles:', colores)

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 3).join(' | ')}` : 'sin errores de consola')
