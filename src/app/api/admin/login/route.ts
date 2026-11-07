import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_OPTIONS,
  adminEmail,
  crearSesion,
  estadoLimite,
  ipCliente,
  registrarIntento,
  verificarCredenciales,
} from '@/lib/admin/auth'

export const runtime = 'nodejs'

/**
 * Acceso al panel.
 *
 * 1. Se mira el límite de intentos de esa IP (contado en la base).
 * 2. Se compara la contraseña con el hash bcrypt del usuario.
 * 3. Si entra, se crea una sesión en base y se entrega el token en cookie.
 */
export async function POST(request: Request) {
  const ip = ipCliente(request)

  try {
    const limite = await estadoLimite(ip)
    if (limite.bloqueado) {
      const minutos = Math.max(1, Math.ceil(limite.esperarMs / 60_000))
      return NextResponse.json(
        { error: `Demasiados intentos. Prueba de nuevo en ${minutos} min.` },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(limite.esperarMs / 1000)) },
        },
      )
    }

    const body = (await request.json().catch(() => null)) as {
      password?: unknown
      email?: unknown
    } | null

    const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : ''
    const email = typeof body?.email === 'string' && body.email.trim() ? body.email : adminEmail()

    const resultado = await verificarCredenciales(email, password)

    if (!resultado.ok) {
      await registrarIntento(ip, email, false)

      if (resultado.motivo === 'sin_configurar') {
        return NextResponse.json(
          { error: 'El panel no está configurado (falta ADMIN_PASSWORD).' },
          { status: 503 },
        )
      }

      if (resultado.motivo === 'bloqueado') {
        const minutos = Math.max(1, Math.ceil((resultado.esperarMs ?? 0) / 60_000))
        return NextResponse.json(
          { error: `Demasiados intentos fallidos. Espera ${minutos} min.` },
          { status: 429 },
        )
      }

      const restantes = Math.max(0, 5 - (limite.usados + 1))
      return NextResponse.json({ error: 'Contraseña incorrecta', restantes }, { status: 401 })
    }

    await registrarIntento(ip, email, true)

    const { token } = await crearSesion(resultado.userId, {
      ip,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    const respuesta = NextResponse.json({ ok: true })
    respuesta.cookies.set(ADMIN_COOKIE, token, ADMIN_COOKIE_OPTIONS)
    return respuesta
  } catch (error) {
    console.error('[admin/login] fallo:', (error as Error).message)
    return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 500 })
  }
}
