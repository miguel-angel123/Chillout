import { asc, desc } from 'drizzle-orm'
import { DropManager } from '@/components/admin/drop-manager'
import { getDb, schema } from '@/db/client'

export const dynamic = 'force-dynamic'

export default async function DropsPage() {
  let drops: {
    slug: string
    eyebrow: string
    title: string
    description: string
    imageUrl: string | null
    launchAt: string
    unidadesPorReferencia: number
    productSlugs: string[]
    active: boolean
  }[] = []
  let productos: { slug: string; name: string }[] = []
  let dbError: string | null = null

  try {
    const db = getDb()
    const [filas, listaProductos] = await Promise.all([
      db.select().from(schema.drops).orderBy(asc(schema.drops.launchAt)),
      db
        .select({ slug: schema.products.slug, name: schema.products.name })
        .from(schema.products)
        .orderBy(desc(schema.products.featured), asc(schema.products.name)),
    ])

    drops = filas.map((fila) => ({
      slug: fila.slug,
      eyebrow: fila.eyebrow,
      title: fila.title,
      description: fila.description,
      imageUrl: fila.imageUrl,
      launchAt: fila.launchAt.toISOString(),
      unidadesPorReferencia: fila.unidadesPorReferencia,
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
        <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Lanzamientos</p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">Drops</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Programa una cápsula con fecha de apertura y sus piezas. La página de drops muestra la
          cuenta regresiva en vivo y, al llegar la fecha, cambia sola a «Disponible ahora».
        </p>
      </div>

      {dbError ? (
        <p className="mt-6 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          Sin conexión a la base de datos: {dbError}
        </p>
      ) : null}

      <div className="mt-10">
        <DropManager drops={drops} productos={productos} />
      </div>
    </div>
  )
}
