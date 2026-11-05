/**
 * Migración: conjuntos.
 *
 * Idempotente. Crea la tabla `sets` y siembra los dos conjuntos iniciales si
 * la tabla está vacía.
 *
 *   node scripts/db-migracion-conjuntos.mjs
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
const log = (...a) => console.log('[conjuntos]', ...a)

await sql`
  CREATE TABLE IF NOT EXISTS sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    eyebrow text NOT NULL DEFAULT 'Conjunto',
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    product_slugs text[] NOT NULL DEFAULT '{}',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`
log('tabla sets lista')
await sql`CREATE UNIQUE INDEX IF NOT EXISTS sets_slug_key ON sets (slug)`
log('índices listos')

const total = await sql`SELECT count(*)::int AS total FROM sets`
if ((total[0]?.total ?? 0) === 0) {
  await sql`
    INSERT INTO sets (slug, eyebrow, title, description, product_slugs, active)
    VALUES
      ('noche-en-la-azotea', 'Conjunto 01', 'Noche en la azotea',
       'Hoodie acanalado de capota alta con el suéter de franjas al hombro. Capas que abrigan sin sumar volumen.',
       ARRAY['hoodie-rib','quarterzip-stripe']::text[], true),
      ('oficina-sin-corbata', 'Conjunto 02', 'Oficina sin corbata',
       'Cuello polo liso y franjas tejidas. Dos cuellos altos, dos formas de llevarlo según el día.',
       ARRAY['quarterzip-solid','quarterzip-stripe']::text[], true)
  `
  log('semilla insertada: 2 conjuntos')
} else {
  log('ya hay', total[0].total, 'conjuntos; no se toca nada')
}
