'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ProductSummaryVM } from '@/lib/catalog'
import { cn } from '@/lib/utils'

/**
 * Pasarela digital (módulo 4).
 *
 * Una prenda por vez a pantalla completa, emulando una pasarela: la pieza
 * actual se desliza hacia un lado y la siguiente entra desde el extremo
 * opuesto. Navegación con botones, flechas del teclado y deslizamiento táctil.
 */
export function Runway({ products }: { products: ProductSummaryVM[] }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const pointerStart = useRef<number | null>(null)

  const total = products.length
  const product = products[index]

  const go = useCallback(
    (next: number) => {
      if (total === 0) return
      const wrapped = (next + total) % total
      setDirection(wrapped > index || (index === total - 1 && wrapped === 0) ? 1 : -1)
      setIndex(wrapped)
    },
    [index, total],
  )

  // Teclado
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') go(index + 1)
      if (event.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  if (!product) {
    return (
      <div className="grid min-h-[70svh] place-items-center">
        <p className="text-sm text-paper/60">Todavía no hay prendas en la pasarela.</p>
      </div>
    )
  }

  const color = product.colors[0]

  return (
    <section
      aria-label="Pasarela digital"
      className="relative isolate min-h-[calc(100svh-104px)] overflow-hidden bg-ink text-paper"
      onPointerDown={(event) => {
        pointerStart.current = event.clientX
      }}
      onPointerUp={(event) => {
        if (pointerStart.current === null) return
        const delta = event.clientX - pointerStart.current
        if (Math.abs(delta) > 60) go(index + (delta < 0 ? 1 : -1))
        pointerStart.current = null
      }}
    >
      <div className="mx-auto grid min-h-[calc(100svh-104px)] max-w-[1600px] items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-0">
        {/* Ficha */}
        <div className="order-2 lg:order-1">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl text-paper tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-[11px] tracking-[0.2em] text-paper/35 tabular-nums">
              / {String(total).padStart(2, '0')}
            </span>
          </div>

          <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.02]">
            {product.name}
          </h2>
          <p className="mt-2 text-[12px] tracking-[0.18em] text-paper/50 uppercase">
            {product.subtitle}
          </p>

          <p className="mt-5 text-[13px] leading-relaxed text-paper/60">
            {color
              ? `${color.sizesAvailable.length > 0 ? `Tallas ${color.sizesAvailable.join(' · ')}` : 'Tallas agotadas'} · ${product.tags.slice(0, 2).join(' · ')}`
              : product.tags.join(' · ')}
          </p>

          <p className="mt-4 text-sm text-paper">
            {product.priceLabel ?? 'Precio por confirmar'}
            {product.compareAtLabel ? (
              <span className="ml-2 text-[11px] text-paper/40 line-through">
                {product.compareAtLabel}
              </span>
            ) : null}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/producto/${product.slug}`}
              className="sheen inline-flex items-center gap-3 bg-paper px-6 py-3.5 text-[10px] tracking-[0.22em] text-ink uppercase transition-colors hover:bg-copper hover:text-paper"
            >
              Ver producto
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Prenda anterior"
                className="grid size-11 place-items-center border border-paper/25 text-paper/70 transition-colors hover:border-paper hover:text-paper"
              >
                <ArrowLeft className="size-4" strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Prenda siguiente"
                className="grid size-11 place-items-center border border-paper/25 text-paper/70 transition-colors hover:border-paper hover:text-paper"
              >
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </button>
            </div>
          </div>

          {/* Progreso */}
          <div className="mt-8 h-px w-full max-w-sm bg-paper/15" aria-hidden>
            <div
              className="h-px bg-copper transition-[width] duration-500 ease-[var(--ease-out-expo)]"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>

          <Link
            href="/coleccion"
            className="mt-6 inline-block text-[10px] tracking-[0.2em] text-paper/45 uppercase hover:text-paper"
          >
            Ver la colección completa
          </Link>
        </div>

        {/* Imagen, con transición lateral */}
        <div className="order-1 lg:order-2">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink-700">
            {products.map((item, itemIndex) => {
              const primary = item.colors[0]
              if (!primary) return null
              const active = itemIndex === index
              return (
                <div
                  key={item.slug}
                  aria-hidden={!active}
                  className={cn(
                    'absolute inset-0 transition-[transform,opacity] duration-700 ease-[var(--ease-out-expo)]',
                    active
                      ? 'translate-x-0 opacity-100'
                      : itemIndex < index
                        ? '-translate-x-6 opacity-0'
                        : 'translate-x-6 opacity-0',
                  )}
                >
                  <Image
                    src={primary.image.url}
                    alt={primary.image.alt}
                    fill
                    priority={itemIndex === 0}
                    sizes="(max-width: 1024px) 92vw, 56vw"
                    className="object-cover"
                  />
                </div>
              )
            })}

            <span className="absolute top-4 right-4 bg-ink/70 px-2.5 py-1 text-[9px] tracking-[0.2em] text-paper uppercase backdrop-blur">
              {direction === 1 ? 'Siguiente' : 'Anterior'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
