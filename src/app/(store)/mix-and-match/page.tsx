import type { Metadata } from 'next'
import Link from 'next/link'
import { SetCard } from '@/components/sets/set-card'
import { getAllProducts } from '@/lib/catalog'
import { getConjuntos } from '@/lib/conjuntos'

export const metadata: Metadata = {
  title: 'Conjuntos',
  description:
    'Combinaciones curadas de CHILLOUT: hoodies y suéteres de punto que funcionan juntos. Elige la talla una vez y añade el look completo.',
}

// Los conjuntos se editarán desde el panel: la página no puede congelarse.
export const dynamic = 'force-dynamic'

export default async function MixAndMatchPage() {
  const [products, conjuntos] = await Promise.all([
    getAllProducts(),
    Promise.resolve(getConjuntos()),
  ])

  const porSlug = new Map(products.map((p) => [p.slug, p]))
  const completos = conjuntos
    .map((conjunto) => ({
      conjunto,
      piezas: conjunto.productSlugs
        .map((slug) => porSlug.get(slug))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    }))
    .filter((entrada) => entrada.piezas.length > 0)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Conjuntos</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight text-ink">
          El look completo
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Piezas que ya combinan entre sí. Elige la talla una vez y añade todo el conjunto al
          carrito, sin ir prenda por prenda.
        </p>
      </header>

      {completos.length > 0 ? (
        <div className="mt-14 space-y-16">
          {completos.map(({ conjunto, piezas }) => (
            <SetCard key={conjunto.slug} conjunto={conjunto} piezas={piezas} />
          ))}
        </div>
      ) : (
        <p className="mt-16 border border-dashed border-ink/20 px-6 py-20 text-center text-sm text-stone-dark">
          Todavía no hay conjuntos publicados.
        </p>
      )}

      <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-ink/10 pt-10 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-[clamp(1.4rem,3vw,2.1rem)] text-ink">
            ¿Prefieres armarlo tú?
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-dark">
            Toda la colección está disponible por separado, con sus colores y tallas.
          </p>
        </div>
        <Link
          href="/coleccion"
          className="sheen inline-flex items-center gap-3 border border-ink px-6 py-3.5 text-[11px] tracking-[0.22em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper"
        >
          Ver la colección
        </Link>
      </div>
    </div>
  )
}
