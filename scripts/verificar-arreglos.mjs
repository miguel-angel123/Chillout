/** Verifica los arreglos: cantidad en ficha, escasez, colores, stocks y precio. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
const errores = []
page.on('pageerror', (e) => errores.push(e.message.slice(0, 140)))

// ── 1. Cantidad en la ficha ──────────────────────────────
await page.goto(`${BASE}/producto/hoodie-rib`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)

await page.locator('button[aria-pressed]', { hasText: /^S$/ }).first().click()
await page.waitForTimeout(300)

// Subir la cantidad dos veces
const mas = page.getByRole('button', { name: /añadir una unidad/i }).first()
await mas.click()
await mas.click()
await page.waitForTimeout(300)

const cantidadVisible = await page.evaluate(() => {
  const zona = document.querySelector('[aria-live="polite"]')
  return zona ? zona.textContent?.trim() : null
})
console.log('cantidad en ficha:', cantidadVisible, '(esperado 3)')

await page.getByRole('button', { name: /añadir al carrito/i }).first().click()
await page.waitForTimeout(1200)

const carrito = await page.evaluate(() => {
  const crudo = localStorage.getItem('chillout-cart')
  const items = crudo ? (JSON.parse(crudo)?.state?.items ?? []) : []
  return items.map((i) => `${i.slug}/${i.size}×${i.qty}`)
})
console.log('carrito            :', carrito.join(', ') || 'VACÍO')

// ── 2. Aviso de escasez por talla ────────────────────────
const aviso = await page.evaluate(() => {
  const textos = [...document.querySelectorAll('p')].map((p) => p.textContent?.trim() ?? '')
  return textos.filter((t) => /quedan? \d+ unidades?|queda 1 unidad/i.test(t))
})
console.log('aviso escasez      :', aviso[0] ?? '(ninguno)')

// ── 3. Precio pendiente bloquea la compra ────────────────
await page.goto(`${BASE}/producto/hoodie-acanalado-carbon`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)
const sinPrecio = await page.evaluate(() => {
  const boton = [...document.querySelectorAll('button')].find((b) =>
    /precio por confirmar/i.test(b.textContent ?? ''),
  )
  const wsp = [...document.querySelectorAll('a')].find((a) =>
    /preguntar el precio/i.test(a.textContent ?? ''),
  )
  return { botonDeshabilitado: boton?.disabled ?? null, tieneWhatsapp: Boolean(wsp) }
})
console.log('sin precio         :', JSON.stringify(sinPrecio))

// La API debe rechazar el pedido
const rechazo = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    items: [{ slug: 'hoodie-acanalado-carbon', colorSlug: 'negro', size: 'S', qty: 1 }],
    customer: { name: 'Prueba Precio', phone: '3000000000' },
  }),
})
console.log('API sin precio     :', rechazo.status, JSON.stringify(await rechazo.json()))

// ── 4. Panel: colores y stocks ───────────────────────────
const login = await page.request.post(`${BASE}/api/admin/login`, { data: { password: PASSWORD } })
await page.context().addCookies(
  login
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => {
      const [par] = h.value.split(';')
      const i = par.indexOf('=')
      return { name: par.slice(0, i), value: par.slice(i + 1), url: BASE }
    }),
)

await page.goto(`${BASE}/admin/productos/nuevo`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const panel = await page.evaluate(() => {
  const texto = document.body.innerText
  return {
    coloresChecklist: texto.includes('Colores disponibles'),
    marcas: document.querySelectorAll('button[aria-pressed]').length,
    stockPorTalla: document.querySelectorAll('input[type="number"][max="999"]').length,
    textosTalla: /TALLA|S\b/.test(texto),
  }
})
console.log('panel alta         :', JSON.stringify(panel))

// ── 5. 3D Studio retirado ────────────────────────────────
const respuestaStudio = await page.request.get(`${BASE}/admin/3d-studio`, { maxRedirects: 0 })
console.log('3D Studio          :', respuestaStudio.status, respuestaStudio.headers()['location'] ?? '')

const nav = await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
const sinStudio = await page.evaluate(() => !document.body.innerText.includes('3D Studio'))
console.log('nav sin 3D Studio  :', sinStudio)

// ── 6. Miniaturas en drops ───────────────────────────────
await page.goto(`${BASE}/admin/drops`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const miniaturas = await page.evaluate(() => document.querySelectorAll('li img').length)
console.log('miniaturas en drops:', miniaturas)
await page.screenshot({ path: 'docs/screenshots/admin-drops-piezas.png' })

await page.goto(`${BASE}/admin/productos/nuevo`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await page.screenshot({ path: 'docs/screenshots/admin-alta-colores.png' })

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
