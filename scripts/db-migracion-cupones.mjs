/**
 * Migración: cupones de descuento.
 *
 * Idempotente. Crea la tabla `coupons` y añade a `orders` el descuento y el
 * código aplicado, para que el pedido guarde lo que de verdad se cobró.
 *
 *   node scripts/db-migracion-cupones.mjs
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
const log = (...a) => console.log('[cupones]', ...a)

await sql`
  CREATE TABLE IF NOT EXISTS coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    kind text NOT NULL DEFAULT 'percent',
    value integer NOT NULL,
    min_subtotal_cop integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    usage_limit integer,
    used_count integer NOT NULL DEFAULT 0,
    valid_from text,
    valid_until text,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`
log('tabla coupons lista')

await sql`CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons (code)`
await sql`CREATE INDEX IF NOT EXISTS coupons_active_idx ON coupons (active)`
log('índices listos')

await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cop integer NOT NULL DEFAULT 0`
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text`
log('columnas de descuento en orders')

const verificacion = await sql`
  SELECT column_name, data_type
    FROM information_schema.columns
   WHERE table_name = 'orders'
     AND column_name IN ('discount_cop', 'coupon_code')
   ORDER BY column_name
`
log('verificado:', verificacion.map((c) => c.column_name).join(', '))

const cupones = await sql`SELECT count(*)::int AS total FROM coupons`
log('cupones existentes:', cupones[0]?.total ?? 0)
