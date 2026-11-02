'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Look } from '@/lib/lookbook'
import type { ProductSummaryVM } from '@/lib/catalog'
import { cn } from '@/lib/utils'

/**
 * Lookbook "Shop the Look" (módulo 9).
 *
 * Puntos interactivos sobre la fotografía editorial: al tocar uno se abre una
 * tarjeta con la prenda, su precio y el enlace directo a la ficha.
 */
export function LookSpread({
  look,
  products,
  priority = false,
}: {
  look: Look
  products: ProductSummaryVM[]
  priority?: boolean
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  return (
    <figure className="relative">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-paper-dim sm:aspect-[3/4]">
        <Image
          src={look.image}
          alt={look.alt}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" aria-hidden />

        {look.hotspots.map((hotspot) => {
          const product = products.find((item) => item.slug === hotspot.productSlug)
          if (!product) return null

          const isOpen = openSlug === hotspot.productSlug

          return (
            <div
              key={`${look.slug}-${hotspot.productSlug}`}
              className="absolute"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            >
              <button
                type="button"
                onClick={() => setOpenSlug(isOpen ? null : hotspot.productSlug)}
                aria-expanded={isOpen}
                aria-label={`Ver ${hotspot.label}`}
                className={cn(
                  'grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-all duration-300',
                  isOpen
                    ? 'bg-copper text-paper'
                    : 'bg-paper/90 text-ink hover:bg-paper',
                )}
              >
                {isOpen ? (
                  <X className="size-3.5" strokeWidth={2} />
                ) : (
                  <Plus className="size-3.5" strokeWidth={2} />
                )}
                {!isOpen ? (
                  <span
                    className="absolute inset-0 animate-ping rounded-full bg-paper/40"
                    style={{ animationDuration: '2.6s' }}
                    aria-hidden
                  />
                ) : null}
              </button>

              {/* Tarjeta flotante */}
              <div
                className={cn(
                  'absolute left-1/2 z-20 w-56 -translate-x-1/2 transition-all duration-300',
                  isOpen
                    ? 'pointer-events-auto translate-y-2 opacity-100'
                    : 'pointer-events-none translate-y-0 opacity-0',
                )}
              >
                <div className="bg-paper p-3 shadow-xl">
                  <div className="flex gap-2.5">
                    <div className="relative size-14 shrink-0 overflow-hidden bg-paper-dim">
                      {product.colors[0] ? (
                        <Image
                          src={product.colors[0].image.url}
                          alt={product.colors[0].image.alt}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-ink">{product.name}</p>
                      <p className="mt-0.5 text-[10px] text-stone">
                        {product.priceLabel ?? 'Precio por confirmar'}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/producto/${product.slug}`}
                    className="mt-2.5 block bg-ink py-2 text-center text-[9px] tracking-[0.18em] text-paper uppercase hover:bg-copper"
                  >
                    Ver producto
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <figcaption className="mt-4">
        <p className="font-display text-lg text-ink">{look.title}</p>
        <p className="mt-1 text-[11px] tracking-[0.14em] text-stone uppercase">{look.subtitle}</p>
      </figcaption>
    </figure>
  )
}
