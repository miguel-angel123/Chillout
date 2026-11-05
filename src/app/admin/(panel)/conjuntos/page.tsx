import { asc, desc } from 'drizzle-orm'
import { SetManager } from '@/components/admin/set-manager'
import { getDb, schema } from '@/db/client'

export const dynamic = 'force-dynamic'

export default async function ConjuntosPage() {
  let conjuntos: {
    slug: string
    eyebrow: string
    title: string
    description: string
    productSlugs: string[]
    active: boolean
  }[] = []
  let productos: { slug: string; name: string; priceCop: number | null }[] = []
  let dbError: string | null = null

  try {
    const db = getDb()
    const [filas, listaProductos] = await Promise.all([
      db.select().from(schema.sets).orderBy(asc(schema.sets.createdAt)),
      db
        .select({
          slug: schema.products.slug,
          name: schema.products.name,
          priceCop: schema.products.priceCop,
        })
        .from(schema.products)
        .orderBy(desc(schema.products.featured), asc(schema.products.name)),
    ])

    conjuntos = filas.map((fila) => ({
      slug: fila.slug,
      eyebrow: fila.eyebrow,
      title: fila.title,
      description: fila.description,
      productSlugs: fila.productSlugs ?? [],
      active: fila.active,
    }))
    productos = listaProductos
  } catch (error) {
    dbError = (error as Error).message
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Catálogo</p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">Conjuntos</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Combinaciones de prendas que aparecen dentro del lookbook. El cliente elige una talla y
          añade el look completo al carrito de una sola vez.
        </p>
      </div>

      {dbError ? (
        <p className="mt-6 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          Sin conexión a la base de datos: {dbError}
        </p>
      ) : null}

      <div className="mt-10">
        <SetManager conjuntos={conjuntos} productos={productos} />
      </div>
    </div>
  )
}
