import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { getDb, schema } from '@/db/client'
import { slugify } from '@/lib/3d/pipeline'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

export const runtime = 'nodejs'

const MEDIA_DROPS = join(process.cwd(), 'public', 'media', 'drops')

function autorizado(request: Request): boolean {
  const token = request.headers.get('cookie')?.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))?.[1]
  return verifyAdminToken(token)
}

function refrescar() {
  revalidatePath('/drops')
  revalidatePath('/')
}

/** Crea un drop. */
export async function POST(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el formulario' }, { status: 400 })
  }

  const texto = (clave: string) => String(form.get(clave) ?? '').trim()

  const title = texto('title')
  if (title.length < 2) {
    return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })
  }

  const lanzamiento = texto('launchAt')
  const fecha = new Date(lanzamiento)
  if (!lanzamiento || Number.isNaN(fecha.getTime())) {
    return NextResponse.json({ error: 'La fecha de apertura no es válida' }, { status: 400 })
  }

  let productSlugs: string[] = []
  try {
    const crudo = JSON.parse(texto('productSlugs') || '[]') as unknown
    if (Array.isArray(crudo)) {
      productSlugs = crudo.filter((s): s is string => typeof s === 'string')
    }
  } catch {
    productSlugs = []
  }

  const db = getDb()

  // Slug único
  const base = slugify(title) || `drop-${Date.now()}`
  let slug = base
  for (let intento = 2; intento < 50; intento += 1) {
    const [existente] = await db
      .select({ id: schema.drops.id })
      .from(schema.drops)
      .where(eq(schema.drops.slug, slug))
      .limit(1)
    if (!existente) break
    slug = `${base}-${intento}`
  }

  // Imagen opcional
  let imageUrl: string | null = null
  const imagen = form.get('imagen')
  if (imagen instanceof File && imagen.size > 0) {
    if (!imagen.type.startsWith('image/')) {
      return NextResponse.json({ error: 'La imagen del drop debe ser una imagen' }, { status: 415 })
    }
    if (imagen.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen supera 25 MB' }, { status: 413 })
    }
    try {
      await mkdir(MEDIA_DROPS, { recursive: true })
      const archivo = `${slug}.jpg`
      await sharp(Buffer.from(await imagen.arrayBuffer()))
        .rotate()
        .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
        .toColorspace('srgb')
        .jpeg({ quality: 90, mozjpeg: true, progressive: true })
        .toFile(join(MEDIA_DROPS, archivo))
      imageUrl = `/api/media/drops/${archivo}`
    } catch (error) {
      return NextResponse.json(
        { error: `No se pudo procesar la imagen: ${(error as Error).message}` },
        { status: 500 },
      )
    }
  }

  try {
    const [creado] = await db
      .insert(schema.drops)
      .values({
        slug,
        eyebrow: texto('eyebrow') || 'Drop',
        title,
        description: texto('description'),
        imageUrl,
        launchAt: fecha,
        unidadesPorReferencia: Math.max(1, Math.min(999, Number(texto('unidades')) || 6)),
        productSlugs,
        active: texto('active') !== 'false',
      })
      .returning({ id: schema.drops.id, slug: schema.drops.slug })

    refrescar()
    return NextResponse.json({ ok: true, drop: creado })
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudo crear el drop: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}

/** Actualiza campos sueltos de un drop (fecha, estado, piezas…). */
export async function PATCH(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  let cuerpo: {
    slug?: unknown
    title?: unknown
    description?: unknown
    launchAt?: unknown
    unidades?: unknown
    productSlugs?: unknown
    active?: unknown
  }

  try {
    cuerpo = (await request.json()) as typeof cuerpo
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const slug = typeof cuerpo.slug === 'string' ? cuerpo.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })

  const cambios: Record<string, unknown> = {}

  if (typeof cuerpo.title === 'string' && cuerpo.title.trim().length >= 2) {
    cambios.title = cuerpo.title.trim()
  }
  if (typeof cuerpo.description === 'string') cambios.description = cuerpo.description
  if (typeof cuerpo.active === 'boolean') cambios.active = cuerpo.active
  if (cuerpo.unidades !== undefined) {
    cambios.unidadesPorReferencia = Math.max(1, Math.min(999, Number(cuerpo.unidades) || 6))
  }
  if (cuerpo.launchAt !== undefined) {
    const fecha = new Date(String(cuerpo.launchAt))
    if (Number.isNaN(fecha.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }
    cambios.launchAt = fecha
  }
  if (Array.isArray(cuerpo.productSlugs)) {
    cambios.productSlugs = cuerpo.productSlugs.filter((s): s is string => typeof s === 'string')
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const db = getDb()
  const actualizados = await db
    .update(schema.drops)
    .set(cambios)
    .where(eq(schema.drops.slug, slug))
    .returning({ id: schema.drops.id })

  if (actualizados.length === 0) {
    return NextResponse.json({ error: 'Ese drop no existe' }, { status: 404 })
  }

  refrescar()
  return NextResponse.json({ ok: true, slug })
}

/** Elimina un drop por slug. */
export async function DELETE(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const slug = (new URL(request.url).searchParams.get('slug') ?? '').trim()
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })

  const db = getDb()
  const borrados = await db
    .delete(schema.drops)
    .where(eq(schema.drops.slug, slug))
    .returning({ id: schema.drops.id })

  if (borrados.length === 0) {
    return NextResponse.json({ error: 'Ese drop no existe' }, { status: 404 })
  }

  refrescar()
  return NextResponse.json({ ok: true, slug })
}
