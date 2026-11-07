import { NextResponse } from 'next/server'
import { sesionActual } from '@/lib/admin/auth'

/**
 * Guardia para las rutas del panel.
 *
 * Devuelve una respuesta 401 lista para devolver si no hay sesión válida, o
 * null si se puede continuar. La sesión se comprueba contra la base: una cookie
 * revocada o caducada deja de servir al instante.
 */
export async function exigirSesion(): Promise<NextResponse | null> {
  const sesion = await sesionActual()
  if (!sesion) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
  }
  return null
}
