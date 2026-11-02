/**
 * Borra los productos de prueba creados por scripts/test-studio.mjs.
 *   node scripts/reset-test-products.mjs
 */
import { neon } from '@neondatabase/serverless'

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
    break
  } catch {
    /* sin archivo */
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}

const sql = neon(url)
const pattern = process.argv[2] ?? 'sueter-prueba-studio%'

const removed = await sql`DELETE FROM products WHERE slug LIKE ${pattern} RETURNING slug`
console.log(`borrados ${removed.length}:`, removed.map((r) => r.slug).join(', ') || '(ninguno)')

const [left] = await sql`SELECT count(*)::int AS n FROM products`
console.log('productos restantes:', left.n)
