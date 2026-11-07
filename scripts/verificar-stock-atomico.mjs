/** Verifica /api/health y la reserva atómica de stock. */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

// 1. Salud
const salud = await fetch(`${BASE}/api/health`)
console.log('health:', salud.status, JSON.stringify(await salud.json()))

// 2. Stock actual de hoodie-rib talla S
const antes = await sql`
  SELECT v.id, v.stock, c.slug AS color, s.label AS talla
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    JOIN colors c ON c.id = v.color_id
    JOIN sizes s ON s.id = v.size_id
   WHERE p.slug = 'hoodie-rib' AND s.slug = 's' AND c.slug = 'naranja-quemado'
`
const variante = antes[0]
console.log(`stock inicial: ${variante.stock} (${variante.color}/${variante.talla})`)

// 3. Pedir MÁS de lo que hay: debe rechazar sin tocar el stock
const exceso = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    items: [{ slug: 'hoodie-rib', colorSlug: 'naranja-quemado', size: 'S', qty: variante.stock + 5 }],
    customer: { name: 'Prueba Exceso', phone: '3000000000' },
  }),
})
console.log('pedido con exceso:', exceso.status, JSON.stringify(await exceso.json()).slice(0, 120))

const tras = await sql`SELECT stock FROM product_variants WHERE id = ${variante.id}`
console.log('stock tras el rechazo:', tras[0].stock, '(debe ser igual)')

// 4. Pedido válido de 1 unidad
const valido = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    items: [{ slug: 'hoodie-rib', colorSlug: 'naranja-quemado', size: 'S', qty: 1 }],
    customer: { name: 'Prueba Stock', phone: '3000000000' },
  }),
})
const datos = await valido.json()
console.log('pedido válido:', valido.status, datos.code ?? datos.error)

const final = await sql`SELECT stock FROM product_variants WHERE id = ${variante.id}`
console.log('stock tras el pedido:', final[0].stock, `(esperado ${variante.stock - 1})`)

// 5. Limpieza: anular el pedido de prueba y devolver stock
if (datos.token) {
  const { execSync } = await import('node:child_process')
  try {
    execSync(`node scripts/borrar-pedido.mjs ${datos.token}`, { stdio: 'inherit' })
  } catch {
    console.log('no se pudo anular automáticamente')
  }
  const restaurado = await sql`SELECT stock FROM product_variants WHERE id = ${variante.id}`
  console.log('stock restaurado:', restaurado[0].stock)
}
