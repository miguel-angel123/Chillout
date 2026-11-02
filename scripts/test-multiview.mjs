/**
 * Prueba del pipeline multivista: sube frontal + trasera y verifica que el
 * revés del 3D use la foto trasera real.
 *
 *   node scripts/test-multiview.mjs [baseUrl]
 */
import { readFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const FRONT = 'public/media/products/quarterzip-stripe-navy-01.jpg'
const BACK = 'public/media/products/hoodie-rib-green-01.jpg'

const log = (...a) => console.log('[multiview]', ...a)

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
if (!login.ok) {
  log('login falló', login.status)
  process.exit(1)
}
const cookie = (login.headers.getSetCookie?.()[0] ?? '').split(';')[0]
log('login ok')

const form = new FormData()
form.set('file', new Blob([await readFile(FRONT)], { type: 'image/jpeg' }), 'frontal.jpg')
form.set('fileBack', new Blob([await readFile(BACK)], { type: 'image/jpeg' }), 'trasera.jpg')
form.set('name', 'Prueba Multivista')
form.set('subtitle', 'Frontal + trasera')
form.set('category', 'sueteres')
form.set('fit', 'regular')
form.set('colorSlug', 'azul-marino')
form.set('stock', '2')
form.set('featured', 'false')

log('subiendo (dos vistas, puede tardar 30-40 s)…')
const started = Date.now()
const res = await fetch(`${BASE}/api/admin/upload`, { method: 'POST', headers: { cookie }, body: form })
const data = await res.json()
log('upload:', res.status, `${((Date.now() - started) / 1000).toFixed(1)}s`)
console.log(JSON.stringify(data, null, 2))

if (!res.ok) process.exit(1)

for (const [label, asset] of Object.entries(data.assets ?? {})) {
  if (!asset) {
    log(`activo ${label}: (no generado)`)
    continue
  }
  const head = await fetch(BASE + asset, { method: 'HEAD' })
  log(`activo ${label.padEnd(10)} ${asset.padEnd(52)} ${head.status}`)
  if (head.status !== 200) process.exitCode = 1
}

log('ficha:', data.url)
