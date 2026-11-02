/**
 * Verifica la regla de dos vistas (frontal + trasera).
 *   node scripts/test-multiview.mjs [baseUrl]
 */
import { readFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const FRONT = 'public/media/products/hoodie-rib-black-01.jpg'
const BACK = 'public/media/products/hoodie-rib-black-02.jpg'

const log = (...a) => console.log('[dos-vistas]', ...a)

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

const frontBuf = await readFile(FRONT)
const backBuf = await readFile(BACK)

function form(withBack) {
  const f = new FormData()
  f.set('file', new Blob([frontBuf], { type: 'image/jpeg' }), 'frontal.jpg')
  if (withBack) f.set('fileBack', new Blob([backBuf], { type: 'image/jpeg' }), 'trasera.jpg')
  f.set('name', 'Prueba Dos Vistas')
  f.set('subtitle', 'Frontal + trasera')
  f.set('category', 'hoodies')
  f.set('fit', 'oversize')
  f.set('colorSlug', 'negro')
  f.set('stock', '4')
  f.set('featured', 'false')
  return f
}

// 1. Solo frontal → 400
const onlyFront = await fetch(`${BASE}/api/admin/upload`, { method: 'POST', headers: { cookie }, body: form(false) })
log(`solo frontal → ${onlyFront.status}: ${(await onlyFront.json()).error ?? ''}`)
if (onlyFront.status !== 400) process.exitCode = 1

// 2. Frontal + trasera → 200
log('subiendo frontal + trasera…')
const started = Date.now()
const res = await fetch(`${BASE}/api/admin/upload`, { method: 'POST', headers: { cookie }, body: form(true) })
const data = await res.json()
log('upload:', res.status, `${((Date.now() - started) / 1000).toFixed(1)}s`)
console.log(JSON.stringify(data, null, 2))
if (!res.ok) process.exit(1)

for (const [label, asset] of Object.entries(data.assets ?? {})) {
  const head = await fetch(BASE + asset, { method: 'HEAD' })
  log(`activo ${label.padEnd(11)} ${head.status} ${asset}`)
  if (head.status !== 200) process.exitCode = 1
}

const pdp = await fetch(`${BASE}${data.url}`)
log('ficha:', pdp.status)
