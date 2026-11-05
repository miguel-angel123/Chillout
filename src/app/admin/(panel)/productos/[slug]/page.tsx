import { asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ProductEditForm } from '@/components/admin/product-edit-form'
import { getDb, schema } from '@/db/client'

export const dynamic = 'force-dynamic'

export default async function EditarProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()

  const [producto] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1)

  if (!producto) notFound()

  const [tallas, variantes, modelo] = await Promise.all([
    db.select().from(schema.sizes).orderBy(asc(schema.sizes.sortOrder)),
    db
      .select({
        sizeId: schema.productVariants.sizeId,
        stock: schema.productVariants.stock,
      })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, producto.id)),
    db
      .select({ glbUrl: schema.models3d.glbUrl })
      .from(schema.models3d)
      .where(eq(schema.models3d.productId, producto.id))
      .limit(1),
  ])

  const stockPorTalla = new Map(variantes.map((v) => [v.sizeId, v.stock]))

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] text-stone uppercase hover:text-ink"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.8} />
            Productos
          </Link>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">
            {producto.name}
          </h1>
          <p className="mt-2 text-[11px] tracking-[0.1em] text-stone">/producto/{producto.slug}</p>
        </div>
      </div>

      <div className="mt-10">
        <ProductEditForm
          producto={{
            slug: producto.slug,
            name: producto.name,
            subtitle: producto.subtitle ?? '',
            description: producto.description ?? '',
            category: producto.category,
            fit: producto.fit,
            fabric: producto.fabric ?? '',
            priceCop: producto.priceCop,
            compareAtCop: producto.compareAtCop,
            featured: producto.featured,
            status: producto.status,
            tags: producto.tags ?? [],
          }}
          tallas={tallas.map((t) => ({
            slug: t.slug,
            label: t.label,
            stock: stockPorTalla.get(t.id) ?? 0,
          }))}
          tieneGlb={Boolean(modelo[0]?.glbUrl)}
        />
      </div>
    </div>
  )
}
