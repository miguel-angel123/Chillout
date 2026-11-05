'use client'

import { useMemo, useState } from 'react'
import { Ruler, Shirt, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { recomendarTalla, type Calce, type Talla } from '@/lib/tallas'

const CALCES: { value: Calce; label: string; ayuda: string }[] = [
  { value: 'ajustado', label: 'Ajustado', ayuda: 'Pegado al cuerpo' },
  { value: 'regular', label: 'Regular', ayuda: 'Como se ve en las fotos' },
  { value: 'holgado', label: 'Holgado', ayuda: 'Oversize, con caída' },
]

/**
 * Recomendador de talla (módulo 11).
 *
 * Pide el contorno de pecho del cuerpo y la holgura deseada; devuelve la talla
 * cuya medida de prenda lo cubre. No inventa: usa la tabla real de confección.
 */
export function FitFinder({ tallas }: { tallas: Talla[] }) {
  const [pecho, setPecho] = useState('')
  const [calce, setCalce] = useState<Calce>('regular')

  const numero = Number.parseInt(pecho, 10)
  const recomendacion = useMemo(() => {
    if (!pecho.trim()) return null
    return recomendarTalla(tallas, numero, calce)
  }, [pecho, numero, calce, tallas])

  return (
    <div className="grid gap-8 border border-ink/15 p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:gap-14">
      <div>
        <p className="inline-flex items-center gap-2 text-[10px] tracking-[0.24em] text-stone uppercase">
          <Ruler className="size-3.5" strokeWidth={1.6} />
          Tu medida
        </p>

        <label className="mt-4 block">
          <span className="text-[10px] tracking-[0.22em] text-stone uppercase">
            Contorno de pecho (cm)
          </span>
          <input
            type="number"
            min={60}
            max={180}
            value={pecho}
            onChange={(e) => setPecho(e.target.value)}
            placeholder="96"
            inputMode="numeric"
            className="mt-2 w-full border border-ink/20 px-3 py-3 text-lg tabular-nums outline-none focus:border-ink"
          />
        </label>
        <p className="mt-1.5 text-[11px] leading-relaxed text-stone">
          Mide la parte más ancha del pecho, con la cinta pegada pero sin apretar. Si dudas entre
          dos cifras, usa la mayor.
        </p>

        <div className="mt-6">
          <span className="text-[10px] tracking-[0.22em] text-stone uppercase">Cómo te gusta</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {CALCES.map((opcion) => {
              const activo = opcion.value === calce
              return (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setCalce(opcion.value)}
                  aria-pressed={activo}
                  className={cn(
                    'border px-3 py-2.5 text-left transition-colors',
                    activo
                      ? 'border-ink bg-ink text-paper'
                      : 'border-ink/20 text-stone-dark hover:border-ink hover:text-ink',
                  )}
                >
                  <span className="block text-[11px] tracking-[0.1em] uppercase">
                    {opcion.label}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-[10px]',
                      activo ? 'text-paper/60' : 'text-stone',
                    )}
                  >
                    {opcion.ayuda}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="flex flex-col justify-center border-ink/10 lg:border-l lg:pl-14">
        {!recomendacion ? (
          <div className="text-center lg:text-left">
            <Shirt className="mx-auto size-9 text-stone/50 lg:mx-0" strokeWidth={1.2} />
            <p className="mt-3 text-sm text-stone-dark">
              Escribe tu contorno de pecho y te digo la talla.
            </p>
          </div>
        ) : recomendacion.ok ? (
          <div>
            <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Tu talla</p>
            <p className="mt-2 font-display text-[clamp(3rem,9vw,4.5rem)] leading-none text-ink">
              {recomendacion.talla.label}
            </p>

            <dl className="mt-6 space-y-2 border-t border-ink/10 pt-5 text-[12px]">
              <div className="flex justify-between gap-4">
                <dt className="text-stone">Tu pecho</dt>
                <dd className="text-ink tabular-nums">{numero} cm</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone">Contorno de la prenda</dt>
                <dd className="text-ink tabular-nums">{recomendacion.contorno} cm</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone">Holgura</dt>
                <dd className="text-ink tabular-nums">+{recomendacion.holguraReal} cm</dd>
              </div>
            </dl>

            <p className="mt-4 text-[11px] leading-relaxed text-stone">
              Buscábamos unos +{recomendacion.holguraBuscada} cm de holgura para un calce{' '}
              {calce}. El contorno de la prenda ya viene medido en redondo.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Sin talla segura</p>
            <p className="mt-3 text-sm leading-relaxed text-stone-dark">{recomendacion.motivo}</p>
            <a
              href="/comunidad"
              className="mt-5 inline-flex items-center gap-2 text-[10px] tracking-[0.18em] text-ink uppercase hover:text-copper"
            >
              Escríbenos
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
