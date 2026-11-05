import { cache } from 'react'
import { asc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { SEED_PRODUCTS, SEED_SIZES } from '@/db/seed-data'
import { formatCop } from '@/lib/format'

export type ProductColorVM = {
  slug: string
  name: string
  hex: string
  image: { url: string; alt: string }
  hoverImage?: { url: string; alt: string }
  /** Vistas adicionales (trasera, lateral) para la galería de la ficha. */
  extraImages: { url: string; alt: string }[]
  sizesAvailable: string[]
  totalStock: number
  lowStockSize?: { size: string; remaining: number }
}

export type ProductSummaryVM = {
  slug: string
  name: string
  subtitle: string
  line: string
  category: string
  fit: string
  /** null mientras el cliente no define precios */
  priceCop: number | null
  priceLabel: string | null
  /** Precio anterior sin formatear, para calcular el % de rebaja. */
  compareAtCop: number | null
  compareAtLabel: string | null
  tags: string[]
  featured: boolean
  colors: ProductColorVM[]
}

export type ProductDetailVM = ProductSummaryVM & {
  description: string
  fabric: string
  sizes: { slug: string; label: string; chestCm: number; lengthCm: number; sleeveCm: number }[]
}

const PLACEHOLDER = { url: '/media/placeholder.svg', alt: 'Imagen no disponible' }

/* ── Fallback: catálogo semilla en memoria ──────────────────── */

const sizeOrder = new Map(SEED_SIZES.map((s) => [s.slug, s.sortOrder]))

function summaryFromSeed(product: (typeof SEED_PRODUCTS)[number]): ProductSummaryVM {
  const colors: ProductColorVM[] = product.colors.map((variant) => {
    const entries = Object.entries(variant.stock)
    const inStock = entries
      .filter(([, stock]) => stock > 0)
      .sort((a, b) => (sizeOrder.get(a[0]) ?? 99) - (sizeOrder.get(b[0]) ?? 99))

    const low = entries.filter(([, s]) => s > 0 && s <= 3).sort((a, b) => a[1] - b[1])[0]
    const primary = variant.images[0]
    const secondary = variant.images[1]

    return {
      slug: variant.colorSlug,
      name: variant.colorSlug.replace(/-/g, ' '),
      hex: '999999',
      image: primary ? { url: primary.url, alt: primary.alt } : PLACEHOLDER,
      hoverImage: secondary ? { url: secondary.url, alt: secondary.alt } : undefined,
      extraImages: variant.images.slice(2).map((img) => ({ url: img.url, alt: img.alt })),
      sizesAvailable: inStock.map(([size]) => size.toUpperCase()),
      totalStock: entries.reduce((sum, [, n]) => sum + n, 0),
      lowStockSize: low ? { size: low[0].toUpperCase(), remaining: low[1] } : undefined,
    }
  })

  return {
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    line: product.line,
    category: product.category,
    fit: product.fit,
    priceCop: product.priceCop,
    priceLabel: product.priceCop ? formatCop(product.priceCop) : null,
    compareAtCop: product.compareAtCop ?? null,
    compareAtLabel: product.compareAtCop ? formatCop(product.compareAtCop) : null,
    tags: product.tags,
    featured: product.featured,
    colors,
  }
}

function seedSummaries(): ProductSummaryVM[] {
  return SEED_PRODUCTS.map(summaryFromSeed)
}

/* ── Ruta principal: base de datos ─────────────────────────── */

type LoadedCatalog = { summaries: ProductSummaryVM[]; details: Map<string, ProductDetailVM> }

async function loadFromDatabase(): Promise<LoadedCatalog | null> {
  try {
    const db = getDb()

    const [productRows, variantRows, mediaRows, colorRows, sizeRows] = await Promise.all([
      db.select().from(schema.products).where(eq(schema.products.status, 'active')),
      db.select().from(schema.productVariants),
      db.select().from(schema.productMedia).orderBy(asc(schema.productMedia.sortOrder)),
      db.select().from(schema.colors),
      db.select().from(schema.sizes).orderBy(asc(schema.sizes.sortOrder)),
    ])

    if (productRows.length === 0) return null

    const colorById = new Map(colorRows.map((c) => [c.id, c]))
    const sizeById = new Map(sizeRows.map((s) => [s.id, s]))
    const sizeRank = new Map(sizeRows.map((s) => [s.id, s.sortOrder]))

    const variantsByProduct = new Map<string, typeof variantRows>()
    for (const variant of variantRows) {
      const list = variantsByProduct.get(variant.productId) ?? []
      list.push(variant)
      variantsByProduct.set(variant.productId, list)
    }

    const mediaByProduct = new Map<string, typeof mediaRows>()
    for (const media of mediaRows) {
      const list = mediaByProduct.get(media.productId) ?? []
      list.push(media)
      mediaByProduct.set(media.productId, list)
    }

    const summaries: ProductSummaryVM[] = []
    const details = new Map<string, ProductDetailVM>()

    for (const product of productRows) {
      const variants = variantsByProduct.get(product.id) ?? []
      const media = mediaByProduct.get(product.id) ?? []

      // Agrupa por color conservando el orden de aparición
      const colorOrder: string[] = []
      const byColor = new Map<string, typeof variants>()
      for (const variant of variants) {
        if (!byColor.has(variant.colorId)) {
          byColor.set(variant.colorId, [])
          colorOrder.push(variant.colorId)
        }
        byColor.get(variant.colorId)!.push(variant)
      }

      const colors: ProductColorVM[] = colorOrder.map((colorId) => {
        const colorInfo = colorById.get(colorId)
        const colorVariants = byColor.get(colorId) ?? []

        const images = media.filter((m) => m.colorId === colorId)
        const fallbackImages = media.filter((m) => m.colorId === null)
        const candidates = images.length > 0 ? images : fallbackImages
        const primary = candidates[0]
        const secondary = candidates[1]

        const available = colorVariants
          .filter((v) => v.stock > 0)
          .sort((a, b) => (sizeRank.get(a.sizeId) ?? 99) - (sizeRank.get(b.sizeId) ?? 99))

        const low = colorVariants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).sort((a, b) => a.stock - b.stock)[0]

        return {
          slug: colorInfo?.slug ?? colorId,
          name: colorInfo?.name ?? 'Color',
          hex: colorInfo?.hex ?? '999999',
          image: primary ? { url: primary.url, alt: primary.alt } : PLACEHOLDER,
          hoverImage: secondary ? { url: secondary.url, alt: secondary.alt } : undefined,
          extraImages: candidates.slice(2).map((m) => ({ url: m.url, alt: m.alt })),
          sizesAvailable: available.map((v) => sizeById.get(v.sizeId)?.label ?? '?'),
          totalStock: colorVariants.reduce((sum, v) => sum + v.stock, 0),
          lowStockSize: low
            ? { size: sizeById.get(low.sizeId)?.label ?? '?', remaining: low.stock }
            : undefined,
        }
      })

      const summary: ProductSummaryVM = {
        slug: product.slug,
        name: product.name,
        subtitle: product.subtitle ?? '',
        line: product.line,
        category: product.category,
        fit: product.fit,
        priceCop: product.priceCop,
        priceLabel: product.priceCop ? formatCop(product.priceCop) : null,
        compareAtCop: product.compareAtCop ?? null,
    compareAtLabel: product.compareAtCop ? formatCop(product.compareAtCop) : null,
        tags: product.tags ?? [],
        featured: product.featured,
        colors,
      }

      summaries.push(summary)
      details.set(product.slug, {
        ...summary,
        description: product.description,
        fabric: product.fabric ?? '',
        sizes: sizeRows.map((s) => ({
          slug: s.slug,
          label: s.label,
          chestCm: s.chestCm ?? 0,
          lengthCm: s.lengthCm ?? 0,
          sleeveCm: s.sleeveCm ?? 0,
        })),
      })
    }

    return { summaries, details }
  } catch (error) {
    console.warn('[catalog] base de datos no disponible, usando semilla:', (error as Error).message)
    return null
  }
}

/** Deduplicado por request de React. */
const loadCatalog = cache(async (): Promise<LoadedCatalog> => {
  const fromDb = await loadFromDatabase()
  if (fromDb) return fromDb

  const summaries = seedSummaries()
  const details = new Map<string, ProductDetailVM>()
  for (const product of SEED_PRODUCTS) {
    const summary = summaryFromSeed(product)
    details.set(product.slug, {
      ...summary,
      description: product.description,
      fabric: product.fabric,
      sizes: SEED_SIZES.map((s) => ({ ...s })),
    })
  }
  return { summaries, details }
})

/* ── API pública ───────────────────────────────────────────── */

export async function getAllProducts(): Promise<ProductSummaryVM[]> {
  return (await loadCatalog()).summaries
}

export async function getFeaturedProducts(): Promise<ProductSummaryVM[]> {
  return (await loadCatalog()).summaries.filter((p) => p.featured)
}

export async function getProductBySlug(slug: string): Promise<ProductDetailVM | null> {
  return (await loadCatalog()).details.get(slug) ?? null
}

export async function getAllProductSlugs(): Promise<string[]> {
  return (await loadCatalog()).summaries.map((p) => p.slug)
}

export async function getAllTags(): Promise<string[]> {
  const set = new Set<string>()
  for (const product of (await loadCatalog()).summaries) {
    for (const tag of product.tags) set.add(tag)
  }
  return [...set]
}
