/**
 * Quita el precio anterior (descuento) de un producto.
 *
 *   node scripts/quitar-descuento.mjs quarterzip-stripe
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const slug = process.argv[2]
if (!slug) {
  console.error('Uso: node scripts/quitar-descuento.mjs <slug>')
  process.exit(1)
}

const filas = await sql`
  UPDATE products SET compare_at_cop = NULL WHERE slug = ${slug}
  RETURNING slug, price_cop, compare_at_cop
`

console.log(filas.length ? `sin descuento: ${JSON.stringify(filas[0])}` : `no existe: ${slug}`)
