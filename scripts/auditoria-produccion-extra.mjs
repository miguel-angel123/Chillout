/** Comprobaciones de producción: cabeceras, robots, sitemap, 404 y secretos. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

const problemas = []

// 1. Cabeceras de seguridad
const home = await fetch(`${BASE}/`)
const cabeceras = Object.fromEntries(home.headers.entries())
const interesantes = [
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'content-security-policy',
  'strict-transport-security',
]
console.log('── Cabeceras de / ────────────────────────────')
for (const nombre of interesantes) {
  console.log(`  ${nombre.padEnd(30)} ${cabeceras[nombre] ?? '— (falta)'}`)
}

if (!cabeceras['x-content-type-options']) {
  problemas.push('falta x-content-type-options: nosniff')
}
if (!cabeceras['x-frame-options'] && !cabeceras['content-security-policy']) {
  problemas.push('falta protección contra clickjacking (x-frame-options o CSP)')
}
if (!cabeceras['referrer-policy']) {
  problemas.push('falta referrer-policy')
}

// 2. robots.txt y sitemap
console.log('\n── Rastreo ───────────────────────────────────')
for (const ruta of ['/robots.txt', '/sitemap.xml']) {
  const r = await fetch(`${BASE}${ruta}`)
  console.log(`  ${ruta.padEnd(16)} ${r.status}`)
  if (r.status === 404) problemas.push(`${ruta} no existe (404)`)
}

// 3. Página 404
console.log('\n── 404 ───────────────────────────────────────')
const inexistente = await fetch(`${BASE}/esto-no-existe`)
const html404 = await inexistente.text()
console.log(`  /esto-no-existe → ${inexistente.status}`)
if (inexistente.status !== 404) problemas.push(`una ruta inexistente devuelve ${inexistente.status}, no 404`)
if (!/404|no encontr|not found/i.test(html404)) {
  problemas.push('la página 404 no dice claramente que no se encontró')
}

// 4. Fugas de secretos en el HTML
console.log('\n── Secretos en HTML ──────────────────────────')
const rutas = ['/', '/coleccion', '/producto/hoodie-rib', '/checkout']
const patrones = [
  /DATABASE_URL/i,
  /postgres:\/\/[^\s"]+/i,
  /ADMIN_SECRET/i,
  /Chillout#Studio/i,
  /neon\.tech/i,
  /sk-[A-Za-z0-9]{20,}/,
]
let fugas = 0
for (const ruta of rutas) {
  const html = await fetch(`${BASE}${ruta}`).then((r) => r.text())
  for (const patron of patrones) {
    if (patron.test(html)) {
      problemas.push(`posible secreto en ${ruta}: ${patron}`)
      fugas += 1
    }
  }
}
console.log(`  ${fugas === 0 ? 'sin coincidencias' : fugas + ' coincidencia(s)'}`)

// 5. Cabeceras de caché en el HTML (no debe cachearse agresivamente)
console.log('\n── Caché ─────────────────────────────────────')
console.log(`  cache-control de /: ${cabeceras['cache-control'] ?? '—'}`)

// 6. Compresión
console.log('\n── Compresión ────────────────────────────────')
const comprimido = await fetch(`${BASE}/`, { headers: { 'accept-encoding': 'gzip, br' } })
console.log(`  content-encoding: ${comprimido.headers.get('content-encoding') ?? '— (sin comprimir)'}`)

console.log('\n═══ RESULTADO ════════════════════════════════')
if (problemas.length === 0) console.log('Sin problemas.')
else {
  console.log(`${problemas.length} problema(s):`)
  for (const p of problemas) console.log(`  · ${p}`)
}
