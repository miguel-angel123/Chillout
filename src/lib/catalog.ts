import { SEED_COLORS, SEED_PRODUCTS, SEED_SIZES, type SeedProduct } from '@/db/seed-data'
import { formatCop } from '@/lib/format'

export type ProductColorVM = {
  slug: string
  name: string
  hex: string
  /** Imagen principal de ese color */
  image: { url: string; alt: string }
  /** Segunda vista (hover del catálogo, módulo 3) */
  hoverImage?: { url: string; alt: string }
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
  priceCop: number
  priceLabel: string
  compareAtLabel?: string
  tags: string[]
  featured: boolean
  colors: ProductColorVM[]
}

export type ProductDetailVM = ProductSummaryVM & {
  description: string
  fabric: string
  sizes: { slug: string; label: string; chestCm: number; lengthCm: number; sleeveCm: number }[]
  colorDetails: (ProductColorVM & { description: string })[]
}

const colorBySlug = new Map(SEED_COLORS.map((c) => [c.slug, c]))
const sizeOrder = new Map(SEED_SIZES.map((s) => [s.slug, s.sortOrder]))

function buildColors(product: SeedProduct): ProductColorVM[] {
  return product.colors.map((variantColor) => {
    const color = colorBySlug.get(variantColor.colorSlug)
    const images = variantColor.images
    const primary = images[0]
    const secondary = images[1]

    const sizesAvailable = Object.entries(variantColor.stock)
      .filter(([, stock]) => stock > 0)
      .sort((a, b) => (sizeOrder.get(a[0]) ?? 99) - (sizeOrder.get(b[0]) ?? 99))
      .map(([sizeSlug]) => sizeSlug.toUpperCase())

    const totalStock = Object.values(variantColor.stock).reduce((sum, n) => sum + n, 0)

    // Indicador de disponibilidad crítica (módulo 15): talla con 1–3 unidades
    const lowEntry = Object.entries(variantColor.stock)
      .filter(([, stock]) => stock > 0 && stock <= 3)
      .sort((a, b) => a[1] - b[1])[0]

    return {
      slug: variantColor.colorSlug,
      name: color?.name ?? variantColor.colorSlug,
      hex: color?.hex ?? '999999',
      image: {
        url: primary?.url ?? '/media/placeholder.svg',
        alt: primary?.alt ?? product.name,
      },
      hoverImage: secondary ? { url: secondary.url, alt: secondary.alt } : undefined,
      sizesAvailable,
      totalStock,
      lowStockSize: lowEntry ? { size: lowEntry[0].toUpperCase(), remaining: lowEntry[1] } : undefined,
    }
  })
}

function toSummary(product: SeedProduct): ProductSummaryVM {
  return {
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    line: product.line,
    category: product.category,
    fit: product.fit,
    priceCop: product.priceCop,
    priceLabel: formatCop(product.priceCop),
    compareAtLabel: product.compareAtCop ? formatCop(product.compareAtCop) : undefined,
    tags: product.tags,
    featured: product.featured,
    colors: buildColors(product),
  }
}

export function getAllProducts(): ProductSummaryVM[] {
  return SEED_PRODUCTS.map(toSummary)
}

export function getFeaturedProducts(): ProductSummaryVM[] {
  return getAllProducts().filter((p) => p.featured)
}

export function getProductBySlug(slug: string): ProductDetailVM | null {
  const product = SEED_PRODUCTS.find((p) => p.slug === slug)
  if (!product) return null

  const summary = toSummary(product)

  return {
    ...summary,
    description: product.description,
    fabric: product.fabric,
    sizes: SEED_SIZES.map((s) => ({
      slug: s.slug,
      label: s.label,
      chestCm: s.chestCm,
      lengthCm: s.lengthCm,
      sleeveCm: s.sleeveCm,
    })),
    colorDetails: summary.colors.map((c) => ({ ...c, description: product.description })),
  }
}

export function getAllProductSlugs(): string[] {
  return SEED_PRODUCTS.map((p) => p.slug)
}

export function getAllTags(): string[] {
  const set = new Set<string>()
  for (const p of SEED_PRODUCTS) for (const t of p.tags) set.add(t)
  return [...set]
}
