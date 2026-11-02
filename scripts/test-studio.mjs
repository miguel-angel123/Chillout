/**
 * Prueba de extremo a extremo del 3D Studio.
 *
 *   1. Inicia sesión en /api/admin/login y guarda la cookie.
 *   2. Sube una fotografía a /api/admin/upload.
 *   3. Comprueba que la prenda quedó publicada y accesible.
 *
 *   node scripts/test-studio.mjs [baseUrl]
 */
import { readFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const SOURCE = 'public/media/products/quarterzip-stripe-navy-01.jpg'

const log = (...a) => console.log('[studio]', ...a)

// ── 1. Login ────────────────────────────────────────────────
const loginRes = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})

log('login:', loginRes.status)
if (!loginRes.ok) {
  log('falló el login:', await loginRes.text())
  process.exit(1)
}

const setCookie = loginRes.headers.getSetCookie?.() ?? []
const cookie = (setCookie[0] ?? '').split(';')[0]
log('cookie:', cookie.slice(0, 40) + '…')
if (!cookie.startsWith('chillout_admin=')) {
  log('no se recibió la cookie de sesión')
  process.exit(1)
}

// ── 2. Subida ───────────────────────────────────────────────
const buffer = await readFile(SOURCE)
const form = new FormData()
form.set('file', new Blob([buffer], { type: 'image/jpeg' }), 'prenda.jpg')
form.set('name', 'Suéter Prueba Studio')
form.set('subtitle', 'Subida automática · 3D')
form.set('category', 'sueteres')
form.set('fit', 'regular')
form.set('colorSlug', 'azul-marino')
form.set('stock', '3')
form.set('featured', 'true')

log('subiendo y procesando (puede tardar 20–30 s la primera vez)…')
const started = Date.now()
const uploadRes = await fetch(`${BASE}/api/admin/upload`, {
  method: 'POST',
  headers: { cookie },
  body: form,
})
const elapsed = ((Date.now() - started) / 1000).toFixed(1)
const data = await uploadRes.json()

log('upload:', uploadRes.status, `(${elapsed}s)`)
console.log(JSON.stringify(data, null, 2))

if (!uploadRes.ok || !data.ok) process.exit(1)

// ── 3. Verificación ─────────────────────────────────────────
for (const asset of [data.assets.photo, data.assets.cutout, data.assets.depth]) {
  const res = await fetch(BASE + asset, { method: 'HEAD' })
  log(`activo ${asset.padEnd(48)} ${res.status}`)
  if (res.status !== 200) process.exitCode = 1
}

const pdp = await fetch(`${BASE}${data.url}`)
const html = await pdp.text()
log(`ficha ${data.url} → ${pdp.status}, contiene el nombre: ${html.includes('Suéter Prueba Studio')}`)

const home = await fetch(`${BASE}/`)
const homeHtml = await home.text()
log(`home contiene la prenda: ${homeHtml.includes('Suéter Prueba Studio')}`)

log('listo')
