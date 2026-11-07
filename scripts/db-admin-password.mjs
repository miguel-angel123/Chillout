/**
 * Fija (o cambia) la contraseña del administrador.
 *
 * La contraseña se toma de ADMIN_PASSWORD en `.env.local` —así sigue visible en
 * texto plano, como pediste— y en la base queda SOLO el hash bcrypt.
 *
 *   node scripts/db-admin-password.mjs
 *   node scripts/db-admin-password.mjs "otra-contraseña"   # sin tocar .env
 */
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

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

const password = (process.argv[2] ?? process.env.ADMIN_PASSWORD ?? '').trim()
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.')
  process.exit(1)
}

const email = (process.env.ADMIN_EMAIL ?? 'admin@chillout.co').trim().toLowerCase()
const hash = await bcrypt.hash(password, 12)
const sql = neon(url)

const filas = await sql`
  INSERT INTO admin_users (email, password_hash, active, failed_attempts, locked_until)
  VALUES (${email}, ${hash}, true, 0, NULL)
  ON CONFLICT (email)
  DO UPDATE SET password_hash = EXCLUDED.password_hash,
                active = true,
                failed_attempts = 0,
                locked_until = NULL
  RETURNING email, left(password_hash, 7) AS prefijo, length(password_hash) AS largo
`

const fila = filas[0]
console.log(`contraseña actualizada para ${fila.email}`)
console.log(`hash guardado: ${fila.prefijo}… (${fila.largo} caracteres, bcrypt)`)

// Las sesiones abiertas dejan de ser válidas al cambiar la contraseña.
const revocadas = await sql`
  UPDATE admin_sessions SET revoked_at = now()
   WHERE revoked_at IS NULL
  RETURNING id
`
console.log(`sesiones revocadas: ${revocadas.length}`)
