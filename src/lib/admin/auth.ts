import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { getDb, schema } from '@/db/client'

/**
 * Acceso del panel.
 *
 * · La contraseña se guarda como hash bcrypt en `admin_users`. El texto plano
 *   vive solo en `.env.local` (ADMIN_PASSWORD) como semilla para recrear el
 *   acceso si hace falta; nunca se escribe en la base.
 * · La sesión es un token aleatorio en cookie HttpOnly. En la base se guarda su
 *   hash, la caducidad y si fue revocada: así se puede cerrar al instante.
 * · El límite de intentos se cuenta en `login_attempts`, de modo que sobrevive
 *   a reinicios y se comparte entre instancias.
 */

export const ADMIN_COOKIE = 'chillout_admin'

/** Vida máxima de una sesión, aunque se use. */
const MAX_AGE_SECONDS = 60 * 60 * 8
/** Si el panel no se toca en este tiempo, la sesión se cierra sola. */
const IDLE_SECONDS = 60 * 60 * 2

const MAX_INTENTOS = 5
const VENTANA_MS = 15 * 60 * 1000
const RONDAS_BCRYPT = 12

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}

/* ── Utilidades ─────────────────────────────────────────────── */

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? 'admin@chillout.co').trim().toLowerCase()
}

/** IP del cliente detrás del proxy. */
export function ipCliente(request?: Request): string {
  const reenviada = request?.headers.get('x-forwarded-for')
  if (reenviada) return reenviada.split(',')[0]!.trim()
  return request?.headers.get('x-real-ip') ?? 'local'
}

/* ── Usuario administrador ──────────────────────────────────── */

type AdminListo = { id: string; email: string }

/**
 * Garantiza que exista el administrador.
 *
 * Si no existe (primer arranque, base nueva), lo crea a partir de
 * ADMIN_PASSWORD de `.env.local` con hash bcrypt. Si ya existe, no lo toca: un
 * cambio de contraseña se hace con `scripts/db-admin-password.mjs`.
 */
export async function asegurarAdmin(): Promise<AdminListo | null> {
  const db = getDb()
  const email = adminEmail()

  const [existente] = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1)

  if (existente) return existente

  const password = process.env.ADMIN_PASSWORD?.trim()
  if (!password || password.length < 8) {
    console.error('[admin] falta ADMIN_PASSWORD (mínimo 8 caracteres) para crear el acceso.')
    return null
  }

  const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT)
  const [creado] = await db
    .insert(schema.adminUsers)
    .values({ email, passwordHash })
    .onConflictDoNothing({ target: schema.adminUsers.email })
    .returning({ id: schema.adminUsers.id, email: schema.adminUsers.email })

  if (creado) {
    console.info(`[admin] usuario ${email} creado con hash bcrypt desde .env.local`)
    return creado
  }

  const [otraVez] = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1)

  return otraVez ?? null
}

export type ResultadoLogin =
  | { ok: true; userId: string }
  | {
      ok: false
      motivo: 'credenciales' | 'bloqueado' | 'inactivo' | 'sin_configurar'
      esperarMs?: number
    }

/** Comprueba email + contraseña contra el hash bcrypt de la base. */
export async function verificarCredenciales(
  emailCrudo: string,
  password: string,
): Promise<ResultadoLogin> {
  const db = getDb()
  const email = emailCrudo.trim().toLowerCase() || adminEmail()

  const admin = await asegurarAdmin()
  if (!admin) return { ok: false, motivo: 'sin_configurar' }

  const [usuario] = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1)

  if (!usuario || !usuario.active) return { ok: false, motivo: 'inactivo' }

  if (usuario.lockedUntil && usuario.lockedUntil.getTime() > Date.now()) {
    return { ok: false, motivo: 'bloqueado', esperarMs: usuario.lockedUntil.getTime() - Date.now() }
  }

  const coincide = await bcrypt.compare(password, usuario.passwordHash)

  if (!coincide) {
    // Se anota el fallo para tener traza, pero NO se bloquea la cuenta: un
    // atacante podría dejar fuera al gerente a base de fallar. La defensa real
    // es el límite por IP + el coste de bcrypt (12 rondas) + una buena
    // contraseña.
    await db
      .update(schema.adminUsers)
      .set({ failedAttempts: sql`${schema.adminUsers.failedAttempts} + 1` })
      .where(eq(schema.adminUsers.id, usuario.id))

    return { ok: false, motivo: 'credenciales' }
  }

  await db
    .update(schema.adminUsers)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(schema.adminUsers.id, usuario.id))

  return { ok: true, userId: usuario.id }
}

/* ── Límite de intentos en base de datos ────────────────────── */

export type EstadoLimite = { bloqueado: boolean; esperarMs: number; usados: number }

/** Cuenta los fallos recientes de esa IP. */
export async function estadoLimite(ip: string): Promise<EstadoLimite> {
  const db = getDb()
  const desde = new Date(Date.now() - VENTANA_MS)

  const filas = await db
    .select({ cuando: schema.loginAttempts.attemptedAt })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.ip, ip),
        eq(schema.loginAttempts.success, false),
        gt(schema.loginAttempts.attemptedAt, desde),
      ),
    )
    .orderBy(schema.loginAttempts.attemptedAt)

  if (filas.length < MAX_INTENTOS) {
    return { bloqueado: false, esperarMs: 0, usados: filas.length }
  }

  // Espera hasta que los fallos más antiguos salgan de la ventana.
  const referencia = filas[filas.length - MAX_INTENTOS]!.cuando.getTime()
  return {
    bloqueado: true,
    esperarMs: Math.max(0, referencia + VENTANA_MS - Date.now()),
    usados: filas.length,
  }
}

/** Anota un intento (fallido o correcto). */
export async function registrarIntento(ip: string, email: string, success: boolean): Promise<void> {
  const db = getDb()
  await db.insert(schema.loginAttempts).values({ ip, email, success })

  // Limpieza oportunista: no hace falta guardar intentos de hace días.
  if (Math.random() < 0.1) {
    await db
      .delete(schema.loginAttempts)
      .where(sql`${schema.loginAttempts.attemptedAt} < now() - interval '2 days'`)
  }
}

/* ── Sesiones ───────────────────────────────────────────────── */

/**
 * Crea una sesión y devuelve el token que va en la cookie.
 * En la base queda solo el hash: una copia de la base no permite suplantar.
 */
export async function crearSesion(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ token: string; expira: Date }> {
  const db = getDb()
  const token = randomBytes(32).toString('base64url')
  const expira = new Date(Date.now() + MAX_AGE_SECONDS * 1000)

  await db.insert(schema.adminSessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: expira,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  })

  return { token, expira }
}

export type Sesion = { userId: string; email: string; sessionId: string }

/** Sesión válida de la petición actual, o null. */
export async function sesionActual(): Promise<Sesion | null> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (!token) return null

  const db = getDb()

  const [fila] = await db
    .select({
      sessionId: schema.adminSessions.id,
      userId: schema.adminSessions.userId,
      expiresAt: schema.adminSessions.expiresAt,
      lastSeenAt: schema.adminSessions.lastSeenAt,
      revokedAt: schema.adminSessions.revokedAt,
      email: schema.adminUsers.email,
      activo: schema.adminUsers.active,
    })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminSessions.userId))
    .where(eq(schema.adminSessions.tokenHash, hashToken(token)))
    .limit(1)

  if (!fila) return null
  if (fila.revokedAt) return null
  if (fila.expiresAt.getTime() <= Date.now()) return null
  if (!fila.activo) return null

  // Cierre por inactividad: dos horas sin tocar el panel.
  if (Date.now() - fila.lastSeenAt.getTime() > IDLE_SECONDS * 1000) {
    await db
      .update(schema.adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.adminSessions.id, fila.sessionId))
    return null
  }

  // Latido: se actualiza como mucho una vez por minuto para no escribir de más.
  if (Date.now() - fila.lastSeenAt.getTime() > 60_000) {
    await db
      .update(schema.adminSessions)
      .set({ lastSeenAt: new Date() })
      .where(
        and(eq(schema.adminSessions.id, fila.sessionId), isNull(schema.adminSessions.revokedAt)),
      )
  }

  return { userId: fila.userId, email: fila.email, sessionId: fila.sessionId }
}

/** Cierra la sesión actual (logout de verdad: queda revocada en la base). */
export async function revocarSesionActual(): Promise<void> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (!token) return

  const db = getDb()
  await db
    .update(schema.adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(schema.adminSessions.tokenHash, hashToken(token)))
}

/** Cierra TODAS las sesiones de un usuario (por si se sospecha un robo). */
export async function revocarTodasLasSesiones(userId: string): Promise<number> {
  const db = getDb()
  const filas = await db
    .update(schema.adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.adminSessions.userId, userId), isNull(schema.adminSessions.revokedAt)))
    .returning({ id: schema.adminSessions.id })
  return filas.length
}
