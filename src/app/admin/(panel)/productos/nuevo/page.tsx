import { asc } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductForm } from '@/components/admin/product-form'
import { getDb, schema } from '@/db/client'

export const dynamic = 'force-dynamic'

export default async function NuevoProductoPage() {
  let colors: { slug: string; name: string; hex: string }[] = []
  let dbError: string | null = null

  try {
    const db = getDb()
    colors = await db
      .select({ slug: schema.colors.slug, name: schema.colors.name, hex: schema.colors.hex })
      .from(schema.colors)
      .orderBy(asc(schema.colors.sortOrder))
  } catch (error) {
    dbError = (error as Error).message
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Productos</p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">Nueva prenda</h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-dark">
            Publica la prenda con sus fotos y, si la tienes, el modelo 3D en GLB. Aparece al
            instante en la colección, en la portada si la destacas, y en los conjuntos que la
            incluyan.
          </p>
        </div>
        <Link
          href="/admin/productos"
          className="inline-flex items-center gap-2 border border-ink px-4 py-2.5 text-[10px] tracking-[0.2em] text-ink uppercase hover:bg-ink hover:text-paper"
        >
          Ver productos
          <ArrowRight className="size-3.5" strokeWidth={1.6} />
        </Link>
      </div>

      {dbError ? (
        <p className="mt-6 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          Sin conexión a la base de datos: {dbError}. La prenda no se podrá guardar.
        </p>
      ) : null}

      <div className="mt-12">
        <ProductForm colors={colors} />
      </div>
    </div>
  )
}
