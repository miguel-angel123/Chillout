/**
 * Borra un producto por slug (y en cascada sus variantes, medios y modelo 3D).
 *
 *   node scripts/borrar-producto.mjs prueba-panel-temp
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')

const slug = process.argv[2]
if (!slug) {
  console.error('Uso: node scripts/borrar-producto.mjs <slug>')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const borrados = await sql`DELETE FROM products WHERE slug = ${slug} RETURNING id`

console.log(borrados.length ? `borrado: ${slug}` : `no existía: ${slug}`)
