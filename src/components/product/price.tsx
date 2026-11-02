import { cn } from '@/lib/utils'

/**
 * Precio en COP. Mientras el cliente no defina precios (`null`), mostramos un
 * marcador discreto en lugar de inventar una cifra.
 */
export function Price({
  priceLabel,
  compareAtLabel,
  className,
  size = 'base',
}: {
  priceLabel: string | null
  compareAtLabel?: string | null
  className?: string
  size?: 'sm' | 'base' | 'lg'
}) {
  const sizeClass = {
    sm: 'text-[13px]',
    base: 'text-[15px]',
    lg: 'text-lg',
  }[size]

  if (!priceLabel) {
    return (
      <p className={cn('tracking-[0.08em] text-stone uppercase', size === 'lg' ? 'text-[12px]' : 'text-[10px]', className)}>
        Precio por confirmar
      </p>
    )
  }

  return (
    <p className={cn('flex items-baseline gap-2', className)}>
      <span className={cn('text-ink tabular-nums', sizeClass)}>{priceLabel}</span>
      {compareAtLabel ? (
        <span className="text-[11px] text-stone line-through tabular-nums">{compareAtLabel}</span>
      ) : null}
    </p>
  )
}
