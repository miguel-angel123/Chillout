/**
 * Fija el precio de un producto y de todas sus variantes.
 *
 *   node scripts/fijar-precio.mjs hoodie-rib 329000
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')

const slug = process.argv[2]
const precio = Number.parseInt(process.argv[3] ?? '', 10)

if (!slug || !Number.isFinite(precio) || precio <= 0) {
  console.error('Uso: node scripts/fijar-precio.mjs <slug> <precioCop>')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const productos = await sql`
  UPDATE products SET price_cop = ${precio} WHERE slug = ${slug} RETURNING id
`

if (productos.length === 0) {
  console.error(`No existe el producto ${slug}`)
  process.exit(1)
}

const variantes = await sql`
  UPDATE product_variants
     SET price_cop = ${precio}
   WHERE product_id = ${productos[0].id}
  RETURNING id
`

console.log(`precio ${precio} aplicado a ${slug} (${variantes.length} variantes)`)
