/** Prueba el alta con varios colores y stock distinto por talla. */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')

const { readFile } = await import('node:fs/promises')
const imagen = await readFile('Chillout_imagenes/WhatsApp Image 2026-11-02 at 1.21.06 PM.jpeg')

const cuerpo = new FormData()
cuerpo.set('name', 'Prueba Multicolor')
cuerpo.set('subtitle', 'Dos colores · stock por talla')
cuerpo.set('category', 'sueteres')
cuerpo.set('fit', 'regular')
cuerpo.set('fabric', 'Prueba')
cuerpo.set('priceCop', '250000')
cuerpo.set('stock', '0')
cuerpo.set('stocks', JSON.stringify({ s: 2, m: 0, l: 4, xl: 0 }))
cuerpo.set('colorSlugs', JSON.stringify(['naranja-quemado', 'negro']))
cuerpo.set('colorSlug', 'naranja-quemado')
cuerpo.set('tags', 'Prueba')
cuerpo.set('featured', 'false')
cuerpo.set('imagenes', new Blob([imagen], { type: 'image/jpeg' }), 'frontal.jpg')

const respuesta = await fetch(`${BASE}/api/admin/productos`, {
  method: 'POST',
  body: cuerpo,
  headers: { cookie },
})
const datos = await respuesta.json()
console.log('crear:', respuesta.status, JSON.stringify(datos))

const filas = await sql`
  SELECT c.slug AS color, s.label AS talla, v.stock, v.price_cop
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    JOIN colors c ON c.id = v.color_id
    JOIN sizes s ON s.id = v.size_id
   WHERE p.slug = 'prueba-multicolor'
   ORDER BY c.slug, s.sort_order
`
console.log('variantes creadas:', filas.length)
for (const fila of filas) {
  console.log(`  ${fila.color.padEnd(16)} ${fila.talla.padEnd(3)} stock=${fila.stock} precio=${fila.price_cop ?? 'NULL'}`)
}

// Limpieza
if (datos.ok) {
  const borrado = await fetch(`${BASE}/api/admin/productos/prueba-multicolor`, {
    method: 'DELETE',
    headers: { cookie },
  })
  console.log('borrar:', borrado.status)
  const { rm } = await import('node:fs/promises')
  await rm('public/media/products/prueba-multicolor-01.jpg', { force: true })
}
