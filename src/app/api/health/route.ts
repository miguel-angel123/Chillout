import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Estado del servicio, para el despliegue.
 *
 * Devuelve 200 si la web responde y la base contesta, 503 si algo falla. No
 * expone datos internos: solo nombres de comprobación y latencia.
 */
export async function GET() {
  const inicio = Date.now()
  const comprobaciones: Record<string, { ok: boolean; ms?: number; detalle?: string }> = {}

  try {
    const db = getDb()
    const t0 = Date.now()
    await db.execute(sql`select 1`)
    comprobaciones.baseDeDatos = { ok: true, ms: Date.now() - t0 }
  } catch (error) {
    comprobaciones.baseDeDatos = { ok: false, detalle: (error as Error).message.slice(0, 120) }
  }

  comprobaciones.entorno = {
    ok: Boolean(process.env.DATABASE_URL),
    detalle: process.env.DATABASE_URL ? 'configurado' : 'falta DATABASE_URL',
  }

  const todoBien = Object.values(comprobaciones).every((c) => c.ok)

  return NextResponse.json(
    {
      ok: todoBien,
      servicio: 'chillout',
      entorno: process.env.NODE_ENV,
      version: process.env.npm_package_version ?? 'desconocida',
      ms: Date.now() - inicio,
      comprobaciones,
    },
    { status: todoBien ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  )
}
