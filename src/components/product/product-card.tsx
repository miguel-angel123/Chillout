import Image from 'next/image'
import Link from 'next/link'
import { Box } from 'lucide-react'
import { Price } from '@/components/product/price'
import type { ProductSummaryVM } from '@/lib/catalog'
import { cn } from '@/lib/utils'

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductSummaryVM
  priority?: boolean
  className?: string
}) {
  const primary = product.colors[0]
  // Escasez: solo cuando una talla con stock está por debajo del umbral. Un
  // producto con stock sano no dice nada; uno agotado se marca aparte.
  const tallaEscasa = primary ? (primary.lowStockSize ?? null) : null
  const agotado = primary ? primary.totalStock === 0 : false

  // Imagen de hover: la foto dedicada si existe; si no, el segundo color.
  // Así el cambio al pasar el ratón funciona en todo el catálogo, no solo en
  // los productos que traen una foto de hover.
  const hoverSource = primary?.hoverImage ?? product.colors[1]?.image ?? null

  // Rebaja real: solo si hay precio anterior mayor que el actual.
  const rebaja =
    product.priceCop !== null &&
    product.compareAtCop !== null &&
    product.compareAtCop > product.priceCop
      ? Math.round(((product.compareAtCop - product.priceCop) / product.compareAtCop) * 100)
      : null

  return (
    <article className={cn('group relative', className)}>
      <Link href={`/producto/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="card-media relative aspect-[3/4] overflow-hidden bg-paper-dim">
          {primary ? (
            <>
              <Image
                src={primary.image.url}
                alt={primary.image.alt}
                fill
                priority={priority}
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                className={cn(
                  'object-cover',
                  hoverSource && 'group-hover:scale-[1.05] group-hover:opacity-0',
                )}
              />
              {hoverSource ? (
                <Image
                  src={hoverSource.url}
                  alt={hoverSource.alt}
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                  className="scale-[1.06] object-cover opacity-0 group-hover:scale-100 group-hover:opacity-100"
                />
              ) : null}
            </>
          ) : null}

          {/* Rebaja */}
          {rebaja !== null && rebaja > 0 ? (
            <span className="absolute top-3 right-3 bg-copper px-2 py-1 text-[9px] tracking-[0.16em] text-paper uppercase tabular-nums">
              −{rebaja}%
            </span>
          ) : null}

          {/* Disponibilidad (módulo 15) */}
          {agotado ? (
            <span className="absolute top-3 left-3 bg-ink px-2 py-1 text-[9px] tracking-[0.16em] text-paper uppercase">
              Agotado
            </span>
          ) : tallaEscasa ? (
            <span className="absolute top-3 left-3 bg-paper/95 px-2 py-1 text-[9px] tracking-[0.16em] text-ink uppercase">
              Quedan {tallaEscasa.remaining} · {tallaEscasa.size}
            </span>
          ) : null}

          {/* Afordancia 3D */}
          <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1.5 text-[9px] tracking-[0.16em] text-paper uppercase opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
            <Box className="size-3" strokeWidth={1.8} />
            Ver en 3D
          </span>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="card-title inline-block truncate font-sans text-[13px] font-medium tracking-wide text-ink">
              {product.name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] tracking-wide text-stone-dark">
              {product.subtitle}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <Price
              priceLabel={product.priceLabel}
              compareAtLabel={product.compareAtLabel}
              size="sm"
              className="justify-end"
            />
          </div>
        </div>

        {/* Muestras de color */}
        <ul className="mt-3 flex items-center gap-1.5" aria-label="Colores disponibles">
          {product.colors.map((color) => (
            <li key={color.slug}>
              <span
                title={color.name}
                className="block size-3 ring-1 ring-ink/15 ring-offset-1 ring-offset-paper"
                style={{ backgroundColor: `#${color.hex}` }}
              />
              <span className="sr-only">{color.name}</span>
            </li>
          ))}
        </ul>
      </Link>
    </article>
  )
}
