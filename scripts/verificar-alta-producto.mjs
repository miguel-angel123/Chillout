/** Prueba el alta de producto desde el panel: login, formulario, imagen y GLB. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const IMAGEN = 'Chillout_imagenes/WhatsApp Image 2026-11-02 at 1.21.06 PM.jpeg'
const GLB = 'public/media/models/hoodie-acanalado-carbon.glb'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1100 } })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))

// ── Login por API y cookie en el contexto ────────────────
const login = await page.request.post(`${BASE}/api/admin/login`, { data: { password: PASSWORD } })
console.log('login:', login.status())

const cookies = login
  .headersArray()
  .filter((h) => h.name.toLowerCase() === 'set-cookie')
  .map((h) => {
    const [par] = h.value.split(';')
    const indice = par.indexOf('=')
    return { name: par.slice(0, indice), value: par.slice(indice + 1), url: BASE }
  })
await page.context().addCookies(cookies)
console.log('cookies:', cookies.map((c) => c.name).join(', ') || '(ninguna)')

// ── Lista de productos ───────────────────────────────────
await page.goto(`${BASE}/admin/productos`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const enLista = await page.evaluate(() => document.body.innerText.includes('Productos'))
console.log('lista de productos visible:', enLista)
await page.screenshot({ path: 'docs/screenshots/admin-productos.png' })
console.log('✓ admin-productos.png')

// ── Formulario de alta ───────────────────────────────────
await page.goto(`${BASE}/admin/productos/nuevo`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('form', { timeout: 45_000 })
await page.waitForTimeout(1200)

await page.fill('input[placeholder="Hoodie Acanalado"]', 'Prueba Panel TEMP')
await page.fill('input[placeholder="Punto grueso · Capota"]', 'Prueba de alta · borrar')
await page.fill('input[placeholder="329000"]', '315000')
await page.fill('input[placeholder="55% algodón, 45% acrílico · 580 g/m²"]', '60% algodón, 40% acrílico')
await page.fill('input[placeholder="Nuevo, Oversize, Hoodies"]', 'Nuevo, Prueba')

// Imagen (input múltiple) y GLB
await page.locator('input[type="file"][multiple]').setInputFiles(IMAGEN)
await page.waitForTimeout(900)
await page.locator('input[type="file"][accept*="glb"]').setInputFiles(GLB)
await page.waitForTimeout(700)

await page.screenshot({ path: 'docs/screenshots/admin-nuevo-producto.png' })
console.log('✓ admin-nuevo-producto.png')

await page.getByRole('button', { name: /publicar prenda/i }).click()
await page.waitForTimeout(6000)

const resultado = await page.evaluate(() => document.body.innerText)
const publicada = resultado.includes('Prenda publicada')
const conModelo = resultado.includes('modelo 3D adjunto')
console.log('publicada:', publicada, '· con GLB:', conModelo)

// Extraer el enlace de la ficha desde el bloque de resultado
const enlace = await page.evaluate(() => {
  const a = [...document.querySelectorAll('a')].find((el) =>
    el.getAttribute('href')?.startsWith('/producto/'),
  )
  return a?.getAttribute('href') ?? null
})
console.log('ficha:', enlace)

await page.screenshot({ path: 'docs/screenshots/admin-producto-publicado.png' })
console.log('✓ admin-producto-publicado.png')

// Verificar que la ficha carga y que el GLB responde
if (enlace) {
  const ficha = await page.request.get(`${BASE}${enlace}`)
  const slug = enlace.split('/').pop()
  const glb = await page.request.get(`${BASE}/api/media/models/${slug}.glb`)
  const imagen = await page.request.get(`${BASE}/api/media/products/${slug}-01.jpg`)
  console.log('ficha:', ficha.status(), '· glb:', glb.status(), '· imagen:', imagen.status())
}

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
