'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Revelado al hacer scroll (módulo 6).
 *
 * El bloque aparece cuando entra en el viewport y se queda visible: no se
 * vuelve a ocultar al subir, para que la lectura no parpadee.
 *
 * Sin JavaScript no hay animación, pero el contenido se ve igual gracias al
 * <noscript> del layout del sitio. Y con «movimiento reducido» el CSS anula la
 * transición.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  /** Retardo en ms para escalonar bloques hermanos. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Navegadores sin soporte: mostrar sin animación.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-visible={visible ? 'true' : 'false'}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
      className={cn('scroll-reveal', className)}
    >
      {children}
    </div>
  )
}
