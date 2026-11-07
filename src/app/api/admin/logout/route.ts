import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, revocarSesionActual } from '@/lib/admin/auth'

/**
 * Cierre de sesión.
 *
 * No basta con borrar la cookie en el navegador: la sesión se marca como
 * revocada en la base. Si alguien copió esa cookie, deja de servir al instante.
 */
export async function POST(request: Request) {
  try {
    await revocarSesionActual()
  } catch (error) {
    console.warn('[admin/logout] no se pudo revocar:', (error as Error).message)
  }

  const response = NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 })
  response.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
