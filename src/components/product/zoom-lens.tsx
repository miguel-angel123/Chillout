'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Search } from 'lucide-react'

/**
 * Lupa macro (módulo 13).
 *
 * Mantener presionado sobre la fotografía amplía la zona señalada en un círculo
 * nítido. Se implementa con la misma imagen escalada y posicionada en píxeles
 * exactos, así el detalle es el real de la foto —no una interpolación— y no
 * hace falta un segundo canvas ni WebGL.
 */
export function ZoomLens({
  src,
  alt,
  priority = false,
  scale = 2.8,
}: {
  src: string
  alt: string
  priority?: boolean
  scale?: number
}) {
  const [lens, setLens] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  const LENS = 190

  function move(event: React.PointerEvent<HTMLDivElement>) {
    // Solo con el puntero presionado: en móvil evita bloquear el scroll.
    if (event.pointerType !== 'mouse' && event.buttons === 0) return

    const rect = event.currentTarget.getBoundingClientRect()
    setLens({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    })
  }

  return (
    <div
      className="relative aspect-[3/4] w-full touch-pan-y overflow-hidden bg-paper-dim"
      onPointerMove={move}
      onPointerDown={move}
      onPointerLeave={() => setLens(null)}
      onPointerUp={() => setLens(null)}
      onPointerCancel={() => setLens(null)}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 1024px) 92vw, 52vw"
        className="select-none object-cover"
        draggable={false}
      />

      {lens ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full border border-paper/70 shadow-[0_0_0_1px_rgba(10,10,10,0.25)]"
          style={{
            width: LENS,
            height: LENS,
            left: lens.x - LENS / 2,
            top: lens.y - LENS / 2,
            backgroundImage: `url("${src}")`,
            backgroundSize: `${lens.width * scale}px ${lens.height * scale}px`,
            backgroundPosition: `${-(lens.x * scale - LENS / 2)}px ${-(lens.y * scale - LENS / 2)}px`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      ) : (
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1.5 text-[9px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
          <Search className="size-3" strokeWidth={1.8} />
          Mantén presionado para ampliar
        </span>
      )}

      {/* Instrucción accesible para lectores de pantalla */}
      <span className="sr-only">
        Mantén presionado sobre la fotografía para ampliar la textura de la prenda.
      </span>
    </div>
  )
}
