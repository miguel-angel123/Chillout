/** Comprueba que la CSP no rompa el visor 3D ni el catálogo. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

const errores = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errores.push(msg.text().slice(0, 200))
})
page.on('pageerror', (error) => errores.push(`excepción: ${error.message.slice(0, 200)}`))

// Ficha con visor 3D
await page.goto(`${BASE}/producto/hoodie-acanalado-carbon`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

// El visor se monta al abrir la pestaña 3D
const abrir3d = page.getByRole('button', { name: /ver en 3d/i }).first()
if (await abrir3d.count()) {
  await abrir3d.click()
  try {
    await page.waitForSelector('canvas', { timeout: 30_000 })
  } catch {
    console.log('no apareció el canvas tras pulsar «Ver en 3D»')
  }
}
await page.waitForTimeout(3500)

const visor = await page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  if (!canvas) return { hayCanvas: false }
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  return {
    hayCanvas: true,
    ancho: canvas.width,
    alto: canvas.height,
    contextoWebgl: Boolean(gl),
    pixelesNoVacios: (() => {
      try {
        const datos = new Uint8Array(canvas.width * canvas.height * 4)
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, datos)
        let distintos = 0
        for (let i = 0; i < datos.length; i += 400) {
          if (datos[i] > 8 || datos[i + 1] > 8 || datos[i + 2] > 8) distintos += 1
        }
        return distintos
      } catch {
        return -1
      }
    })(),
  }
})
console.log('visor 3D:', JSON.stringify(visor))
await page.screenshot({ path: 'docs/screenshots/auditoria-csp.png' })
console.log('✓ auditoria-csp.png (visor)')

// Catálogo con animaciones
await page.goto(`${BASE}/coleccion`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
const revelado = await page.evaluate(() => {
  const total = document.querySelectorAll('.scroll-reveal').length
  const visibles = document.querySelectorAll('.scroll-reveal[data-visible="true"]').length
  return { total, visibles }
})
console.log('revelado:', JSON.stringify(revelado))

// Portada con parallax
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
await page.waitForTimeout(700)
const parallax = await page.evaluate(
  () => document.querySelector('.hero-sheen > div')?.style.transform ?? null,
)
console.log('parallax:', parallax)

const csp = errores.filter((e) => /content security policy|csp|refused to/i.test(e))
console.log('\nviolaciones CSP:', csp.length)
for (const c of csp.slice(0, 5)) console.log(`  · ${c}`)

console.log('errores de consola:', errores.length)
for (const e of errores.slice(0, 5)) console.log(`  · ${e}`)

await browser.close()
