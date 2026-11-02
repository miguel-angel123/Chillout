import Link from 'next/link'
import { ArrowRight, Box, Image as ImageIcon, Package } from 'lucide-react'
import { getDb, schema } from '@/db/client'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function loadStats() {
  try {
    const db = getDb()
    const [products] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products)
    const [variants] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.productVariants)
    const [media] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.productMedia)
    const [models] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.models3d)
    return {
      products: products?.n ?? 0,
      variants: variants?.n ?? 0,
      media: media?.n ?? 0,
      models: models?.n ?? 0,
      online: true as const,
    }
  } catch (error) {
    return {
      products: 0,
      variants: 0,
      media: 0,
      models: 0,
      online: false as const,
      error: (error as Error).message,
    }
  }
}

export default async function AdminHome() {
  const stats = await loadStats()

  const cards = [
    { label: 'Productos', value: stats.products, icon: Package },
    { label: 'Variantes', value: stats.variants, icon: ImageIcon },
    { label: 'Modelos 3D', value: stats.models, icon: Box },
    { label: 'Imágenes', value: stats.media, icon: ImageIcon },
  ]

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Resumen</p>
      <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">
        Estado de la tienda
      </h1>

      {!stats.online ? (
        <p className="mt-4 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          No se pudo conectar a la base de datos: {(stats as { error?: string }).error}
        </p>
      ) : null}

      <div className="mt-10 grid gap-px border border-ink/10 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-paper p-6">
            <Icon className="size-4 text-copper" strokeWidth={1.6} />
            <p className="mt-4 font-display text-4xl text-ink tabular-nums">{value}</p>
            <p className="mt-1 text-[10px] tracking-[0.2em] text-stone uppercase">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-sans text-[12px] tracking-[0.18em] text-ink uppercase">
          Acciones rápidas
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/3d-studio"
            className="group flex items-start justify-between gap-4 border border-ink/15 p-6 transition-colors hover:border-ink"
          >
            <div>
              <p className="font-display text-lg text-ink">Subir una prenda</p>
              <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-stone-dark">
                Sube la foto y el pipeline genera el recorte, la profundidad y el modelo 3D
                automáticamente.
              </p>
            </div>
            <ArrowRight
              className="mt-1 size-4 shrink-0 text-stone transition-transform group-hover:translate-x-1 group-hover:text-ink"
              strokeWidth={1.5}
            />
          </Link>

          <Link
            href="/coleccion"
            className="group flex items-start justify-between gap-4 border border-ink/15 p-6 transition-colors hover:border-ink"
          >
            <div>
              <p className="font-display text-lg text-ink">Revisar el catálogo</p>
              <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-stone-dark">
                Mira la tienda como la ve un cliente, incluida la vista 3D de cada prenda.
              </p>
            </div>
            <ArrowRight
              className="mt-1 size-4 shrink-0 text-stone transition-transform group-hover:translate-x-1 group-hover:text-ink"
              strokeWidth={1.5}
            />
          </Link>
        </div>
      </section>
    </div>
  )
}
