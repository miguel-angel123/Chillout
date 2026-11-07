/**
 * Auditoría de producción: recorre el sitio, busca errores reales y los reporta.
 *
 *   node scripts/auditoria-produccion.mjs http://127.0.0.1:3100
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const PUBLICAS = [
  '/',
  '/coleccion',
  '/coleccion?view=tienda',
  '/coleccion?tag=hoodies',
  '/producto/hoodie-rib',
  '/producto/quarterzip-solid',
  '/producto/quarterzip-stripe',
  '/lookbook',
  '/pasarela',
  '/drops',
  '/talla',
  '/checkout',
  '/comunidad',
  '/cuenta',
  '/pedido',
  '/legal/terminos',
  '/legal/privacidad',
]

const ADMIN = [
  '/admin',
  '/admin/productos',
  '/admin/productos/nuevo',
  '/admin/productos/hoodie-rib',
  '/admin/pedidos',
  '/admin/cupones',
  '/admin/drops',
  '/admin/conjuntos',
]

const problemas = []
const anotar = (tipo, detalle) => problemas.push(`[${tipo}] ${detalle}`)

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1512, height: 1000 } })
const page = await context.newPage()

// Acumuladores por navegación
let erroresConsola = []
let peticionesFallidas = []

page.on('console', (msg) => {
  if (msg.type() === 'error') erroresConsola.push(msg.text().slice(0, 220))
})
page.on('pageerror', (error) => erroresConsola.push(`excepción: ${error.message.slice(0, 220)}`))
page.on('requestfailed', (request) => {
  const url = request.url()
  // Las precargas de Next (_rsc) se abortan al navegar: no son fallos.
  if (url.includes('_rsc=')) return
  if (request.failure()?.errorText === 'net::ERR_ABORTED') return
  peticionesFallidas.push(`${request.failure()?.errorText ?? 'fallo'} ${url}`)
})
page.on('response', (response) => {
  if (response.status() >= 400) {
    peticionesFallidas.push(`${response.status()} ${response.url()}`)
  }
})

function limpiar() {
  erroresConsola = []
  peticionesFallidas = []
}

async function revisar(ruta, etiqueta) {
  limpiar()
  let estado = 0
  try {
    const respuesta = await page.goto(`${BASE}${ruta}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    estado = respuesta?.status() ?? 0
    await page.waitForTimeout(900)
  } catch (error) {
    anotar('NAVEGACIÓN', `${etiqueta} ${ruta} no cargó: ${error.message.slice(0, 120)}`)
    return
  }

  if (estado >= 400) anotar('HTTP', `${etiqueta} ${ruta} → ${estado}`)

  const datos = await page.evaluate(() => ({
    titulo: document.title,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    sinImagenes: [...document.images]
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src)
      .slice(0, 3),
    enlaces: [...document.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href'))
      .filter((href) => href && href.startsWith('/') && !href.startsWith('//')),
    desborde: document.documentElement.scrollWidth - window.innerWidth,
  }))

  if (!datos.titulo) anotar('SEO', `${ruta} sin <title>`)
  if (datos.sinImagenes.length > 0) {
    anotar('IMAGEN', `${ruta} imágenes que no cargan: ${datos.sinImagenes.join(', ')}`)
  }
  if (erroresConsola.length > 0) {
    anotar('CONSOLA', `${ruta} → ${erroresConsola.slice(0, 2).join(' | ')}`)
  }
  if (peticionesFallidas.length > 0) {
    anotar('PETICIÓN', `${ruta} → ${peticionesFallidas.slice(0, 3).join(' | ')}`)
  }

  return datos
}

console.log('── Rutas públicas ─────────────────────────────')
const enlacesInternos = new Set()
for (const ruta of PUBLICAS) {
  const datos = await revisar(ruta, 'pública')
  if (datos) {
    for (const href of datos.enlaces) enlacesInternos.add(href.split('#')[0])
    console.log(`  ${ruta.padEnd(42)} ${datos.h1 ? 'h1 ✓' : 'h1 ✗'}`)
  }
}

// ── Enlaces internos ────────────────────────────────────
console.log('\n── Enlaces internos (' + enlacesInternos.size + ') ───────────────')
for (const href of [...enlacesInternos].sort()) {
  if (!href || href === '/') continue
  const respuesta = await context.request.get(`${BASE}${href}`)
  if (respuesta.status() >= 400) {
    anotar('ENLACE ROTO', `${href} → ${respuesta.status()}`)
  }
}
console.log('  revisados')

// ── Admin ───────────────────────────────────────────────
console.log('\n── Panel (con sesión) ─────────────────────────')
const login = await page.request.post(`${BASE}/api/admin/login`, { data: { password: PASSWORD } })
const cookies = login
  .headersArray()
  .filter((h) => h.name.toLowerCase() === 'set-cookie')
  .map((h) => {
    const [par] = h.value.split(';')
    const i = par.indexOf('=')
    return { name: par.slice(0, i), value: par.slice(i + 1), url: BASE }
  })
await context.addCookies(cookies)

for (const ruta of ADMIN) {
  await revisar(ruta, 'admin')
  console.log(`  ${ruta.padEnd(42)} ✓`)
}

// Admin sin sesión debe redirigir al login
const anonimo = await browser.newContext()
const paginaAnonima = await anonimo.newPage()
const respuestaAdmin = await paginaAnonima.goto(`${BASE}/admin/productos`, {
  waitUntil: 'domcontentloaded',
})
const urlFinal = paginaAnonima.url()
if (!urlFinal.includes('/admin/login')) {
  anotar('SEGURIDAD', `/admin/productos sin sesión no redirige al login (quedó en ${urlFinal})`)
}
console.log(`  /admin/productos sin sesión → ${respuestaAdmin?.status()} ${urlFinal}`)
await anonimo.close()

// ── Flujo de compra ─────────────────────────────────────
console.log('\n── Flujo de compra ────────────────────────────')
limpiar()
await page.goto(`${BASE}/producto/hoodie-rib`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1600)

const tallaBoton = page.locator('button[aria-pressed]', { hasText: /^S$/ }).first()
if (await tallaBoton.count()) await tallaBoton.click()
else anotar('COMPRA', 'no encuentro el selector de talla S')

// Ojo: «Añadir una unidad» es el contador; el que compra es «Añadir al carrito».
const añadir = page.getByRole('button', { name: /añadir al carrito/i }).first()
if (await añadir.count()) {
  await añadir.click()
  await page.waitForTimeout(1400)
} else {
  anotar('COMPRA', 'no encuentro el botón de añadir al carrito')
}

const carrito = await page.evaluate(() => {
  const crudo = localStorage.getItem('chillout-cart')
  const items = crudo ? (JSON.parse(crudo)?.state?.items ?? []) : []
  return items.map((i) => `${i.slug}/${i.size}×${i.qty}`)
})
console.log(`  carrito: ${carrito.length > 0 ? carrito.join(', ') : 'VACÍO'}`)
if (carrito.length === 0) anotar('COMPRA', 'añadir al carrito no dejó nada guardado')

await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1400)
const checkout = await page.evaluate(() => ({
  vacio: document.body.innerText.includes('No hay nada que pagar'),
  cupon: Boolean(document.querySelector('input[aria-label="Código de cupón"]')),
}))
console.log(`  checkout: ${checkout.vacio ? 'dice VACÍO (mal)' : 'con artículos'} · cupón ${checkout.cupon ? '✓' : '✗'}`)
if (checkout.vacio && carrito.length > 0) anotar('COMPRA', 'el checkout cree que el carrito está vacío')
if (!checkout.cupon) anotar('COMPRA', 'el checkout no muestra el campo de cupón')

// ── Móvil ───────────────────────────────────────────────
console.log('\n── Móvil (390×844) ───────────────────────────')
const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
const paginaMovil = await movil.newPage()
for (const ruta of ['/', '/coleccion', '/producto/hoodie-rib', '/lookbook', '/drops', '/talla', '/checkout']) {
  await paginaMovil.goto(`${BASE}${ruta}`, { waitUntil: 'domcontentloaded' })
  await paginaMovil.waitForTimeout(800)
  const desborde = await paginaMovil.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  if (desborde > 2) anotar('MÓVIL', `${ruta} desborda ${desborde}px en horizontal`)
  console.log(`  ${ruta.padEnd(28)} desborde ${desborde}px`)
}
await movil.close()

await browser.close()

// ── Informe ─────────────────────────────────────────────
console.log('\n═══ RESULTADO ═══════════════════════════════')
if (problemas.length === 0) {
  console.log('Sin problemas detectados.')
} else {
  console.log(`${problemas.length} problema(s):\n`)
  for (const problema of problemas) console.log(`  · ${problema}`)
}
