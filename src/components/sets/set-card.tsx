'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import type { ProductSummaryVM } from '@/lib/catalog'
import type { Conjunto } from '@/lib/conjuntos'
import { useCart } from '@/lib/cart/store'
import { cn } from '@/lib/utils'

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/**
 * Tarjeta de conjunto (módulo 12).
 *
 * El conjunto se compra en una sola talla: se elige una vez y se añaden todas
 * las piezas que la tengan disponible. Si a alguna pieza le falta esa talla, se
 * avisa en vez de añadirla a escondidas.
 */
export function SetCard({ conjunto, piezas }: { conjunto: Conjunto; piezas: ProductSummaryVM[] }) {
  const add = useCart((state) => state.add)
  const [talla, setTalla] = useState<string | null>(null)
  const [añadido, setAñadido] = useState(false)

  // Tallas comunes a todas las piezas del conjunto.
  const tallas = useMemo(() => {
    if (piezas.length === 0) return []
    const conjuntos = piezas.map((p) => new Set(p.colors[0]?.sizesAvailable ?? []))
    const base = [...conjuntos[0]]
    return base.filter((t) => conjuntos.every((set) => set.has(t)))
  }, [piezas])

  const tallaActiva = talla ?? tallas[0] ?? null

  const total = useMemo(() => {
    if (piezas.some((p) => p.priceCop === null)) return null
    return piezas.reduce((suma, p) => suma + (p.priceCop ?? 0), 0)
  }, [piezas])

  const conTalla = tallaActiva
    ? piezas.filter((p) => (p.colors[0]?.sizesAvailable ?? []).includes(tallaActiva))
    : []
  const faltantes = piezas.length - conTalla.length

  function añadirConjunto() {
    if (!tallaActiva || conTalla.length === 0) return
    for (const pieza of conTalla) {
      const color = pieza.colors[0]
      if (!color) continue
      add({
        slug: pieza.slug,
        name: pieza.name,
        colorSlug: color.slug,
        colorName: color.name,
        size: tallaActiva,
        priceCop: pieza.priceCop,
        image: color.image.url,
      })
    }
    setAñadido(true)
    window.setTimeout(() => setAñadido(false), 2400)
  }

  return (
    <article className="grid gap-8 border-t border-ink/10 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      {/* Piezas */}
      <div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {piezas.map((pieza) => {
            const color = pieza.colors[0]
            return (
              <li key={pieza.slug}>
                <Link href={`/producto/${pieza.slug}`} className="group block">
                  <div className="card-media relative aspect-[3/4] overflow-hidden bg-paper-dim">
                    {color ? (
                      <Image
                        src={color.image.url}
                        alt={color.image.alt}
                        fill
                        sizes="(max-width: 640px) 45vw, 20vw"
                        className="object-cover group-hover:scale-[1.04]"
                      />
                    ) : null}
                  </div>
                  <p className="card-title mt-2.5 inline-block text-[12px] text-ink">{pieza.name}</p>
                  <p className="text-[10px] tracking-[0.12em] text-stone uppercase">
                    {pieza.priceLabel ?? 'Precio por confirmar'}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Ficha del conjunto */}
      <div className="flex flex-col justify-center">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">{conjunto.eyebrow}</p>
        <h2 className="mt-3 font-display text-[clamp(1.5rem,3.4vw,2.4rem)] leading-tight text-ink">
          {conjunto.title}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-dark">{conjunto.description}</p>

        <div className="mt-6 flex items-baseline gap-3 border-t border-ink/10 pt-5">
          <span className="text-[9px] tracking-[0.24em] text-stone uppercase">
            {piezas.length} piezas
          </span>
          <span className="ml-auto font-display text-xl text-ink tabular-nums">
            {total === null ? 'Por confirmar' : cop.format(total)}
          </span>
        </div>

        {tallas.length > 0 ? (
          <div className="mt-5">
            <p className="text-[9px] tracking-[0.24em] text-stone uppercase">Talla del conjunto</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tallas.map((opcion) => {
                const activa = opcion === tallaActiva
                return (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setTalla(opcion)}
                    aria-pressed={activa}
                    className={cn(
                      'min-w-11 border px-3 py-2 text-[11px] tracking-[0.14em] uppercase transition-colors',
                      activa
                        ? 'border-ink bg-ink text-paper'
                        : 'border-ink/25 text-stone-dark hover:border-ink hover:text-ink',
                    )}
                  >
                    {opcion}
                  </button>
                )
              })}
            </div>
            {faltantes > 0 ? (
              <p className="mt-2 text-[11px] text-stone">
                {faltantes === 1
                  ? 'Una pieza no tiene esa talla: se añadirán las demás.'
                  : `${faltantes} piezas no tienen esa talla: se añadirán las demás.`}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-[11px] text-stone">
            Las piezas de este conjunto no comparten tallas: ábrelas una a una.
          </p>
        )}

        <button
          type="button"
          onClick={añadirConjunto}
          disabled={!tallaActiva || conTalla.length === 0}
          className="sheen mt-6 inline-flex items-center justify-center gap-3 bg-ink px-6 py-4 text-[10px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-40"
        >
          {añadido ? (
            <>
              <Check className="size-4" strokeWidth={2} />
              Añadido al carrito
            </>
          ) : (
            <>
              <Plus className="size-4" strokeWidth={2} />
              Añadir el conjunto
            </>
          )}
        </button>
      </div>
    </article>
  )
}
