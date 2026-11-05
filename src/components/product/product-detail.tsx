'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Box, Camera, Check, Minus, Plus } from 'lucide-react'
import { Price } from '@/components/product/price'
import { ZoomLens } from '@/components/product/zoom-lens'
import { useCart } from '@/lib/cart/store'
import type { ProductDetailVM } from '@/lib/catalog'
import { backCutoutUrl, cutoutUrl, depthUrl, modelGlbUrl } from '@/lib/3d/paths'
import { cn } from '@/lib/utils'

// El visor usa WebGL y window: solo existe en el cliente.
const ProductViewer = dynamic(
  () => import('@/components/three/product-viewer').then((m) => m.ProductViewer),
  {
    ssr: false,
    loading: () => (
      <div className="grid aspect-[3/4] w-full place-items-center bg-paper-dim">
        <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Cargando 3D…</p>
      </div>
    ),
  },
)

export function ProductDetail({ product }: { product: ProductDetailVM }) {
  const [colorSlug, setColorSlug] = useState(product.colors[0]?.slug ?? '')
  const [sizeSlug, setSizeSlug] = useState<string | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [view, setView] = useState<'foto' | '3d'>('foto')
  const addToCart = useCart((state) => state.add)

  const color = useMemo(
    () => product.colors.find((c) => c.slug === colorSlug) ?? product.colors[0],
    [product.colors, colorSlug],
  )

  const images = useMemo(() => {
    if (!color) return []
    const list = [color.image]
    if (color.hoverImage) list.push(color.hoverImage)
    for (const extra of color.extraImages) list.push(extra)
    return list
  }, [color])

  const activeImage = images[imageIndex] ?? images[0]
  const modelUrl = activeImage ? cutoutUrl(activeImage.url) : null
  const modelDepthUrl = activeImage ? depthUrl(activeImage.url) : null
  const modelBackUrl = activeImage ? backCutoutUrl(activeImage.url) : null
  // GLB publicado por el motor local (si existe, tiene prioridad sobre el volumen).
  const modelGlb = modelGlbUrl(product.slug)
  const colorHex = `#${(color?.hex ?? 'ffffff').replace('#', '')}`
  const inStockSizes = new Set(color?.sizesAvailable ?? [])
  const selectedSizeInStock = sizeSlug ? inStockSizes.has(sizeSlug.toUpperCase()) : false

  function selectColor(slug: string) {
    setColorSlug(slug)
    setImageIndex(0)
  }

  function handleAdd() {
    if (!selectedSizeInStock || !sizeSlug || !color) return

    addToCart({
      slug: product.slug,
      name: product.name,
      colorSlug: color.slug,
      colorName: color.name,
      size: sizeSlug.toUpperCase(),
      priceCop: product.priceCop,
      image: color.image.url,
    })

    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-16">
      {/* ── Galería / 3D ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-1 border border-ink/15 p-1">
          <button
            type="button"
            onClick={() => setView('foto')}
            aria-pressed={view === 'foto'}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors',
              view === 'foto' ? 'bg-ink text-paper' : 'text-stone-dark hover:text-ink',
            )}
          >
            <Camera className="size-3.5" strokeWidth={1.6} />
            Fotos
          </button>
          <button
            type="button"
            onClick={() => setView('3d')}
            disabled={!modelUrl}
            aria-pressed={view === '3d'}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors',
              view === '3d' ? 'bg-ink text-paper' : 'text-stone-dark hover:text-ink',
              !modelUrl && 'cursor-not-allowed opacity-40',
            )}
          >
            <Box className="size-3.5" strokeWidth={1.6} />
            Ver en 3D
          </button>
        </div>

        {view === '3d' && modelUrl ? (
          <ProductViewer
            imageUrl={modelUrl}
            depthUrl={modelDepthUrl}
            backImageUrl={modelBackUrl}
            glbUrl={modelGlb}
            colorHex={colorHex}
            label={`Vista 3D de ${product.name}`}
          />
        ) : (
          <div className="relative">
            {activeImage ? (
              <ZoomLens
                key={activeImage.url}
                src={activeImage.url}
                alt={activeImage.alt}
                priority
              />
            ) : null}

            <button
              type="button"
              onClick={() => setView('3d')}
              disabled={!modelUrl}
              className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-ink/85 px-3 py-1.5 text-[9px] tracking-[0.18em] text-paper uppercase backdrop-blur-sm transition-colors hover:bg-copper disabled:opacity-50"
            >
              <Box className="size-3.5" strokeWidth={1.6} />
              Abrir en 3D
            </button>
          </div>
        )}

        {images.length > 1 ? (
          <ul className="mt-3 flex gap-2">
            {images.map((img, i) => (
              <li key={img.url}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  aria-current={i === imageIndex}
                  className={cn(
                    'relative block size-16 overflow-hidden bg-paper-dim ring-1 transition-all',
                    i === imageIndex ? 'ring-ink' : 'ring-transparent hover:ring-ink/30',
                  )}
                >
                  <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ── Ficha ───────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">{product.line}</p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.9rem)] leading-tight text-ink">
          {product.name}
        </h1>
        <p className="mt-1.5 text-sm text-stone-dark">{product.subtitle}</p>

        <div className="mt-5">
          <Price
            priceLabel={product.priceLabel}
            compareAtLabel={product.compareAtLabel}
            size="lg"
          />
        </div>
        <p className="mt-1 text-[11px] text-stone">IVA incluido · Envío calculado en el checkout</p>

        {/* Color (módulo 7) */}
        <fieldset className="mt-9">
          <legend className="flex w-full items-baseline justify-between">
            <span className="text-[10px] tracking-[0.24em] text-ink uppercase">Color</span>
            <span className="text-[11px] text-stone-dark">{color?.name}</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => selectColor(c.slug)}
                aria-label={c.name}
                aria-pressed={c.slug === colorSlug}
                className={cn(
                  'relative size-9 ring-1 ring-offset-2 ring-offset-paper transition-all',
                  c.slug === colorSlug ? 'ring-ink' : 'ring-ink/20 hover:ring-ink/50',
                )}
                style={{ backgroundColor: `#${c.hex}` }}
              />
            ))}
          </div>
        </fieldset>

        {/* Talla */}
        <fieldset className="mt-8">
          <legend className="flex w-full items-baseline justify-between">
            <span className="text-[10px] tracking-[0.24em] text-ink uppercase">Talla</span>
            <a href="/talla" className="text-[11px] text-stone-dark underline underline-offset-4 hover:text-ink">
              Guía de tallas
            </a>
          </legend>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {product.sizes.map((size) => {
              const available = inStockSizes.has(size.label)
              return (
                <button
                  key={size.slug}
                  type="button"
                  disabled={!available}
                  onClick={() => setSizeSlug(size.slug)}
                  aria-pressed={sizeSlug === size.slug}
                  className={cn(
                    'relative py-3 text-[12px] tracking-[0.12em] transition-all',
                    available
                      ? sizeSlug === size.slug
                        ? 'bg-ink text-paper'
                        : 'border border-ink/20 text-ink hover:border-ink'
                      : 'cursor-not-allowed border border-ink/10 text-stone/50',
                  )}
                >
                  {size.label}
                  {!available ? (
                    <span className="absolute inset-0 grid place-items-center" aria-hidden>
                      <span className="h-px w-6 rotate-[-20deg] bg-stone/50" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          {color?.lowStockSize ? (
            <p className="mt-3 text-[11px] text-copper">
              {color.lowStockSize.remaining === 1
                ? `Solo queda 1 unidad en talla ${color.lowStockSize.size}`
                : `Solo quedan ${color.lowStockSize.remaining} unidades en talla ${color.lowStockSize.size}`}
            </p>
          ) : null}
        </fieldset>

        {/* Añadir */}
        <div className="mt-9 flex items-stretch gap-2">
          <div className="flex items-center border border-ink/20">
            <span className="grid size-12 place-items-center text-ink/40" aria-hidden>
              <Minus className="size-3.5" strokeWidth={1.6} />
            </span>
            <span className="w-8 text-center text-sm tabular-nums">1</span>
            <span className="grid size-12 place-items-center text-ink/40" aria-hidden>
              <Plus className="size-3.5" strokeWidth={1.6} />
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedSizeInStock}
            className={cn(
              'sheen flex-1 text-[11px] tracking-[0.24em] uppercase transition-colors',
              selectedSizeInStock
                ? 'bg-ink text-paper hover:bg-copper'
                : 'cursor-not-allowed bg-ink/10 text-stone',
            )}
          >
            {added ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Check className="size-4" strokeWidth={1.8} /> Añadido
              </span>
            ) : selectedSizeInStock ? (
              'Añadir al carrito'
            ) : (
              'Elige una talla'
            )}
          </button>
        </div>

        {/* Detalle */}
        <dl className="mt-10 space-y-4 border-t border-ink/10 pt-8">
          <div>
            <dt className="text-[9px] tracking-[0.24em] text-stone uppercase">Descripción</dt>
            <dd className="mt-1.5 text-[13px] leading-relaxed text-ink/80">{product.description}</dd>
          </div>
          <div>
            <dt className="text-[9px] tracking-[0.24em] text-stone uppercase">Composición</dt>
            <dd className="mt-1.5 text-[13px] text-ink/80">{product.fabric}</dd>
          </div>
          <div>
            <dt className="text-[9px] tracking-[0.24em] text-stone uppercase">Calce</dt>
            <dd className="mt-1.5 text-[13px] text-ink/80 capitalize">{product.fit}</dd>
          </div>
        </dl>

        <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
          {product.tags.map((tag) => (
            <li key={tag} className="text-[10px] tracking-[0.16em] text-stone uppercase">
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
