/**
 * Migración: acceso del panel (usuarios con bcrypt, sesiones y intentos).
 *
 * Idempotente.
 *
 *   node scripts/db-migracion-acceso.mjs
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
const log = (...a) => console.log('[acceso]', ...a)

await sql`
  CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    password_hash text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    failed_attempts integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`
await sql`CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_key ON admin_users (email)`
log('tabla admin_users lista')

await sql`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    ip text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`
await sql`CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_key ON admin_sessions (token_hash)`
await sql`CREATE INDEX IF NOT EXISTS admin_sessions_user_idx ON admin_sessions (user_id)`
log('tabla admin_sessions lista')

await sql`
  CREATE TABLE IF NOT EXISTS login_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip text NOT NULL,
    email text,
    success boolean NOT NULL DEFAULT false,
    attempted_at timestamptz NOT NULL DEFAULT now()
  )
`
await sql`CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip, attempted_at)`
log('tabla login_attempts lista')

const verificacion = await sql`
  SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('admin_users','admin_sessions','login_attempts')
   ORDER BY table_name
`
log('verificado:', verificacion.map((f) => f.table_name).join(', '))
