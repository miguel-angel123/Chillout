import { neon } from '@neondatabase/serverless'
import { PGlite } from '@electric-sql/pglite'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * Modo Cero: la misma capa de datos funciona con o sin credenciales.
 *
 * · DATABASE_URL presente  → Neon (Postgres gestionado, plan Free)
 * · DATABASE_URL ausente   → PGlite (Postgres en WASM, persistido en .data/)
 *
 * Ambos hablan el mismo dialecto y comparten el esquema Drizzle.
 */
export type Database = PgliteDatabase<typeof schema>

let cached: Database | null = null

export function isNeon(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export function getDb(): Database {
  if (cached) return cached

  const url = process.env.DATABASE_URL

  if (url) {
    const client = neon(url)
    cached = drizzleNeon(client, { schema }) as unknown as Database
  } else {
    const dataDir = process.env.PGLITE_DIR ?? '.data/chillout'
    const client = new PGlite(dataDir)
    cached = drizzlePglite(client, { schema })
  }

  return cached
}

export { schema }
