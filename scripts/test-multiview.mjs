/**
 * Verifica la regla de las tres vistas:
 *   1. Subir solo la frontal debe rechazarse con 400.
 *   2. Con las tres debe publicarse.
 *
 *   node scripts/test-multiview.mjs [baseUrl]
 */
import { readFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const FRONT = 'public/media/products/quarterzip-stripe-navy-01.jpg'
const BACK = 'public/media/products/hoodie-rib-green-01.jpg'
const SIDE = 'public/media/products/hoodie-rib-black-01.jpg'

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

function buildForm(withBack, withSide) {
  return readFile(FRONT).then((front) => {
    const form = new FormData()
    form.set('file', new Blob([front], { type: 'image/jpeg' }), 'frontal.jpg')
    if (withBack) form.set('fileBack', new Blob([readBack], { type: 'image/jpeg' }), 'trasera.jpg')
    if (withSide) form.set('fileSide', new Blob([readSide], { type: 'image/jpeg' }), 'lateral.jpg')
    form.set('name', 'Prueba Tres Vistas')
    form.set('subtitle', 'Frontal + trasera + lateral')
    form.set('category', 'sueteres')
    form.set('fit', 'regular')
    form.set('colorSlug', 'azul-marino')
    form.set('stock', '2')
    form.set('featured', 'false')
    return form
  })
}

const readBack = await readFile(BACK)
const readSide = await readFile(SIDE)

// ── 1. Negativo: solo frontal ───────────────────────────────
const onlyFront = await buildForm(false, false)
const rejected = await fetch(`${BASE}/api/admin/upload`, {
  method: 'POST',
  headers: { cookie },
  body: onlyFront,
})
const rejectedBody = await rejected.json()
log(`solo frontal → ${rejected.status}: ${rejectedBody.error ?? '(sin mensaje)'}`)
if (rejected.status !== 400) {
  log('FALLO: debió rechazarse con 400')
  process.exitCode = 1
}

// ── 2. Positivo: las tres vistas ────────────────────────────
log('subiendo las tres vistas (puede tardar 40-60 s)…')
const started = Date.now()
const form = await buildForm(true, true)
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
  log(`activo ${label.padEnd(10)} ${String(head.status)} ${asset}`)
  if (head.status !== 200) process.exitCode = 1
}

const pdp = await fetch(`${BASE}${data.url}`)
log('ficha:', pdp.status, data.url)
