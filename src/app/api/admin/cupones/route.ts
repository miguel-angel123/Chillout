import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { desc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { normalizarCodigo } from '@/lib/cupones'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function autorizado(request: Request): boolean {
  const token = request.headers.get('cookie')?.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))?.[1]
  return verifyAdminToken(token)
}

/** Crea un cupón. */
export async function POST(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let cuerpo: {
    code?: unknown
    kind?: unknown
    value?: unknown
    minSubtotal?: unknown
    usageLimit?: unknown
    validUntil?: unknown
  }

  try {
    cuerpo = (await request.json()) as typeof cuerpo
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const code = normalizarCodigo(typeof cuerpo.code === 'string' ? cuerpo.code : '')
  if (code.length < 3 || code.length > 40) {
    return NextResponse.json({ error: 'El código debe tener entre 3 y 40 caracteres' }, { status: 400 })
  }

  const kind = cuerpo.kind === 'fixed' ? 'fixed' : 'percent'
  const value = Math.round(Number(cuerpo.value))
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: 'El descuento debe ser mayor que cero' }, { status: 400 })
  }
  if (kind === 'percent' && value > 100) {
    return NextResponse.json({ error: 'Un porcentaje no puede pasar de 100' }, { status: 400 })
  }

  const minSubtotal = Math.max(0, Math.round(Number(cuerpo.minSubtotal) || 0))
  const usageLimitNum = Math.round(Number(cuerpo.usageLimit) || 0)
  const usageLimit = usageLimitNum > 0 ? usageLimitNum : null
  const validUntil =
    typeof cuerpo.validUntil === 'string' && cuerpo.validUntil.trim()
      ? new Date(cuerpo.validUntil).toISOString()
      : null

  try {
    const db = getDb()
    const [existente] = await db
      .select({ id: schema.coupons.id })
      .from(schema.coupons)
      .where(eq(schema.coupons.code, code))
      .limit(1)

    if (existente) {
      return NextResponse.json({ error: 'Ya existe un cupón con ese código' }, { status: 409 })
    }

    const [creado] = await db
      .insert(schema.coupons)
      .values({
        code,
        kind,
        value,
        minSubtotalCop: minSubtotal,
        usageLimit,
        validUntil,
        active: true,
      })
      .returning({ id: schema.coupons.id, code: schema.coupons.code })

    revalidatePath('/admin/cupones')
    return NextResponse.json({ ok: true, cupon: creado })
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudo crear el cupón: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}

/** Activa o desactiva un cupón. */
export async function PATCH(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let cuerpo: { code?: unknown; active?: unknown }
  try {
    cuerpo = (await request.json()) as typeof cuerpo
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const code = normalizarCodigo(typeof cuerpo.code === 'string' ? cuerpo.code : '')
  const active = Boolean(cuerpo.active)
  if (!code) return NextResponse.json({ error: 'Falta el código' }, { status: 400 })

  const db = getDb()
  const actualizados = await db
    .update(schema.coupons)
    .set({ active })
    .where(eq(schema.coupons.code, code))
    .returning({ id: schema.coupons.id })

  if (actualizados.length === 0) {
    return NextResponse.json({ error: 'Ese cupón no existe' }, { status: 404 })
  }

  revalidatePath('/admin/cupones')
  return NextResponse.json({ ok: true, code, active })
}

/** Elimina un cupón por código. */
export async function DELETE(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const code = normalizarCodigo(new URL(request.url).searchParams.get('code') ?? '')
  if (!code) return NextResponse.json({ error: 'Falta el código' }, { status: 400 })

  const db = getDb()
  const borrados = await db
    .delete(schema.coupons)
    .where(eq(schema.coupons.code, code))
    .returning({ id: schema.coupons.id })

  if (borrados.length === 0) {
    return NextResponse.json({ error: 'Ese cupón no existe' }, { status: 404 })
  }

  revalidatePath('/admin/cupones')
  return NextResponse.json({ ok: true, code })
}

/** Lista de cupones (para refrescos puntuales). */
export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const db = getDb()
  const cupones = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt))
  return NextResponse.json({ cupones })
}
