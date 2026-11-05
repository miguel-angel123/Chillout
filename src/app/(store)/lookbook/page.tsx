import type { Metadata } from 'next'
import Link from 'next/link'
import { LookSpread } from '@/components/lookbook/look-spread'
import { SetCard } from '@/components/sets/set-card'
import { getAllProducts } from '@/lib/catalog'
import { cargarConjuntos } from '@/lib/conjuntos'
import { getLooks } from '@/lib/lookbook'

export const metadata: Metadata = {
  title: 'Lookbook',
  description:
    'Campaña editorial CHILLOUT: toca los puntos sobre cada fotografía para ver la prenda, su precio y comprarla.',
}

// El catálogo y los conjuntos cambian desde el admin: no puede congelarse.
export const dynamic = 'force-dynamic'

export default async function LookbookPage() {
  const [products, looks, conjuntos] = await Promise.all([
    getAllProducts(),
    Promise.resolve(getLooks()),
    cargarConjuntos(),
  ])

  const porSlug = new Map(products.map((producto) => [producto.slug, producto]))
  const conjuntosCompletos = conjuntos
    .map((conjunto) => ({
      conjunto,
      piezas: conjunto.productSlugs
        .map((slug) => porSlug.get(slug))
        .filter((pieza): pieza is NonNullable<typeof pieza> => Boolean(pieza)),
    }))
    .filter((entrada) => entrada.piezas.length > 0)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Lookbook</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight text-ink">
          Compra el look
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Toca los puntos sobre cada fotografía para ver qué prenda es, cuánto cuesta y llevarla
          directo a tu carrito.
        </p>
      </header>

      <div className="mt-12 grid gap-x-6 gap-y-16 lg:grid-cols-2">
        {looks.map((look, index) => (
          <LookSpread key={look.slug} look={look} products={products} priority={index < 2} />
        ))}
      </div>

      {/* ── Conjuntos ──────────────────────────────────────── */}
      {conjuntosCompletos.length > 0 ? (
        <section id="conjuntos" aria-labelledby="titulo-conjuntos" className="mt-24 scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-10">
            <div className="max-w-2xl">
              <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Conjuntos</p>
              <h2
                id="titulo-conjuntos"
                className="mt-3 font-display text-[clamp(1.7rem,4vw,2.8rem)] leading-tight text-ink"
              >
                El look completo
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-dark">
                Piezas que ya combinan entre sí. Elige la talla una vez y añade todo el conjunto al
                carrito, sin ir prenda por prenda.
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-16">
            {conjuntosCompletos.map(({ conjunto, piezas }) => (
              <SetCard key={conjunto.slug} conjunto={conjunto} piezas={piezas} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-ink/10 pt-10 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] text-ink">
            ¿Quieres ver las prendas girando?
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-dark">
            Cada ficha tiene su visor 3D: gírala, cambia el color y revisa la textura.
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
