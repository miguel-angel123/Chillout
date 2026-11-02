/** Sube la pareja real frontal/trasera del 2 de noviembre y construye el 3D. */
import { readFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const FRONT = 'Chillout_imagenes/WhatsApp Image 2026-11-02 at 1.21.06 PM.jpeg'
const BACK = 'Chillout_imagenes/WhatsApp Image 2026-11-02 at 1.21.06 PM (1).jpeg'

const log = (...a) => console.log('[real]', ...a)

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

const form = new FormData()
form.set('file', new Blob([await readFile(FRONT)], { type: 'image/jpeg' }), 'frontal.jpg')
form.set('fileBack', new Blob([await readFile(BACK)], { type: 'image/jpeg' }), 'trasera.jpg')
form.set('name', 'Hoodie Acanalado Carbón')
form.set('subtitle', 'Capota alta · Punto acanalado')
form.set('category', 'hoodies')
form.set('fit', 'oversize')
form.set('colorSlug', 'negro')
form.set('stock', '5')
form.set('featured', 'false')

log('subiendo pareja real…')
const started = Date.now()
const res = await fetch(`${BASE}/api/admin/upload`, { method: 'POST', headers: { cookie }, body: form })
const data = await res.json()
log('upload:', res.status, `${((Date.now() - started) / 1000).toFixed(1)}s`)
console.log(JSON.stringify(data, null, 2))
if (res.ok) log('ficha:', `${BASE}${data.url}`)
