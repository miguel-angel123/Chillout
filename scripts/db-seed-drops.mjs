/**
 * Siembra el drop inicial en la base (solo si la tabla está vacía).
 *
 *   node scripts/db-seed-drops.mjs
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const existentes = await sql`SELECT count(*)::int AS total FROM drops`
if ((existentes[0]?.total ?? 0) > 0) {
  console.log(`[drops] ya hay ${existentes[0].total} drops; no se toca nada`)
  process.exit(0)
}

await sql`
  INSERT INTO drops (slug, eyebrow, title, description, image_url, launch_at, unidades_por_referencia, product_slugs, active)
  VALUES (
    'carbon-nocturno',
    'Drop 01',
    'Carbón nocturno',
    'Cinco piezas en punto acanalado teñidas en carbón profundo. Serie corta, sin reposición: cuando se agota, se cierra.',
    '/media/products/hoodie-acanalado-carbon.jpg',
    '2026-11-21T10:00:00-05:00'::timestamptz,
    6,
    ARRAY['hoodie-acanalado-carbon','quarterzip-stripe']::text[],
    true
  )
`

console.log('[drops] semilla insertada: carbón nocturno')
