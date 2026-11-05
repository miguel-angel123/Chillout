/**
 * Migración: drops.
 *
 * Idempotente. Crea la tabla `drops`, que guarda la programación de cada
 * cápsula: fecha de apertura, piezas y unidades por referencia.
 *
 *   node scripts/db-migracion-drops.mjs
 */
import { neon } from '@neondatabase/serverless'

for (const archivo of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(archivo)
    break
  } catch {
    /* sin archivo de entorno */
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL (.env.local)')
  process.exit(1)
}

const sql = neon(url)
const log = (...a) => console.log('[drops]', ...a)

await sql`
  CREATE TABLE IF NOT EXISTS drops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    eyebrow text NOT NULL DEFAULT 'Drop',
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    image_url text,
    launch_at timestamptz NOT NULL,
    unidades_por_referencia integer NOT NULL DEFAULT 6,
    product_slugs text[] NOT NULL DEFAULT '{}',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`
log('tabla drops lista')

await sql`CREATE UNIQUE INDEX IF NOT EXISTS drops_slug_key ON drops (slug)`
await sql`CREATE INDEX IF NOT EXISTS drops_launch_idx ON drops (launch_at)`
log('índices listos')

const total = await sql`SELECT count(*)::int AS total FROM drops`
log('drops existentes:', total[0]?.total ?? 0)
