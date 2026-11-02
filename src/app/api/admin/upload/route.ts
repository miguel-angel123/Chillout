import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { runPhotoPipeline, slugify } from '@/lib/3d/pipeline'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const maxDuration = 120

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 25 * 1024 * 1024

export async function POST(request: Request) {
  const token = request.headers.get('cookie')?.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))?.[1]
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Sesión inválida. Vuelve a entrar.' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el formulario' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta la fotografía' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Formato no soportado (${file.type || 'desconocido'}). Usa JPG, PNG o WebP.` },
      { status: 415 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen supera 25 MB' }, { status: 413 })
  }

  const name = String(form.get('name') ?? '').trim()
  const subtitle = String(form.get('subtitle') ?? '').trim() || 'Pieza nueva'
  const category = String(form.get('category') ?? 'sueteres').trim()
  const fitRaw = String(form.get('fit') ?? 'regular').trim()
  const fit = ['slim', 'regular', 'oversize'].includes(fitRaw) ? fitRaw : 'regular'
  const colorSlug = String(form.get('colorSlug') ?? '').trim()
  const featured = form.get('featured') === 'on' || form.get('featured') === 'true'
  const stock = Math.max(0, Math.min(999, Number.parseInt(String(form.get('stock') ?? '0'), 10) || 0))

  if (name.length < 2) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const db = getDb()

  // Color y tallas deben existir en el catálogo
  const [color] = await db.select().from(schema.colors).where(eq(schema.colors.slug, colorSlug)).limit(1)
  if (!color) {
    return NextResponse.json({ error: `Color desconocido: ${colorSlug}` }, { status: 400 })
  }
  const sizeRows = await db.select().from(schema.sizes).orderBy(schema.sizes.sortOrder)
  if (sizeRows.length === 0) {
    return NextResponse.json({ error: 'No hay tallas en la base de datos' }, { status: 500 })
  }

  // Slug único
  const base = slugify(name) || `prenda-${Date.now()}`
  let slug = base
  for (let attempt = 2; attempt < 50; attempt += 1) {
    const [existing] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug))
      .limit(1)
    if (!existing) break
    slug = `${base}-${attempt}`
  }

  const backFile = form.get('fileBack')
  const sideFile = form.get('fileSide')

  // Las tres vistas son obligatorias: sin trasera y lateral el modelo 3D es una
  // inferencia simétrica, no la prenda real.
  if (!(backFile instanceof File) || !(sideFile instanceof File)) {
    const missing = [
      !(backFile instanceof File) ? 'la vista trasera' : null,
      !(sideFile instanceof File) ? 'la vista lateral' : null,
    ].filter(Boolean)
    return NextResponse.json(
      { error: `Falta ${missing.join(' y ')}. Se requieren las tres vistas: frontal, trasera y lateral.` },
      { status: 400 },
    )
  }

  // ── Pipeline: prenda aislada + profundidad por vista ──────
  let result
  try {
    const front = Buffer.from(await file.arrayBuffer())
    const back = Buffer.from(await backFile.arrayBuffer())
    const side = Buffer.from(await sideFile.arrayBuffer())

    result = await runPhotoPipeline({ front, back, side }, { slug })
  } catch (error) {
    console.error('[admin/upload] pipeline falló:', error)
    return NextResponse.json(
      { error: `El pipeline 3D falló: ${(error as Error).message}` },
      { status: 500 },
    )
  }

  // ── Persistencia ──────────────────────────────────────────
  let createdProductId: string | null = null

  try {
    const [product] = await db
      .insert(schema.products)
      .values({
        slug,
        name,
        subtitle,
        description: `Prenda ${name} en punto tejido. Ficha generada automáticamente desde la fotografía original.`,
        line: 'CHILLOUT',
        category,
        fit,
        fabric: 'Por definir',
        priceCop: null,
        compareAtCop: null,
        status: 'active',
        featured,
        tags: ['Nuevo', '3D'],
      })
      .returning({ id: schema.products.id })

    if (!product) throw new Error('No se pudo crear el producto')
    createdProductId = product.id

    for (const size of sizeRows) {
      await db.insert(schema.productVariants).values({
        productId: product.id,
        colorId: color.id,
        sizeId: size.id,
        // El id del producto garantiza unicidad; truncar el slug generaba SKUs
        // repetidos entre variantes del mismo nombre.
        sku: `CHL-${product.id.slice(0, 8).toUpperCase()}-${color.slug.slice(0, 3).toUpperCase()}-${size.slug.toUpperCase()}`,
        priceCop: null,
        stock,
      })
    }

    await db.insert(schema.productMedia).values({
      productId: product.id,
      colorId: color.id,
      kind: 'front',
      url: result.photoUrl,
      alt: `${name}, vista frontal`,
      width: result.width,
      height: result.height,
      sortOrder: 0,
      isEditorial: false,
    })

    // Vista trasera real: es la que hace que el 3D no sea simétrico.
    if (result.backPhotoUrl) {
      await db.insert(schema.productMedia).values({
        productId: product.id,
        colorId: color.id,
        kind: 'back',
        url: result.backPhotoUrl,
        alt: `${name}, vista trasera`,
        sortOrder: 1,
        isEditorial: false,
      })
    }

    // Vista lateral: se guarda en la galería y alimenta el perfil del modelo.
    if (result.sideCutoutUrl) {
      await db.insert(schema.productMedia).values({
        productId: product.id,
        colorId: color.id,
        kind: 'detail',
        url: `/api/media/products/${slug}-side.jpg`,
        alt: `${name}, vista lateral`,
        sortOrder: 2,
        isEditorial: false,
      })
    }

    // Un modelo 3D listo por producto/color
    await db.insert(schema.models3d).values({
      productId: product.id,
      colorId: color.id,
      status: 'ready',
      route: 'procedural',
      glbUrl: null,
      posterUrl: result.cutoutUrl,
      qualityScore: 100,
    })

    revalidatePath('/')
    revalidatePath('/coleccion')
    revalidatePath(`/producto/${slug}`)

    return NextResponse.json({
      ok: true,
      slug,
      url: `/producto/${slug}`,
      assets: {
        photo: result.photoUrl,
        cutout: result.cutoutUrl,
        backCutout: result.backCutoutUrl,
        sideCutout: result.sideCutoutUrl,
        depth: result.depthUrl,
      },
      timings: result.timings,
    })
  } catch (error) {
    console.error('[admin/upload] persistencia falló:', error)

    // No dejar productos a medio crear en el catálogo.
    if (createdProductId) {
      try {
        await getDb().delete(schema.products).where(eq(schema.products.id, createdProductId))
      } catch {
        /* la limpieza es best-effort */
      }
    }

    return NextResponse.json(
      { error: `Se generaron los activos pero falló el guardado: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Usa POST para subir una fotografía' }, { status: 405 })
}
