import { z } from 'zod'
import raw from './seed.json'

/**
 * Catálogo semilla — `seed.json` es la fuente única de verdad.
 *
 * Se mantiene en JSON (y no en TypeScript) para que tanto la app como los
 * scripts de línea de comandos en Node puro puedan leerlo sin necesidad de un
 * transpilador. Aquí se valida con Zod, así un error de tipeo en el JSON falla
 * ruidosamente en lugar de propagarse silenciosamente a la base de datos.
 *
 * Los precios son opcionales a propósito: el cliente aún no los ha definido y
 * la interfaz muestra "Precio por confirmar" cuando no existen.
 */

const seedImageSchema = z.object({
  url: z.string().startsWith('/'),
  alt: z.string().min(1),
  kind: z.enum(['front', 'back', 'detail', 'editorial', 'flat']),
  isEditorial: z.boolean().optional(),
})

const seedColorVariantSchema = z.object({
  colorSlug: z.string().min(1),
  stock: z.record(z.string(), z.number().int().min(0)),
  images: z.array(seedImageSchema).min(1),
})

const seedProductSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string().min(1),
  description: z.string().min(1),
  line: z.enum(['CHILLOUT', 'MITOS']),
  category: z.string().min(1),
  fit: z.enum(['slim', 'regular', 'oversize']),
  fabric: z.string().min(1),
  priceCop: z.number().int().positive().nullable(),
  compareAtCop: z.number().int().positive().nullable(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  colors: z.array(seedColorVariantSchema).min(1),
})

const seedColorSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  hex: z.string().regex(/^[0-9A-Fa-f]{6}$/, 'hex debe ser de 6 dígitos sin #'),
})

const seedSizeSchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  sortOrder: z.number().int(),
  chestCm: z.number().int().positive(),
  lengthCm: z.number().int().positive(),
  sleeveCm: z.number().int().positive(),
})

const seedCollectionSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
})

const seedSchema = z.object({
  colors: z.array(seedColorSchema),
  sizes: z.array(seedSizeSchema),
  collections: z.array(seedCollectionSchema),
  products: z.array(seedProductSchema).min(1),
})

export const SEED = seedSchema.parse(raw)

export const SEED_COLORS = SEED.colors
export const SEED_SIZES = SEED.sizes
export const SEED_PRODUCTS = SEED.products
export const SEED_COLLECTIONS = SEED.collections

export type SeedColor = z.infer<typeof seedColorSchema>
export type SeedSize = z.infer<typeof seedSizeSchema>
export type SeedProduct = z.infer<typeof seedProductSchema>
export type SeedVariantColor = z.infer<typeof seedColorVariantSchema>
export type SeedImage = z.infer<typeof seedImageSchema>
export type SeedCollection = z.infer<typeof seedCollectionSchema>
