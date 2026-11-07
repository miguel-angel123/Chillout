/**
 * Deja el acceso del panel limpio: desbloquea la cuenta y borra los intentos.
 *
 *   node scripts/limpiar-intentos.mjs
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

await sql`UPDATE admin_users SET locked_until = NULL, failed_attempts = 0`
const borrados = await sql`DELETE FROM login_attempts RETURNING id`

console.log(`cuenta desbloqueada · intentos borrados: ${borrados.length}`)
