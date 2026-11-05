import { desc } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowRight, Box, Plus } from 'lucide-react'
import { getDb, schema } from '@/db/client'

export const dynamic = 'force-dynamic'

const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export default async function ProductosPage() {
  let productos: {
    slug: string
    name: string
    status: string
    priceCop: number | null
    featured: boolean
  }[] = []
  let dbError: string | null = null

  try {
    const db = getDb()
    productos = await db
      .select({
        slug: schema.products.slug,
        name: schema.products.name,
        status: schema.products.status,
        priceCop: schema.products.priceCop,
        featured: schema.products.featured,
      })
      .from(schema.products)
      .orderBy(desc(schema.products.createdAt))
  } catch (error) {
    dbError = (error as Error).message
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Catálogo</p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">Productos</h1>
          <p className="mt-3 text-sm text-stone-dark">
            {productos.length} {productos.length === 1 ? 'prenda publicada' : 'prendas publicadas'}
          </p>
        </div>

        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-2 bg-ink px-5 py-3 text-[10px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
        >
          <Plus className="size-4" strokeWidth={2} />
          Nueva prenda
        </Link>
      </div>

      {dbError ? (
        <p className="mt-6 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          Sin conexión a la base de datos: {dbError}
        </p>
      ) : null}

      {productos.length > 0 ? (
        <div className="mt-10 overflow-x-auto border border-ink/10">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/10 text-[9px] tracking-[0.2em] text-stone uppercase">
                <th className="px-4 py-3 font-normal">Prenda</th>
                <th className="px-4 py-3 font-normal">Precio</th>
                <th className="px-4 py-3 font-normal">Estado</th>
                <th className="px-4 py-3 font-normal">Portada</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.slug} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-ink">{producto.name}</p>
                    <p className="text-[10px] tracking-[0.1em] text-stone">{producto.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink tabular-nums">
                    {producto.priceCop === null ? (
                      <span className="text-stone">Por confirmar</span>
                    ) : (
                      `$ ${cop.format(producto.priceCop)}`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase">
                      <span
                        className={
                          producto.status === 'active'
                            ? 'size-1.5 rounded-full bg-copper'
                            : 'size-1.5 rounded-full bg-stone/50'
                        }
                      />
                      {producto.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-stone">
                    {producto.featured ? 'Destacada' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/producto/${producto.slug}`}
                      className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-ink uppercase hover:text-copper"
                    >
                      <Box className="size-3.5" strokeWidth={1.6} />
                      Ver
                      <ArrowRight className="size-3" strokeWidth={1.8} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-10 border border-dashed border-ink/20 px-6 py-20 text-center">
          <p className="font-display text-xl text-ink">Todavía no hay prendas</p>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-stone-dark">
            Publica la primera con fotos y su modelo 3D.
          </p>
          <Link
            href="/admin/productos/nuevo"
            className="mt-6 inline-flex bg-ink px-5 py-3 text-[10px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
          >
            Nueva prenda
          </Link>
        </div>
      )}
    </div>
  )
}
