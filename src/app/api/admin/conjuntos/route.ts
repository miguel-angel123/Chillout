import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { slugify } from '@/lib/slug'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function autorizado(request: Request): boolean {
  const token = request.headers.get('cookie')?.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))?.[1]
  return verifyAdminToken(token)
}

function refrescar() {
  revalidatePath('/lookbook')
  revalidatePath('/')
}

function leerPiezas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor.filter((s): s is string => typeof s === 'string' && s.length > 0)
}

/** Crea un conjunto. */
export async function POST(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'SesiÃ³n invÃ¡lida' }, { status: 401 })
  }

  let cuerpo: {
    title?: unknown
    eyebrow?: unknown
    description?: unknown
    productSlugs?: unknown
    active?: unknown
  }

  try {
    cuerpo = (await request.json()) as typeof cuerpo
  } catch {
    return NextResponse.json({ error: 'PeticiÃ³n invÃ¡lida' }, { status: 400 })
  }

  const title = typeof cuerpo.title === 'string' ? cuerpo.title.trim() : ''
  if (title.length < 2) {
    return NextResponse.json({ error: 'El tÃ­tulo es obligatorio' }, { status: 400 })
  }

  const productSlugs = leerPiezas(cuerpo.productSlugs)
  if (productSlugs.length < 2) {
    return NextResponse.json(
      { error: 'Un conjunto necesita al menos dos piezas' },
      { status: 400 },
    )
  }

  const db = getDb()
  const base = slugify(title) || `conjunto-${Date.now()}`
  let slug = base
  for (let intento = 2; intento < 50; intento += 1) {
    const [existente] = await db
      .select({ id: schema.sets.id })
      .from(schema.sets)
      .where(eq(schema.sets.slug, slug))
      .limit(1)
    if (!existente) break
    slug = `${base}-${intento}`
  }

  try {
    const [creado] = await db
      .insert(schema.sets)
      .values({
        slug,
        eyebrow: typeof cuerpo.eyebrow === 'string' && cuerpo.eyebrow.trim() ? cuerpo.eyebrow.trim() : 'Conjunto',
        title,
        description: typeof cuerpo.description === 'string' ? cuerpo.description.trim() : '',
        productSlugs,
        active: cuerpo.active !== false,
      })
      .returning({ id: schema.sets.id, slug: schema.sets.slug })

    refrescar()
    return NextResponse.json({ ok: true, conjunto: creado })
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudo crear el conjunto: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}

/** Actualiza un conjunto. */
export async function PATCH(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'SesiÃ³n invÃ¡lida' }, { status: 401 })
  }

  let cuerpo: {
    slug?: unknown
    title?: unknown
    eyebrow?: unknown
    description?: unknown
    productSlugs?: unknown
    active?: unknown
  }

  try {
    cuerpo = (await request.json()) as typeof cuerpo
  } catch {
    return NextResponse.json({ error: 'PeticiÃ³n invÃ¡lida' }, { status: 400 })
  }

  const slug = typeof cuerpo.slug === 'string' ? cuerpo.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })

  const cambios: Record<string, unknown> = {}
  if (typeof cuerpo.title === 'string' && cuerpo.title.trim().length >= 2) {
    cambios.title = cuerpo.title.trim()
  }
  if (typeof cuerpo.eyebrow === 'string' && cuerpo.eyebrow.trim()) {
    cambios.eyebrow = cuerpo.eyebrow.trim()
  }
  if (typeof cuerpo.description === 'string') cambios.description = cuerpo.description.trim()
  if (typeof cuerpo.active === 'boolean') cambios.active = cuerpo.active
  if (Array.isArray(cuerpo.productSlugs)) {
    const piezas = leerPiezas(cuerpo.productSlugs)
    if (piezas.length < 2) {
      return NextResponse.json(
        { error: 'Un conjunto necesita al menos dos piezas' },
        { status: 400 },
      )
    }
    cambios.productSlugs = piezas
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const db = getDb()
  const actualizados = await db
    .update(schema.sets)
    .set(cambios)
    .where(eq(schema.sets.slug, slug))
    .returning({ id: schema.sets.id })

  if (actualizados.length === 0) {
    return NextResponse.json({ error: 'Ese conjunto no existe' }, { status: 404 })
  }

  refrescar()
  return NextResponse.json({ ok: true, slug })
}

/** Elimina un conjunto por slug. */
export async function DELETE(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'SesiÃ³n invÃ¡lida' }, { status: 401 })
  }

  const slug = (new URL(request.url).searchParams.get('slug') ?? '').trim()
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })

  const db = getDb()
  const borrados = await db
    .delete(schema.sets)
    .where(eq(schema.sets.slug, slug))
    .returning({ id: schema.sets.id })

  if (borrados.length === 0) {
    return NextResponse.json({ error: 'Ese conjunto no existe' }, { status: 404 })
  }

  refrescar()
  return NextResponse.json({ ok: true, slug })
}

