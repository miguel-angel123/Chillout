import { cn } from '@/lib/utils'

/**
 * Wordmark CHILLOUT.
 *
 * Reproduce la estructura del logotipo real: la palabra en slab serif pesada
 * dentro de un marco rectangular. El original es un JPEG raster; este wordmark
 * es la versión tipográfica fiel en pantalla. El isotipo del rinoceronte se
 * incorpora cuando llegue el vectorial oficial (pendiente con el cliente).
 */
export function BrandMark({
  className,
  size = 'md',
  showLine = false,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLine?: boolean
}) {
  const sizeClasses = {
    sm: 'text-[11px] tracking-[0.34em] px-2 py-1',
    md: 'text-sm tracking-[0.3em] px-2.5 py-1.5',
    lg: 'text-2xl tracking-[0.28em] px-4 py-2',
  } as const

  return (
    <span className={cn('inline-flex flex-col items-center gap-1', className)}>
      <span
        className={cn(
          'brand-frame text-ink',
          sizeClasses[size],
        )}
      >
        Chillout
      </span>
      {showLine ? (
        <span className="text-[9px] tracking-brand text-stone-dark uppercase">{'Mitos · Prendas tejidas'}</span>
      ) : null}
    </span>
  )
}
