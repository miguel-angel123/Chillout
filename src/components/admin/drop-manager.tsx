'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { CalendarClock, CheckCircle2, ImageUp, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Drop = {
  slug: string
  eyebrow: string
  title: string
  description: string
  imageUrl: string | null
  launchAt: string
  unidadesPorReferencia: number
  productSlugs: string[]
  active: boolean
}

type Producto = { slug: string; name: string; imageUrl: string | null }

/**
 * Convierte un ISO a valor de <input type="datetime-local"> en hora de Colombia,
 * para que el campo diga exactamente lo mismo que la fecha publicada.
 */
function aInputColombia(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const texto = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha)
  return texto.replace(' ', 'T')
}

/** Interpreta lo que el gerente escribe como hora de Colombia (UTC−5). */
function deInputColombia(valor: string): string {
  return new Date(`${valor}:00-05:00`).toISOString()
}

const formato = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
})

export function DropManager({ drops, productos }: { drops: Drop[]; productos: Producto[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [eyebrow, setEyebrow] = useState('Drop')
  const [description, setDescription] = useState('')
  const [launchAt, setLaunchAt] = useState('')
  const [unidades, setUnidades] = useState('6')
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [imagen, setImagen] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const inputImagen = useRef<HTMLInputElement>(null)

  function alternarProducto(slug: string) {
    setSeleccion((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]))
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault()
    if (busy) return
    if (!launchAt) {
      setError('Falta la fecha de apertura')
      return
    }

    setBusy(true)
    setError(null)
    setOk(null)

    try {
      const cuerpo = new FormData()
      cuerpo.set('title', title)
      cuerpo.set('eyebrow', eyebrow)
      cuerpo.set('description', description)
      cuerpo.set('launchAt', deInputColombia(launchAt))
      cuerpo.set('unidades', unidades)
      cuerpo.set('productSlugs', JSON.stringify(seleccion))
      cuerpo.set('active', 'true')
      if (imagen) cuerpo.set('imagen', imagen)

      const respuesta = await fetch('/api/admin/drops', { method: 'POST', body: cuerpo })
      const datos = (await respuesta.json()) as { ok?: boolean; error?: string }

      if (!respuesta.ok || !datos.ok) {
        setError(datos.error ?? 'No se pudo crear el drop')
        return
      }

      setOk(`Drop «${title}» creado`)
      setTitle('')
      setDescription('')
      setLaunchAt('')
      setUnidades('6')
      setSeleccion([])
      setImagen(null)
      router.refresh()
    } catch {
      setError('Error de red al crear el drop')
    } finally {
      setBusy(false)
    }
  }

  async function actualizar(slug: string, cambios: Record<string, unknown>) {
    await fetch('/api/admin/drops', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, ...cambios }),
    })
    router.refresh()
  }

  async function borrar(drop: Drop) {
    if (!window.confirm(`¿Eliminar el drop «${drop.title}»?`)) return
    await fetch(`/api/admin/drops?slug=${encodeURIComponent(drop.slug)}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:gap-14">
      {/* Alta */}
      <form onSubmit={crear} className="grid content-start gap-4 border border-ink/10 p-5">
        <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Nuevo drop</p>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Carbón nocturno"
            required
            minLength={2}
            className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Etiqueta</span>
            <input
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              placeholder="Drop 02"
              className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Unid. por ref.</span>
            <input
              type="number"
              min={1}
              max={999}
              value={unidades}
              onChange={(e) => setUnidades(e.target.value)}
              className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">
            Abre el (hora Colombia)
          </span>
          <input
            type="datetime-local"
            value={launchAt}
            onChange={(e) => setLaunchAt(e.target.value)}
            required
            className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Descripción</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Serie corta, sin reposición."
            className="mt-1.5 w-full resize-y border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>

        <div>
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Piezas del drop</span>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto border border-ink/10 p-2">
            {productos.map((producto) => {
              const dentro = seleccion.includes(producto.slug)
              return (
                <li key={producto.slug}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 p-1.5 transition-colors',
                      dentro ? 'bg-paper-dim' : 'hover:bg-paper-dim/60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={dentro}
                      onChange={() => alternarProducto(producto.slug)}
                      className="size-3.5 shrink-0 accent-[#b4593a]"
                    />
                    <span className="relative size-9 shrink-0 overflow-hidden bg-paper-dim">
                      {producto.imageUrl ? (
                        <Image
                          src={producto.imageUrl}
                          alt={producto.name}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-stone-dark">
                      {producto.name}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => inputImagen.current?.click()}
          className="flex items-center gap-2.5 border border-dashed border-ink/25 px-3 py-2.5 text-left text-[11px] text-stone hover:border-ink/50"
        >
          <ImageUp className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="min-w-0 flex-1 truncate">
            {imagen ? imagen.name : 'Imagen del drop (opcional)'}
          </span>
        </button>
        <input
          ref={inputImagen}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            setImagen(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />

        {error ? (
          <p className="border border-copper/40 bg-copper/5 px-3 py-2 text-[11px] text-copper-deep" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="inline-flex items-center gap-2 text-[11px] text-ink">
            <CheckCircle2 className="size-3.5 text-copper" strokeWidth={2} />
            {ok}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || title.trim().length < 2 || !launchAt}
          className="inline-flex items-center justify-center gap-2 bg-ink py-3 text-[10px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Plus className="size-4" strokeWidth={2} />
          )}
          Programar drop
        </button>
      </form>

      {/* Lista */}
      <div>
        <p className="text-[10px] tracking-[0.24em] text-stone uppercase">
          {drops.length} {drops.length === 1 ? 'drop programado' : 'drops programados'}
        </p>

        {drops.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {drops.map((drop) => {
              const fecha = new Date(drop.launchAt)
              const abierto = fecha.getTime() <= Date.now()
              return (
                <li key={drop.slug} className="border border-ink/10 p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {drop.imageUrl ? (
                      <div className="relative size-16 shrink-0 overflow-hidden bg-paper-dim">
                        <Image src={drop.imageUrl} alt={drop.title} fill sizes="64px" className="object-cover" />
                      </div>
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] tracking-[0.2em] text-stone uppercase">
                        {drop.eyebrow}
                      </p>
                      <p className="font-display text-lg text-ink">{drop.title}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-stone">
                        <CalendarClock className="size-3.5" strokeWidth={1.6} />
                        {formato.format(fecha)}
                      </p>
                      <p className="mt-1 text-[10px] text-stone">
                        {drop.productSlugs.length}{' '}
                        {drop.productSlugs.length === 1 ? 'pieza' : 'piezas'} ·{' '}
                        {drop.unidadesPorReferencia} unid. por referencia
                      </p>

                      {/* Miniaturas de las piezas que entran en el drop */}
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {drop.productSlugs.map((slug) => {
                          const pieza = productos.find((p) => p.slug === slug)
                          return (
                            <li key={slug} title={pieza?.name ?? slug}>
                              <span className="relative block size-10 overflow-hidden bg-paper-dim">
                                {pieza?.imageUrl ? (
                                  <Image
                                    src={pieza.imageUrl}
                                    alt={pieza.name}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <span className="grid size-full place-items-center text-[8px] text-stone">
                                    —
                                  </span>
                                )}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => actualizar(drop.slug, { active: !drop.active })}
                        className={cn(
                          'px-2.5 py-1 text-[9px] tracking-[0.16em] uppercase transition-colors',
                          drop.active
                            ? abierto
                              ? 'bg-copper text-paper hover:bg-ink'
                              : 'bg-ink text-paper hover:bg-copper'
                            : 'border border-ink/25 text-stone hover:border-ink hover:text-ink',
                        )}
                      >
                        {!drop.active ? 'Oculto' : abierto ? 'Abierto' : 'Programado'}
                      </button>
                      <button
                        type="button"
                        onClick={() => borrar(drop)}
                        aria-label={`Eliminar ${drop.title}`}
                        className="text-stone hover:text-copper"
                      >
                        <Trash2 className="size-4" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>

                  {/* Cambiar la fecha sin recrear el drop */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                    <label className="text-[9px] tracking-[0.18em] text-stone uppercase">
                      Nueva fecha
                    </label>
                    <input
                      type="datetime-local"
                      defaultValue={aInputColombia(drop.launchAt)}
                      onChange={(e) => {
                        if (!e.target.value) return
                        void actualizar(drop.slug, {
                          launchAt: deInputColombia(e.target.value),
                        })
                      }}
                      className="border border-ink/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-ink"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 border border-dashed border-ink/20 px-5 py-14 text-center text-[12px] text-stone-dark">
            No hay drops programados. La página de drops mostrará el drop semilla.
          </p>
        )}
      </div>
    </div>
  )
}
