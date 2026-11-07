import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDb, schema } from '@/db/client'
import { exigirSesion } from '@/lib/admin/guard'

export const runtime = 'nodejs'
export const maxDuration = 60

const MEDIA_MODELS = join(process.cwd(), 'public', 'media', 'models')
const MAX_GLB = 60 * 1024 * 1024

/**
 * Edición de un producto ya publicado.
 *
 * Permite corregir datos, precio, stock por talla, estado y destacado, y
 * reemplazar el modelo 3D sin crear otra prenda.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const guardia = await exigirSesion()
  if (guardia) return guardia

  const { slug } = await params

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el formulario' }, { status: 400 })
  }

  const texto = (clave: string) => String(form.get(clave) ?? '').trim()
  const db = getDb()

  const [producto] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1)

  if (!producto) {
    return NextResponse.json({ error: 'Esa prenda no existe' }, { status: 404 })
  }

  const nombre = texto('name')
  if (nombre.length < 2) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const categorias = ['hoodies', 'sueteres', 'camisetas', 'pantalones', 'accesorios']
  const categoria = categorias.includes(texto('category')) ? texto('category') : 'sueteres'
  const calceRaw = texto('fit')
  const calce = ['slim', 'regular', 'oversize'].includes(calceRaw) ? calceRaw : 'regular'
  const estadoRaw = texto('status')
  const estado = ['draft', 'active', 'archived'].includes(estadoRaw) ? estadoRaw : 'active'

  const precio = Number.parseInt(texto('priceCop') || '0', 10)
  const precioComparacion = Number.parseInt(texto('compareAtCop') || '0', 10)
  const precioFinal = Number.isFinite(precio) && precio > 0 ? precio : null
  const comparacionFinal =
    Number.isFinite(precioComparacion) && precioComparacion > 0 ? precioComparacion : null

  const etiquetas = texto('tags')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  try {
    await db
      .update(schema.products)
      .set({
        name: nombre,
        subtitle: texto('subtitle') || 'Pieza nueva',
        description: texto('description'),
        category: categoria,
        fit: calce,
        fabric: texto('fabric') || 'Por definir',
        priceCop: precioFinal,
        compareAtCop: comparacionFinal,
        featured: texto('featured') === 'true',
        status: estado as 'draft' | 'active' | 'archived',
        tags: etiquetas.length > 0 ? etiquetas : ['Nuevo'],
      })
      .where(eq(schema.products.id, producto.id))

    // Stock por talla
    const stocksRaw = texto('stocks')
    if (stocksRaw) {
      const stocks = JSON.parse(stocksRaw) as Record<string, number>
      const tallas = await db.select().from(schema.sizes)
      const porSlug = new Map(tallas.map((t) => [t.slug, t.id]))

      for (const [tallaSlug, cantidad] of Object.entries(stocks)) {
        const sizeId = porSlug.get(tallaSlug)
        if (!sizeId) continue
        await db
          .update(schema.productVariants)
          .set({
            stock: Math.max(0, Math.min(999, Number(cantidad) || 0)),
            priceCop: precioFinal,
          })
          .where(
            and(
              eq(schema.productVariants.productId, producto.id),
              eq(schema.productVariants.sizeId, sizeId),
            ),
          )
      }
    }

    // Reemplazo del GLB
    const glb = form.get('glb')
    let glbReemplazado = false
    if (glb instanceof File && glb.size > 0) {
      if (glb.size > MAX_GLB) {
        return NextResponse.json({ error: 'El GLB supera 60 MB' }, { status: 413 })
      }
      await mkdir(MEDIA_MODELS, { recursive: true })
      const buffer = Buffer.from(await glb.arrayBuffer())
      await writeFile(join(MEDIA_MODELS, `${slug}.glb`), buffer)
      await db
        .update(schema.models3d)
        .set({
          glbUrl: `/api/media/models/${slug}.glb`,
          glbBytes: buffer.length,
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(eq(schema.models3d.productId, producto.id))
      glbReemplazado = true
    }

    revalidatePath('/')
    revalidatePath('/coleccion')
    revalidatePath(`/producto/${slug}`)

    return NextResponse.json({ ok: true, slug, glb: glbReemplazado })
  } catch (error) {
    return NextResponse.json({ error: `No se pudo guardar: ${(error as Error).message}` }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const guardia = await exigirSesion()
  if (guardia) return guardia

  const { slug } = await params
  const db = getDb()
  const borrados = await db
    .delete(schema.products)
    .where(eq(schema.products.slug, slug))
    .returning({ id: schema.products.id })

  if (borrados.length === 0) {
    return NextResponse.json({ error: 'Esa prenda no existe' }, { status: 404 })
  }

  revalidatePath('/')
  revalidatePath('/coleccion')
  return NextResponse.json({ ok: true, slug })
}
