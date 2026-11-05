import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Puerta de acceso del panel de administración.
 *
 * Sesión sin estado: cookie HttpOnly firmada con HMAC-SHA256. No hay base de
 * usuarios todavía; cuando entre Better Auth, esta capa se reemplaza sin tocar
 * las pantallas.
 *
 * Configuración en .env.local:
 *   ADMIN_PASSWORD  contraseña de entrada
 *   ADMIN_SECRET    secreto de firma (cualquier cadena larga y aleatoria)
 */

export const ADMIN_COOKIE = 'chillout_admin'
const MAX_AGE_SECONDS = 60 * 60 * 8

/** Valor de ejemplo que nunca debe usarse para firmar sesiones reales. */
const SECRETO_INSEGURO = 'dev-secret-cambiar-en-produccion'
const LARGO_MINIMO_SECRETO = 32

/**
 * Secreto de firma.
 *
 * En producción, si falta o es débil, devolvemos null y la sesión queda cerrada
 * (nadie entra y nadie valida). Es preferible un panel inaccesible a un panel
 * abierto con una firma que cualquiera puede reproducir.
 */
function secret(): string | null {
  const valor = process.env.ADMIN_SECRET?.trim()

  if (!valor || valor.length < LARGO_MINIMO_SECRETO || valor === SECRETO_INSEGURO) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[admin/auth] ADMIN_SECRET ausente o débil: el panel queda cerrado. Define un secreto de al menos 32 caracteres.',
      )
      return null
    }
    return SECRETO_INSEGURO
  }

  return valor
}

export function adminPassword(): string | null {
  const valor = process.env.ADMIN_PASSWORD?.trim()
  return valor && valor.length >= 8 ? valor : null
}

export function createAdminToken(): string | null {
  const clave = secret()
  if (!clave) return null

  const issuedAt = Date.now().toString(36)
  const signature = createHmac('sha256', clave).update(issuedAt).digest('base64url')
  return `${issuedAt}.${signature}`
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false

  const clave = secret()
  if (!clave) return false

  const [issuedAt, signature] = token.split('.')
  if (!issuedAt || !signature) return false

  const expected = createHmac('sha256', clave).update(issuedAt).digest('base64url')

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  if (!timingSafeEqual(a, b)) return false

  const ageMs = Date.now() - Number.parseInt(issuedAt, 36)
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < MAX_AGE_SECONDS * 1000
}

export function checkPassword(candidate: string): boolean {
  const expected = adminPassword()
  if (!expected) return false

  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}
