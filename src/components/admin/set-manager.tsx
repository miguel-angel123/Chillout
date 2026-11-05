'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react'

type Conjunto = {
  slug: string
  eyebrow: string
  title: string
  description: string
  productSlugs: string[]
  active: boolean
}

type Producto = { slug: string; name: string; priceCop: number | null }

const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** Alta y administración de conjuntos. */
export function SetManager({
  conjuntos,
  productos,
}: {
  conjuntos: Conjunto[]
  productos: Producto[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [eyebrow, setEyebrow] = useState('Conjunto')
  const [description, setDescription] = useState('')
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const nombrePorSlug = new Map(productos.map((p) => [p.slug, p.name]))
  const precioPorSlug = new Map(productos.map((p) => [p.slug, p.priceCop]))

  function alternar(slug: string) {
    setSeleccion((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]))
  }

  const totalSeleccion = seleccion.reduce((suma, slug) => suma + (precioPorSlug.get(slug) ?? 0), 0)

  async function crear(evento: React.FormEvent) {
    evento.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)
    setOk(null)

    try {
      const respuesta = await fetch('/api/admin/conjuntos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, eyebrow, description, productSlugs: seleccion }),
      })
      const datos = (await respuesta.json()) as { ok?: boolean; error?: string }

      if (!respuesta.ok || !datos.ok) {
        setError(datos.error ?? 'No se pudo crear el conjunto')
        return
      }

      setOk(`Conjunto «${title}» creado`)
      setTitle('')
      setDescription('')
      setSeleccion([])
      router.refresh()
    } catch {
      setError('Error de red al crear el conjunto')
    } finally {
      setBusy(false)
    }
  }

  async function actualizar(slug: string, cambios: Record<string, unknown>) {
    const respuesta = await fetch('/api/admin/conjuntos', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, ...cambios }),
    })
    if (!respuesta.ok) {
      const datos = (await respuesta.json()) as { error?: string }
      setError(datos.error ?? 'No se pudo actualizar')
      return
    }
    setError(null)
    router.refresh()
  }

  async function borrar(conjunto: Conjunto) {
    if (!window.confirm(`¿Eliminar el conjunto «${conjunto.title}»?`)) return
    await fetch(`/api/admin/conjuntos?slug=${encodeURIComponent(conjunto.slug)}`, {
      method: 'DELETE',
    })
    router.refresh()
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:gap-14">
      {/* Alta */}
      <form onSubmit={crear} className="grid content-start gap-4 border border-ink/10 p-5">
        <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Nuevo conjunto</p>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Noche en la azotea"
            required
            minLength={2}
            className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Etiqueta</span>
          <input
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            placeholder="Conjunto 03"
            className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Descripción</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Por qué estas piezas funcionan juntas."
            className="mt-1.5 w-full resize-y border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>

        <div>
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">
            Piezas ({seleccion.length})
          </span>
          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto border border-ink/10 p-2">
            {productos.map((producto) => (
              <li key={producto.slug}>
                <label className="flex items-center justify-between gap-2 text-[11px] text-stone-dark">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={seleccion.includes(producto.slug)}
                      onChange={() => alternar(producto.slug)}
                      className="size-3.5 accent-[#b4593a]"
                    />
                    {producto.name}
                  </span>
                  {producto.priceCop ? (
                    <span className="shrink-0 text-[10px] text-stone tabular-nums">
                      $ {cop.format(producto.priceCop)}
                    </span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
          {seleccion.length >= 2 ? (
            <p className="mt-1.5 text-[10px] text-stone">
              Valor combinado: <span className="text-ink">$ {cop.format(totalSeleccion)}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-[10px] text-stone">Elige al menos dos piezas.</p>
          )}
        </div>

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
          disabled={busy || title.trim().length < 2 || seleccion.length < 2}
          className="inline-flex items-center justify-center gap-2 bg-ink py-3 text-[10px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Plus className="size-4" strokeWidth={2} />
          )}
          Crear conjunto
        </button>
      </form>

      {/* Lista */}
      <div>
        <p className="text-[10px] tracking-[0.24em] text-stone uppercase">
          {conjuntos.length} {conjuntos.length === 1 ? 'conjunto' : 'conjuntos'}
        </p>

        {conjuntos.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {conjuntos.map((conjunto) => {
              const valor = conjunto.productSlugs.reduce(
                (suma, slug) => suma + (precioPorSlug.get(slug) ?? 0),
                0,
              )
              return (
                <li key={conjunto.slug} className="border border-ink/10 p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] tracking-[0.2em] text-stone uppercase">
                        {conjunto.eyebrow}
                      </p>
                      <p className="font-display text-lg text-ink">{conjunto.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-stone-dark">
                        {conjunto.productSlugs
                          .map((slug) => nombrePorSlug.get(slug) ?? slug)
                          .join(' · ')}
                      </p>
                      <p className="mt-1 text-[10px] text-stone tabular-nums">
                        {conjunto.productSlugs.length} piezas · $ {cop.format(valor)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => actualizar(conjunto.slug, { active: !conjunto.active })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper"
                        title={conjunto.active ? 'Ocultar del lookbook' : 'Mostrar en el lookbook'}
                      >
                        {conjunto.active ? (
                          <>
                            <Eye className="size-3.5" strokeWidth={1.8} />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="size-3.5" strokeWidth={1.8} />
                            Oculto
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => borrar(conjunto)}
                        aria-label={`Eliminar ${conjunto.title}`}
                        className="text-stone hover:text-copper"
                      >
                        <Trash2 className="size-4" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 border border-dashed border-ink/20 px-5 py-14 text-center text-[12px] text-stone-dark">
            No hay conjuntos. El lookbook mostrará los conjuntos semilla.
          </p>
        )}
      </div>
    </div>
  )
}
