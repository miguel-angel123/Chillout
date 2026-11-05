'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

type Producto = {
  slug: string
  name: string
  subtitle: string
  description: string
  category: string
  fit: string
  fabric: string
  priceCop: number | null
  compareAtCop: number | null
  featured: boolean
  status: string
  tags: string[]
}

type Talla = { slug: string; label: string; stock: number }

const CATEGORIAS = ['hoodies', 'sueteres', 'camisetas', 'pantalones', 'accesorios']
const CALCES = ['regular', 'oversize', 'slim']
const ESTADOS: { value: string; label: string }[] = [
  { value: 'active', label: 'Publicada' },
  { value: 'draft', label: 'Borrador' },
  { value: 'archived', label: 'Archivada' },
]

const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** Edición de una prenda publicada. */
export function ProductEditForm({
  producto,
  tallas,
  tieneGlb,
}: {
  producto: Producto
  tallas: Talla[]
  tieneGlb: boolean
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState(producto.name)
  const [subtitulo, setSubtitulo] = useState(producto.subtitle)
  const [descripcion, setDescripcion] = useState(producto.description)
  const [categoria, setCategoria] = useState(producto.category)
  const [calce, setCalce] = useState(producto.fit)
  const [tejido, setTejido] = useState(producto.fabric)
  const [precio, setPrecio] = useState(producto.priceCop ? String(producto.priceCop) : '')
  const [precioComparacion, setPrecioComparacion] = useState(
    producto.compareAtCop ? String(producto.compareAtCop) : '',
  )
  const [etiquetas, setEtiquetas] = useState(producto.tags.join(', '))
  const [descuento, setDescuento] = useState('')
  const [destacado, setDestacado] = useState(producto.featured)
  const [estado, setEstado] = useState(producto.status)
  const [stocks, setStocks] = useState<Record<string, string>>(
    Object.fromEntries(tallas.map((t) => [t.slug, String(t.stock)])),
  )
  const [glb, setGlb] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState<{ glb: boolean } | null>(null)

  const inputGlb = useRef<HTMLInputElement>(null)

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)
    setGuardado(null)

    try {
      const cuerpo = new FormData()
      cuerpo.set('name', nombre)
      cuerpo.set('subtitle', subtitulo)
      cuerpo.set('description', descripcion)
      cuerpo.set('category', categoria)
      cuerpo.set('fit', calce)
      cuerpo.set('fabric', tejido)
      cuerpo.set('priceCop', precio)
      cuerpo.set('compareAtCop', precioComparacion)
      cuerpo.set('tags', etiquetas)
      cuerpo.set('featured', String(destacado))
      cuerpo.set('status', estado)
      cuerpo.set(
        'stocks',
        JSON.stringify(
          Object.fromEntries(
            Object.entries(stocks).map(([slug, valor]) => [slug, Number.parseInt(valor, 10) || 0]),
          ),
        ),
      )
      if (glb) cuerpo.set('glb', glb)

      const respuesta = await fetch(`/api/admin/productos/${producto.slug}`, {
        method: 'PATCH',
        body: cuerpo,
      })
      const datos = (await respuesta.json()) as { ok?: boolean; glb?: boolean; error?: string }

      if (!respuesta.ok) {
        setError(datos.error ?? 'No se pudo guardar')
        return
      }

      setGuardado({ glb: Boolean(datos.glb) })
      setGlb(null)
      router.refresh()
    } catch {
      setError('Error de red al guardar')
    } finally {
      setBusy(false)
    }
  }

  const precioNumero = Number.parseInt(precio || '0', 10)

  /** Rebaja real que se muestra hoy en la tienda. */
  const precioLista = Number.parseInt(precioComparacion || '0', 10)
  const precioActual = Number.parseInt(precio || '0', 10)
  const rebajaActual =
    precioLista > 0 && precioActual > 0 && precioLista > precioActual
      ? Math.round(((precioLista - precioActual) / precioLista) * 100)
      : 0

  /**
   * Aplica un descuento: el «precio antes» es la lista y el porcentaje rebaja
   * el precio final. Si no hay lista, se usa el precio actual como referencia.
   */
  function aplicarDescuento(porcentaje: number) {
    const lista = Number.parseInt(precioComparacion || '0', 10)
    const actual = Number.parseInt(precio || '0', 10)
    if (lista <= 0 && actual <= 0) return

    if (porcentaje <= 0) {
      setPrecioComparacion('')
      return
    }

    const base = lista > 0 ? lista : actual
    if (lista <= 0) setPrecioComparacion(String(base))
    setPrecio(String(Math.round(base * (1 - porcentaje / 100))))
  }

  return (
    <form onSubmit={guardar} className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
      <div className="grid gap-5">
        <Field label="Nombre">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            minLength={2}
            className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </Field>

        <Field label="Subtítulo">
          <input
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="w-full resize-y border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Categoría">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Calce">
            <select
              value={calce}
              onChange={(e) => setCalce(e.target.value)}
              className="w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
            >
              {CALCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Estado">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Precio (COP)">
            <input
              type="number"
              min={0}
              step={1000}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>

          <Field label="Precio antes (opcional)">
            <input
              type="number"
              min={0}
              step={1000}
              value={precioComparacion}
              onChange={(e) => setPrecioComparacion(e.target.value)}
              className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>
        </div>

        {/* Descuento: el gerente ajusta la rebaja de esta prenda */}
        <Field label="Descuento">
          <div className="flex flex-wrap gap-2">
            {[0, 10, 15, 20, 30].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setDescuento(pct === 0 ? '' : String(pct))
                  aplicarDescuento(pct)
                }}
                aria-pressed={rebajaActual === pct}
                className={cn(
                  'border px-3 py-2 text-[10px] tracking-[0.14em] uppercase transition-colors',
                  rebajaActual === pct
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/20 text-stone-dark hover:border-ink hover:text-ink',
                )}
              >
                {pct === 0 ? 'Sin descuento' : `−${pct}%`}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={90}
              value={descuento}
              onChange={(e) => {
                setDescuento(e.target.value)
                const pct = Number.parseInt(e.target.value, 10)
                if (Number.isFinite(pct)) aplicarDescuento(pct)
              }}
              placeholder="Otro"
              aria-label="Porcentaje de descuento"
              className="w-24 border border-ink/20 px-2.5 py-2 text-sm tabular-nums outline-none focus:border-ink"
            />
            <span className="text-[11px] text-stone">% de descuento</span>
          </div>

          {precioNumero > 0 ? (
            <p className="mt-2 text-[11px] leading-relaxed text-stone">
              Se mostrará como <span className="text-ink">$ {cop.format(precioNumero)}</span>
              {rebajaActual > 0 ? (
                <>
                  {' '}
                  · antes <span className="text-stone line-through">$ {cop.format(precioLista)}</span>{' '}
                  · <span className="text-copper">−{rebajaActual}%</span>
                </>
              ) : (
                ' · sin rebaja'
              )}
            </p>
          ) : null}
        </Field>

        <Field label="Tejido / composición">
          <input
            value={tejido}
            onChange={(e) => setTejido(e.target.value)}
            className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </Field>

        <Field label="Etiquetas">
          <input
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
            placeholder="Nuevo, Oversize, Hoodies"
            className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </Field>

        <Field label="Stock por talla">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tallas.map((talla) => (
              <label key={talla.slug} className="block">
                <span className="text-[9px] tracking-[0.18em] text-stone uppercase">
                  {talla.label}
                </span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={stocks[talla.slug] ?? '0'}
                  onChange={(e) =>
                    setStocks((prev) => ({ ...prev, [talla.slug]: e.target.value }))
                  }
                  className="mt-1 w-full border border-ink/20 px-2.5 py-2 text-sm outline-none focus:border-ink"
                />
              </label>
            ))}
          </div>
        </Field>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={destacado}
            onChange={(e) => setDestacado(e.target.checked)}
            className="size-4 accent-[#b4593a]"
          />
          <span className="text-[11px] text-stone-dark">Destacar en la página principal</span>
        </label>
      </div>

      {/* Columna lateral: modelo 3D y acciones */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="border border-ink/10 p-5">
          <p className="text-[10px] tracking-[0.22em] text-stone uppercase">Modelo 3D</p>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-dark">
            {tieneGlb ? 'Esta prenda ya tiene un GLB publicado.' : 'Esta prenda aún no tiene GLB.'}
          </p>

          <button
            type="button"
            onClick={() => inputGlb.current?.click()}
            className={cn(
              'mt-3 flex w-full items-center gap-3 border border-dashed px-3.5 py-3 text-left transition-colors',
              glb ? 'border-ink/40 bg-paper' : 'border-ink/25 hover:border-ink/50',
            )}
          >
            <Package className="size-4 shrink-0 text-stone" strokeWidth={1.6} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] text-ink">
                {glb ? glb.name : 'Reemplazar el .glb'}
              </span>
              <span className="mt-0.5 block text-[9px] tracking-[0.14em] text-stone uppercase">
                {glb ? `${(glb.size / 1024 / 1024).toFixed(1)} MB` : 'Opcional · hasta 60 MB'}
              </span>
            </span>
          </button>
          <input
            ref={inputGlb}
            type="file"
            accept=".glb,model/gltf-binary"
            className="hidden"
            onChange={(e) => {
              setGlb(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />

          <Link
            href={`/producto/${producto.slug}`}
            className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[0.18em] text-ink uppercase hover:text-copper"
          >
            Ver la ficha
            <ArrowRight className="size-3.5" strokeWidth={1.6} />
          </Link>
        </div>

        {error ? (
          <p
            className="mt-4 border border-copper/40 bg-copper/5 px-3 py-2.5 text-[12px] text-copper-deep"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {guardado ? (
          <div className="mt-4 border border-ink/15 bg-paper-dim px-4 py-3.5">
            <p className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] text-ink uppercase">
              <CheckCircle2 className="size-4 text-copper" strokeWidth={1.8} />
              Cambios guardados
            </p>
            {guardado.glb ? (
              <p className="mt-1.5 text-[11px] text-stone-dark">Modelo 3D reemplazado.</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy || nombre.length < 2}
          className="mt-5 w-full bg-ink py-3.5 text-[11px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Guardando…
            </span>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </aside>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // Un <label> que envuelve varios controles (botones, selects) rompe el nombre
  // accesible del primero. Por eso el texto va como rótulo visual y el foco se
  // resuelve con el propio control.
  return (
    <div className="block">
      <span className="text-[10px] tracking-[0.22em] text-stone uppercase">{label}</span>
      <div className="mt-2">{children}</div>
    </div>
  )
}
