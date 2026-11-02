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

function secret(): string {
  return process.env.ADMIN_SECRET ?? 'dev-secret-cambiar-en-produccion'
}

export function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD ?? null
}

export function createAdminToken(): string {
  const issuedAt = Date.now().toString(36)
  const signature = createHmac('sha256', secret()).update(issuedAt).digest('base64url')
  return `${issuedAt}.${signature}`
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false

  const [issuedAt, signature] = token.split('.')
  if (!issuedAt || !signature) return false

  const expected = createHmac('sha256', secret()).update(issuedAt).digest('base64url')

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
