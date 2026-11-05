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
export const maxDuration = 120

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_IMAGEN = 25 * 1024 * 1024
const MAX_GLB = 60 * 1024 * 1024

const MEDIA_PRODUCTS = join(process.cwd(), 'public', 'media', 'products')
const MEDIA_MODELS = join(process.cwd(), 'public', 'media', 'models')

/**
 * Alta de producto desde el panel (módulo de administración).
 *
 * A diferencia del 3D Studio —que construye el modelo a partir de las fotos—
 * esta ruta publica una prenda ya modelada: datos, imágenes y, si el gerente
 * la tiene, el GLB que viene de fuera (Meshy, Marvelous, un modelador).
 */
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

  const texto = (clave: string) => String(form.get(clave) ?? '').trim()

  const nombre = texto('name')
  if (nombre.length < 2) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const colorSlug = texto('colorSlug')
  const categorias = ['hoodies', 'sueteres', 'camisetas', 'pantalones', 'accesorios']
  const categoria = categorias.includes(texto('category')) ? texto('category') : 'sueteres'
  const calceRaw = texto('fit')
  const calce = ['slim', 'regular', 'oversize'].includes(calceRaw) ? calceRaw : 'regular'

  // Colores: lista (varios) o el campo simple de antes.
  let colorSlugs: string[] = []
  try {
    const crudo = JSON.parse(texto('colorSlugs') || '[]') as unknown
    if (Array.isArray(crudo)) {
      colorSlugs = crudo.filter((s): s is string => typeof s === 'string' && s.length > 0)
    }
  } catch {
    colorSlugs = []
  }
  if (colorSlugs.length === 0 && colorSlug) colorSlugs = [colorSlug]

  const precio = Number.parseInt(texto('priceCop') || '0', 10)
  const precioComparacion = Number.parseInt(texto('compareAtCop') || '0', 10)
  const destacado = texto('featured') === 'true'
  const etiquetas = texto('tags')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  // Stock por talla: mapa { "s": 3, "m": 5 }. Si llega, manda sobre `stock`.
  let stocks: Record<string, number> | null = null
  try {
    const crudo = texto('stocks')
    if (crudo) {
      const parseado = JSON.parse(crudo) as unknown
      if (parseado && typeof parseado === 'object') {
        stocks = Object.fromEntries(
          Object.entries(parseado as Record<string, unknown>).map(([talla, valor]) => [
            talla,
            Math.max(0, Math.min(999, Number(valor) || 0)),
          ]),
        )
      }
    }
  } catch {
    stocks = null
  }
  const stockGlobal = Math.max(0, Math.min(999, Number.parseInt(texto('stock') || '0', 10) || 0))

  const imagenes = form.getAll('imagenes').filter((f): f is File => f instanceof File)
  if (imagenes.length === 0) {
    return NextResponse.json({ error: 'Sube al menos la foto frontal' }, { status: 400 })
  }
  for (const imagen of imagenes) {
    if (!TIPOS_IMAGEN.includes(imagen.type)) {
      return NextResponse.json(
        { error: `Formato no soportado (${imagen.type || 'desconocido'}). Usa JPG, PNG, WebP o AVIF.` },
        { status: 415 },
      )
    }
    if (imagen.size > MAX_IMAGEN) {
      return NextResponse.json({ error: 'Una imagen supera 25 MB' }, { status: 413 })
    }
  }

  const glb = form.get('glb')
  if (glb instanceof File && glb.size > MAX_GLB) {
    return NextResponse.json({ error: 'El GLB supera 60 MB' }, { status: 413 })
  }

  const db = getDb()

  const [color] = await db.select().from(schema.colors).where(eq(schema.colors.slug, colorSlugs[0] ?? '')).limit(1)
  if (!color) {
    return NextResponse.json(
      { error: `Color desconocido: ${colorSlugs[0] ?? '(ninguno)'}` },
      { status: 400 },
    )
  }

  // Todos los colores marcados por el gerente.
  const coloresElegidos: typeof schema.colors.$inferSelect[] = []
  for (const slugColor of colorSlugs) {
    const [encontrado] = await db
      .select()
      .from(schema.colors)
      .where(eq(schema.colors.slug, slugColor))
      .limit(1)
    if (encontrado) coloresElegidos.push(encontrado)
  }
  if (coloresElegidos.length === 0) coloresElegidos.push(color)

  const tallas = await db.select().from(schema.sizes).orderBy(schema.sizes.sortOrder)
  if (tallas.length === 0) {
    return NextResponse.json({ error: 'No hay tallas en la base de datos' }, { status: 500 })
  }

  // Slug único
  const base = slugify(nombre) || `prenda-${Date.now()}`
  let slug = base
  for (let intento = 2; intento < 50; intento += 1) {
    const [existente] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug))
      .limit(1)
    if (!existente) break
    slug = `${base}-${intento}`
  }

  // ── Guardar imágenes normalizadas ───────────────────────
  await mkdir(MEDIA_PRODUCTS, { recursive: true })
  const guardadas: { url: string; kind: 'front' | 'back' | 'editorial'; alt: string }[] = []

  try {
    for (const [indice, imagen] of imagenes.entries()) {
      const buffer = Buffer.from(await imagen.arrayBuffer())
      const archivo = `${slug}-${String(indice + 1).padStart(2, '0')}.jpg`
      await sharp(buffer)
        .rotate()
        .resize({ width: 1600, height: 2000, fit: 'inside', withoutEnlargement: true })
        .toColorspace('srgb')
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 92, mozjpeg: true, progressive: true })
        .toFile(join(MEDIA_PRODUCTS, archivo))

      const kind = indice === 0 ? 'front' : indice === 1 ? 'back' : 'editorial'
      const sufijo = kind === 'front' ? 'vista frontal' : kind === 'back' ? 'vista trasera' : `vista ${indice + 1}`
      guardadas.push({ url: `/api/media/products/${archivo}`, kind, alt: `${nombre}, ${sufijo}` })
    }
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudieron procesar las imágenes: ${(error as Error).message}` },
      { status: 500 },
    )
  }

  // ── Guardar GLB si viene ────────────────────────────────
  let glbUrl: string | null = null
  let glbBytes: number | null = null

  if (glb instanceof File && glb.size > 0) {
    await mkdir(MEDIA_MODELS, { recursive: true })
    const buffer = Buffer.from(await glb.arrayBuffer())
    await writeFile(join(MEDIA_MODELS, `${slug}.glb`), buffer)
    glbUrl = `/api/media/models/${slug}.glb`
    glbBytes = buffer.length
  }

  // ── Persistencia ────────────────────────────────────────
  let creado: string | null = null

  try {
    const [producto] = await db
      .insert(schema.products)
      .values({
        slug,
        name: nombre,
        subtitle: texto('subtitle') || 'Pieza nueva',
        description: texto('description') || `Prenda ${nombre} en punto tejido.`,
        line: 'CHILLOUT',
        category: categoria,
        fit: calce,
        fabric: texto('fabric') || 'Por definir',
        priceCop: Number.isFinite(precio) && precio > 0 ? precio : null,
        compareAtCop: Number.isFinite(precioComparacion) && precioComparacion > 0 ? precioComparacion : null,
        status: 'active',
        featured: destacado,
        tags: etiquetas.length > 0 ? etiquetas : ['Nuevo'],
      })
      .returning({ id: schema.products.id })

    if (!producto) throw new Error('No se pudo crear el producto')
    creado = producto.id

    // Una variante por color × talla, con el stock de ESA talla.
    for (const colorElegido of coloresElegidos) {
      for (const talla of tallas) {
        const stockTalla = stocks ? (stocks[talla.slug] ?? 0) : stockGlobal
        await db.insert(schema.productVariants).values({
          productId: producto.id,
          colorId: colorElegido.id,
          sizeId: talla.id,
          sku: `CHL-${producto.id.slice(0, 8).toUpperCase()}-${colorElegido.slug.slice(0, 3).toUpperCase()}-${talla.slug.toUpperCase()}`,
          priceCop: Number.isFinite(precio) && precio > 0 ? precio : null,
          stock: stockTalla,
        })
      }
    }

    // Las fotos se asignan al primer color; los demás heredan esa imagen hasta
    // que el gerente suba las suyas.
    for (const [indice, media] of guardadas.entries()) {
      await db.insert(schema.productMedia).values({
        productId: producto.id,
        colorId: color.id,
        kind: media.kind,
        url: media.url,
        alt: media.alt,
        sortOrder: indice,
        isEditorial: media.kind === 'editorial',
      })
    }

    await db.insert(schema.models3d).values({
      productId: producto.id,
      colorId: color.id,
      status: glbUrl ? 'ready' : 'pending',
      route: 'procedural',
      glbUrl,
      glbBytes,
      posterUrl: guardadas[0]?.url ?? null,
      qualityScore: glbUrl ? 100 : null,
    })

    revalidatePath('/')
    revalidatePath('/coleccion')
    revalidatePath('/mix-and-match')
    revalidatePath(`/producto/${slug}`)

    return NextResponse.json({
      ok: true,
      slug,
      url: `/producto/${slug}`,
      imagenes: guardadas.length,
      glb: Boolean(glbUrl),
      colores: coloresElegidos.length,
      unidades:
        (Object.values(stocks ?? {}).reduce((suma, n) => suma + n, 0) ||
          stockGlobal * tallas.length) * coloresElegidos.length,
    })
  } catch (error) {
    // No dejar productos a medio crear
    if (creado) {
      try {
        await getDb().delete(schema.products).where(eq(schema.products.id, creado))
      } catch {
        /* limpieza best-effort */
      }
    }
    return NextResponse.json(
      { error: `Se guardaron los archivos pero falló el registro: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Usa POST para crear un producto' }, { status: 405 })
}
