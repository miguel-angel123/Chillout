import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS, checkPassword, createAdminToken } from '@/lib/admin/auth'
import {
  claveCliente,
  estaBloqueado,
  limpiarIntentos,
  registrarIntentoFallido,
} from '@/lib/admin/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const cliente = claveCliente(request)

  // Antes de tocar la contraseña: ¿esta IP ya agotó sus intentos?
  const estado = estaBloqueado(cliente)
  if (estado.bloqueado) {
    const minutos = Math.ceil(estado.esperarMs / 60_000)
    return NextResponse.json(
      { error: `Demasiados intentos. Prueba de nuevo en ${minutos} min.` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(estado.esperarMs / 1000)) } },
    )
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null
  const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : ''

  if (!checkPassword(password)) {
    const resultado = registrarIntentoFallido(cliente)
    if (!resultado.permitido) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Espera unos minutos.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'Contraseña incorrecta', restantes: resultado.restantes },
      { status: 401 },
    )
  }

  const token = createAdminToken()
  if (!token) {
    // Sin secreto válido no se emite sesión: el panel queda cerrado.
    return NextResponse.json(
      { error: 'El panel no está configurado (falta ADMIN_SECRET).' },
      { status: 503 },
    )
  }

  limpiarIntentos(cliente)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, token, ADMIN_COOKIE_OPTIONS)

  // Verificación temprana de la base: si no responde, el admin debe saberlo ya.
  try {
    const db = getDb()
    await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.status, 'active'))
      .limit(1)
  } catch (error) {
    console.warn('[admin/login] base de datos no disponible:', (error as Error).message)
  }

  return response
}
