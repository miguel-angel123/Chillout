/**
 * Siembra el catálogo semilla en la base de datos activa.
 *
 *   pnpm db:generate   # genera las migraciones SQL
 *   pnpm db:seed       # aplica migraciones + inserta datos
 *
 * Funciona igual contra PGlite (sin credenciales) o Neon (DATABASE_URL).
 */
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { eq } from 'drizzle-orm'
import { SEED_COLLECTIONS, SEED_COLORS, SEED_PRODUCTS, SEED_SIZES } from './seed-data'
import * as schema from './schema'

// Carga .env.local / .env si existen (Node >= 20.12).
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
    break
  } catch {
    // el archivo no existe; seguimos con Modo Cero
  }
}

type SeedDb = PgliteDatabase<typeof schema>

async function main() {
  const url = process.env.DATABASE_URL

  if (!url) {
    console.log('· Modo Cero: usando PGlite en .data/chillout\n')
    const client = new PGlite(process.env.PGLITE_DIR ?? '.data/chillout')
    const db = drizzlePglite(client, { schema })

    console.log('· Aplicando migraciones…')
    await migratePglite(db, { migrationsFolder: './drizzle' })

    await seed(db)
    await client.close()
    console.log('\n✓ Catálogo sembrado en PGlite')
    return
  }

  console.log('· Conectando a Neon…')
  const { neon } = await import('@neondatabase/serverless')
  const { drizzle } = await import('drizzle-orm/neon-http')
  const sql = neon(url)
  const db = drizzle(sql, { schema })

  await seed(db as unknown as SeedDb)
  console.log('\n✓ Catálogo sembrado en Neon')
}

async function seed(db: SeedDb) {
  // Colores
  for (const [index, color] of SEED_COLORS.entries()) {
    await db
      .insert(schema.colors)
      .values({ slug: color.slug, name: color.name, hex: color.hex, sortOrder: index })
      .onConflictDoUpdate({
        target: schema.colors.slug,
        set: { name: color.name, hex: color.hex, sortOrder: index },
      })
  }

  // Tallas
  for (const size of SEED_SIZES) {
    await db
      .insert(schema.sizes)
      .values({
        slug: size.slug,
        label: size.label,
        sortOrder: size.sortOrder,
        chestCm: size.chestCm,
        lengthCm: size.lengthCm,
        sleeveCm: size.sleeveCm,
      })
      .onConflictDoUpdate({
        target: schema.sizes.slug,
        set: { label: size.label, sortOrder: size.sortOrder, chestCm: size.chestCm },
      })
  }

  const allColors = await db.select().from(schema.colors)
  const allSizes = await db.select().from(schema.sizes)
  const colorId = new Map<string, string>(allColors.map((c: { slug: string; id: string }) => [c.slug, c.id]))
  const sizeId = new Map<string, string>(allSizes.map((s: { slug: string; id: string }) => [s.slug, s.id]))

  // Productos
  for (const product of SEED_PRODUCTS) {
    await db
      .insert(schema.products)
      .values({
        slug: product.slug,
        name: product.name,
        subtitle: product.subtitle,
        description: product.description,
        line: product.line,
        category: product.category,
        fit: product.fit,
        fabric: product.fabric,
        priceCop: product.priceCop,
        compareAtCop: product.compareAtCop ?? null,
        status: 'active',
        featured: product.featured,
        tags: product.tags,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          name: product.name,
          subtitle: product.subtitle,
          description: product.description,
          priceCop: product.priceCop,
          compareAtCop: product.compareAtCop ?? null,
          status: 'active',
          featured: product.featured,
          tags: product.tags,
          updatedAt: new Date(),
        },
      })

    const [row] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, product.slug))

    if (!row) {
      console.warn(`  ! no se pudo obtener el id de ${product.slug}`)
      continue
    }

    const productId: string = row.id

    // Limpia derivados para que el seed sea idempotente
    await db.delete(schema.productVariants).where(eq(schema.productVariants.productId, productId))
    await db.delete(schema.productMedia).where(eq(schema.productMedia.productId, productId))

    for (const variantColor of product.colors) {
      const cid = colorId.get(variantColor.colorSlug)
      if (!cid) continue

      for (const [sizeSlug, stock] of Object.entries(variantColor.stock)) {
        const sid = sizeId.get(sizeSlug)
        if (!sid) continue

        await db.insert(schema.productVariants).values({
          productId,
          colorId: cid,
          sizeId: sid,
          sku: `CHL-${product.slug.toUpperCase().replace(/-/g, '')}-${variantColor.colorSlug
            .slice(0, 3)
            .toUpperCase()}-${sizeSlug.toUpperCase()}`,
          priceCop: product.priceCop,
          stock,
        })
      }

      for (const [order, image] of variantColor.images.entries()) {
        await db.insert(schema.productMedia).values({
          productId,
          colorId: cid,
          kind: image.kind,
          url: image.url,
          alt: image.alt,
          sortOrder: order,
          isEditorial: Boolean(image.isEditorial),
        })
      }
    }

    console.log(`  ✓ ${product.slug}`)
  }

  // Colecciones
  for (const [index, collection] of SEED_COLLECTIONS.entries()) {
    await db
      .insert(schema.collections)
      .values({
        slug: collection.slug,
        name: collection.name,
        description: collection.description,
        published: true,
        sortOrder: index,
      })
      .onConflictDoUpdate({
        target: schema.collections.slug,
        set: { name: collection.name, description: collection.description },
      })
  }
}

main().catch((err) => {
  console.error('Falló el seed:', err)
  process.exit(1)
})
