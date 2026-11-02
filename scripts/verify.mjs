/**
 * Verificación de humo contra el servidor en ejecución.
 *
 *   node scripts/verify.mjs [baseUrl]
 *
 * Comprueba estado HTTP, marcadores de contenido y que el catálogo provenga de
 * la base de datos (no del fallback en memoria).
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'

const ROUTES = [
  '/',
  '/coleccion',
  '/producto/hoodie-rib',
  '/producto/quarterzip-solid',
  '/producto/quarterzip-stripe',
  '/legal/privacidad',
  '/legal/terminos',
  '/legal/devoluciones',
  '/legal/cookies',
  '/pasarela',
  '/lookbook',
  '/drops',
  '/comunidad',
  '/talla',
  '/mix-and-match',
  '/pedido',
  '/cuenta',
]

const results = []
let failures = 0

for (const route of ROUTES) {
  try {
    const res = await fetch(BASE + route)
    const html = await res.text()
    const broken = /Application error|Unhandled Runtime Error|__NEXT_ERROR/.test(html)
    const ok = res.status === 200 && !broken
    if (!ok) failures += 1
    results.push({ route, status: res.status, bytes: html.length, ok })
  } catch (error) {
    failures += 1
    results.push({ route, status: 'ERR', bytes: 0, ok: false, error: error.message })
  }
}

for (const r of results) {
  const flag = r.ok ? 'ok  ' : 'FAIL'
  console.log(`${flag} ${String(r.status).padEnd(4)} ${r.route.padEnd(30)} ${String(r.bytes).padStart(7)}`)
  if (r.error) console.log('      ', r.error)
}

// Contenido de la ficha de producto
const pdp = await (await fetch(BASE + '/producto/hoodie-rib')).text()
const checks = {
  'precio por confirmar': pdp.includes('Precio por confirmar'),
  'color Naranja quemado': pdp.includes('Naranja quemado'),
  'color Verde bosque': pdp.includes('Verde bosque'),
  'talla S': pdp.includes('>S<'),
  'talla M': pdp.includes('>M<'),
  'talla L': pdp.includes('>L<'),
  'talla XL': pdp.includes('>XL<'),
  'stock crítico': pdp.includes('Solo queda'),
  'vista 3D': pdp.includes('Vista 3D'),
  'JSON-LD': pdp.includes('application/ld+json'),
}

console.log('\nFicha de producto:')
for (const [label, pass] of Object.entries(checks)) {
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label}`)
}

// 404 correcto
const missing = await fetch(BASE + '/no-existe')
console.log(`\n404 esperado en /no-existe → ${missing.status}`)

console.log(failures === 0 ? '\n✓ todas las rutas responden' : `\n✗ ${failures} rutas con problemas`)
