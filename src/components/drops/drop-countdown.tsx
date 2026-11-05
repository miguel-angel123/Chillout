'use client'

import { useEffect, useState } from 'react'

type Restante = {
  dias: number
  horas: number
  minutos: number
  segundos: number
  terminado: boolean
}

function calcular(objetivo: number): Restante {
  const ms = Math.max(0, objetivo - Date.now())
  const total = Math.floor(ms / 1000)
  return {
    dias: Math.floor(total / 86400),
    horas: Math.floor((total % 86400) / 3600),
    minutos: Math.floor((total % 3600) / 60),
    segundos: total % 60,
    terminado: ms === 0,
  }
}

const dos = (n: number) => String(n).padStart(2, '0')

/**
 * Cuenta regresiva de un drop (módulo 14).
 *
 * El primer render es neutro para no romper la hidratación: el valor real se
 * calcula en el cliente y se actualiza cada segundo.
 */
export function DropCountdown({ objetivo, className }: { objetivo: string; className?: string }) {
  const target = new Date(objetivo).getTime()
  const [restante, setRestante] = useState<Restante | null>(null)

  useEffect(() => {
    setRestante(calcular(target))
    const id = window.setInterval(() => setRestante(calcular(target)), 1000)
    return () => window.clearInterval(id)
  }, [target])

  if (!restante) {
    // Espacio reservado: evita el salto de maquetación al hidratar.
    return <div className={className} aria-hidden style={{ height: '5.5rem' }} />
  }

  if (restante.terminado) {
    return (
      <p className={`text-[11px] tracking-[0.24em] uppercase ${className ?? ''}`}>
        Disponible ahora
      </p>
    )
  }

  const bloques = [
    { valor: dos(restante.dias), etiqueta: 'Días' },
    { valor: dos(restante.horas), etiqueta: 'Horas' },
    { valor: dos(restante.minutos), etiqueta: 'Min' },
    { valor: dos(restante.segundos), etiqueta: 'Seg' },
  ]

  return (
    <div className={className}>
      <div className="flex items-end gap-3 sm:gap-5" role="timer" aria-live="off">
        {bloques.map(({ valor, etiqueta }) => (
          <div key={etiqueta} className="text-center">
            <span className="block font-display text-[clamp(1.9rem,5vw,3.2rem)] leading-none tabular-nums">
              {valor}
            </span>
            <span className="mt-2 block text-[9px] tracking-[0.24em] opacity-60 uppercase">
              {etiqueta}
            </span>
          </div>
        ))}
      </div>
      <p className="sr-only">
        Faltan {restante.dias} días, {restante.horas} horas, {restante.minutos} minutos y{' '}
        {restante.segundos} segundos.
      </p>
    </div>
  )
}
