'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, Rows3, Search, X } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'
import { Reveal } from '@/components/site/reveal'
import type { ProductSummaryVM } from '@/lib/catalog'
import { cn } from '@/lib/utils'

/**
 * Catálogo interactivo.
 *
 * · Filtros rápidos por etiqueta (módulo 16): píldoras que filtran al instante.
 * · Buscador predictivo (módulo 17): resultados desde el primer carácter.
 * · Conmutador Lookbook / Tienda (módulo 18): dos densidades de cuadrícula.
 *
 * El estado vive en la URL para que un enlace compartido conserve la búsqueda,
 * pero el filtrado es local: con el catálogo ya cargado no hace falta ir al
 * servidor y la respuesta es inmediata.
 */

type View = 'lookbook' | 'tienda'

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export function CatalogView({
  products,
  tags,
  initialQuery,
  initialTag,
  initialView,
}: {
  products: ProductSummaryVM[]
  tags: string[]
  initialQuery: string
  initialTag: string
  initialView: View
}) {
  const router = useRouter()
  const params = useSearchParams()

  const [query, setQuery] = useState(initialQuery)
  const [tag, setTag] = useState(initialTag)
  const [view, setView] = useState<View>(initialView)

  function syncUrl(next: { q?: string; tag?: string; view?: View }) {
    const search = new URLSearchParams(params.toString())

    for (const [key, value] of Object.entries(next)) {
      if (!value || (key === 'view' && value === 'lookbook') || (key === 'tag' && value === 'todas')) {
        search.delete(key)
      } else {
        search.set(key, value)
      }
    }

    const queryString = search.toString()
    router.replace(queryString ? `/coleccion?${queryString}` : '/coleccion', { scroll: false })
  }

  const filtered = useMemo(() => {
    const needle = normalize(query.trim())

    return products.filter((product) => {
      if (tag !== 'todas' && !product.tags.includes(tag)) return false
      if (!needle) return true

      const haystack = normalize(
        [product.name, product.subtitle, product.category, product.fit, ...product.tags].join(' '),
      )
      return haystack.includes(needle)
    })
  }, [products, query, tag])

  const isSearching = query.trim().length > 0
  const showEmpty = filtered.length === 0

  return (
    <div>
      {/* ── Barra de control ─────────────────────────────── */}
      <div className="sticky top-[104px] z-30 -mx-4 mt-8 border-y border-ink/10 bg-paper/92 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador */}
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone"
              strokeWidth={1.6}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                syncUrl({ q: event.target.value })
              }}
              placeholder="Buscar prenda, color, tejido…"
              aria-label="Buscar en el catálogo"
              className="w-full border border-ink/20 bg-transparent py-2.5 pr-9 pl-9 text-[12px] outline-none focus:border-ink"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  syncUrl({ q: '' })
                }}
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-stone hover:text-ink"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            ) : null}
          </div>

          {/* Conmutador de vista */}
          <div className="flex items-center border border-ink/20" role="group" aria-label="Densidad del catálogo">
            <button
              type="button"
              onClick={() => {
                setView('lookbook')
                syncUrl({ view: 'lookbook' })
              }}
              aria-pressed={view === 'lookbook'}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.16em] uppercase transition-colors',
                view === 'lookbook' ? 'bg-ink text-paper' : 'text-stone-dark hover:text-ink',
              )}
            >
              <Rows3 className="size-3.5" strokeWidth={1.6} />
              Lookbook
            </button>
            <button
              type="button"
              onClick={() => {
                setView('tienda')
                syncUrl({ view: 'tienda' })
              }}
              aria-pressed={view === 'tienda'}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.16em] uppercase transition-colors',
                view === 'tienda' ? 'bg-ink text-paper' : 'text-stone-dark hover:text-ink',
              )}
            >
              <LayoutGrid className="size-3.5" strokeWidth={1.6} />
              Tienda
            </button>
          </div>

          <p className="ml-auto text-[10px] tracking-[0.16em] text-stone uppercase tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'prenda' : 'prendas'}
          </p>
        </div>

        {/* Filtros píldora */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['todas', ...tags].map((option) => {
            const active = tag === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setTag(option)
                  syncUrl({ tag: option })
                }}
                aria-pressed={active}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-[10px] tracking-[0.16em] uppercase transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/20 text-stone-dark hover:border-ink/50 hover:text-ink',
                )}
              >
                {option === 'todas' ? 'Todas' : option}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Resultados ───────────────────────────────────── */}
      {showEmpty ? (
        <div className="mt-16 border border-dashed border-ink/20 px-6 py-20 text-center">
          <p className="font-display text-xl text-ink">Sin resultados</p>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-stone-dark">
            {isSearching
              ? `No encontramos prendas para «${query.trim()}». Prueba con otro término o mira la colección completa.`
              : 'No hay prendas con esa etiqueta todavía.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setTag('todas')
              syncUrl({ q: '', tag: 'todas' })
            }}
            className="mt-6 inline-flex bg-ink px-5 py-3 text-[10px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
          >
            Ver todo el catálogo
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'mt-8 grid gap-x-5 gap-y-14',
            view === 'lookbook'
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4',
          )}
        >
          {filtered.map((product, index) => (
            <Reveal key={product.slug} delay={(index % 4) * 70}>
              <ProductCard product={product} priority={index < 4} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}
