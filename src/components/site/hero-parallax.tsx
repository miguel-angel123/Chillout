'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Parallax de portada (módulo 6).
 *
 * La fotografía se desplaza más lento que la página, lo que da profundidad sin
 * mover el texto. Se escribe directamente en `transform` desde un
 * requestAnimationFrame para no re-renderizar React en cada scroll.
 *
 * Con «movimiento reducido» queda totalmente estática.
 */
export function HeroParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0

    const apply = () => {
      const y = Math.min(window.scrollY, 900)
      // 18% de desplazamiento y un zoom muy leve: se nota, no distrae.
      node.style.transform = `translate3d(0, ${(y * 0.18).toFixed(2)}px, 0) scale(${(1 + y * 0.00009).toFixed(4)})`
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={ref} className="absolute inset-0 will-change-transform">
      {children}
    </div>
  )
}
