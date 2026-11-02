import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS, checkPassword, createAdminToken } from '@/lib/admin/auth'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null
  const password = body?.password ?? ''

  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, createAdminToken(), ADMIN_COOKIE_OPTIONS)

  // Verificación temprana de la base: si no responde, el admin debe saberlo ya.
  try {
    const db = getDb()
    await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.status, 'active')).limit(1)
  } catch (error) {
    console.warn('[admin/login] base de datos no disponible:', (error as Error).message)
  }

  return response
}
