'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ImageUp, Loader2, Package, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ColorOption = { slug: string; name: string; hex: string }

type Resultado = {
  ok: boolean
  slug: string
  url: string
  imagenes: number
  glb: boolean
}

const CATEGORIAS = [
  { value: 'hoodies', label: 'Hoodies' },
  { value: 'sueteres', label: 'Suéteres' },
  { value: 'camisetas', label: 'Camisetas' },
  { value: 'pantalones', label: 'Pantalones' },
  { value: 'accesorios', label: 'Accesorios' },
]

const CALCES = [
  { value: 'regular', label: 'Regular' },
  { value: 'oversize', label: 'Oversize' },
  { value: 'slim', label: 'Slim' },
]

const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/**
 * Alta de producto (panel del gerente).
 *
 * Publica una prenda completa: datos, fotos y —si la tiene— el modelo 3D en
 * GLB que venga de fuera. La primera foto es la frontal y la segunda la
 * trasera; el resto se guardan como editoriales.
 */
export function ProductForm({ colors }: { colors: ColorOption[] }) {
  const [nombre, setNombre] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('sueteres')
  const [calce, setCalce] = useState('regular')
  const [tejido, setTejido] = useState('')
  const [precio, setPrecio] = useState('')
  const [precioComparacion, setPrecioComparacion] = useState('')
  const [stock, setStock] = useState('0')
  const [etiquetas, setEtiquetas] = useState('')
  const [destacado, setDestacado] = useState(false)
  const [colorSlug, setColorSlug] = useState(colors[0]?.slug ?? '')

  const [imagenes, setImagenes] = useState<{ file: File; url: string }[]>([])
  const [glb, setGlb] = useState<File | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const inputImagenes = useRef<HTMLInputElement>(null)
  const inputGlb = useRef<HTMLInputElement>(null)

  // Liberar las previsualizaciones al desmontar
  useEffect(() => {
    return () => {
      imagenes.forEach((imagen) => URL.revokeObjectURL(imagen.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function añadirImagenes(files: FileList | null) {
    if (!files) return
    const nuevas = [...files]
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    if (nuevas.length === 0) return
    setImagenes((prev) => [...prev, ...nuevas].slice(0, 8))
    setError(null)
    if (!nombre && nuevas[0]) {
      setNombre(nuevas[0].file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
    }
  }

  function quitarImagen(indice: number) {
    setImagenes((prev) => {
      const copia = [...prev]
      const [fuera] = copia.splice(indice, 1)
      if (fuera) URL.revokeObjectURL(fuera.url)
      return copia
    })
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (busy) return
    if (imagenes.length === 0) {
      setError('Sube al menos la foto frontal de la prenda')
      return
    }

    setBusy(true)
    setError(null)
    setResultado(null)

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
      cuerpo.set('stock', stock)
      cuerpo.set('tags', etiquetas)
      cuerpo.set('featured', String(destacado))
      cuerpo.set('colorSlug', colorSlug)
      imagenes.forEach(({ file }) => cuerpo.append('imagenes', file))
      if (glb) cuerpo.set('glb', glb)

      const respuesta = await fetch('/api/admin/productos', { method: 'POST', body: cuerpo })
      const datos = (await respuesta.json()) as Resultado & { error?: string }

      if (!respuesta.ok) {
        setError(datos.error ?? 'No se pudo publicar la prenda')
        return
      }

      setResultado(datos)
      imagenes.forEach((imagen) => URL.revokeObjectURL(imagen.url))
      setImagenes([])
      setGlb(null)
      setNombre('')
      setSubtitulo('')
      setDescripcion('')
      setTejido('')
      setPrecio('')
      setPrecioComparacion('')
      setEtiquetas('')
    } catch {
      setError('Error de red durante la publicación')
    } finally {
      setBusy(false)
    }
  }

  const precioNumero = Number.parseInt(precio || '0', 10)

  return (
    <form onSubmit={enviar} className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      {/* ── Fotos y modelo ─────────────────────────────────── */}
      <div>
        <div
          onClick={() => inputImagenes.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            añadirImagenes(e.dataTransfer.files)
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputImagenes.current?.click()}
          className="cursor-pointer border border-dashed border-ink/25 bg-paper-dim px-5 py-8 text-center transition-colors hover:border-ink/50"
        >
          <ImageUp className="mx-auto size-7 text-stone" strokeWidth={1.4} />
          <p className="mt-3 text-[12px] text-ink">Arrastra las fotos de la prenda</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone">
            La primera es la frontal y la segunda la trasera. Hasta 8 imágenes.
          </p>
          <input
            ref={inputImagenes}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => {
              añadirImagenes(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {imagenes.length > 0 ? (
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {imagenes.map((imagen, indice) => {
              const rol = indice === 0 ? 'Frontal' : indice === 1 ? 'Trasera' : `Editorial ${indice - 1}`
              return (
                <li key={imagen.url} className="relative">
                  <div className="relative aspect-[3/4] overflow-hidden bg-paper-dim">
                    <Image
                      src={imagen.url}
                      alt={rol}
                      fill
                      sizes="120px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="mt-1 block truncate text-[9px] tracking-[0.14em] text-stone uppercase">
                    {rol}
                  </span>
                  <button
                    type="button"
                    onClick={() => quitarImagen(indice)}
                    aria-label={`Quitar ${rol}`}
                    className="absolute top-1 right-1 grid size-6 place-items-center bg-ink/80 text-paper"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}

        {/* GLB */}
        <div className="mt-6">
          <p className="text-[10px] tracking-[0.22em] text-stone uppercase">Modelo 3D (GLB)</p>
          <button
            type="button"
            onClick={() => inputGlb.current?.click()}
            className={cn(
              'mt-2 flex w-full items-center gap-3 border border-dashed px-4 py-3.5 text-left transition-colors',
              glb ? 'border-ink/40 bg-paper' : 'border-ink/25 hover:border-ink/50',
            )}
          >
            <Package className="size-4 shrink-0 text-stone" strokeWidth={1.6} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] text-ink">
                {glb ? glb.name : 'Adjuntar modelo .glb'}
              </span>
              <span className="mt-0.5 block text-[9px] tracking-[0.14em] text-stone uppercase">
                {glb ? `${(glb.size / 1024 / 1024).toFixed(1)} MB` : 'Opcional · hasta 60 MB'}
              </span>
            </span>
            {glb ? <CheckCircle2 className="size-4 shrink-0 text-copper" strokeWidth={1.8} /> : null}
          </button>
          {glb ? (
            <button
              type="button"
              onClick={() => setGlb(null)}
              className="mt-1.5 text-[9px] tracking-[0.14em] text-stone uppercase hover:text-ink"
            >
              Quitar modelo
            </button>
          ) : null}
          <input
            ref={inputGlb}
            type="file"
            accept=".glb,model/gltf-binary"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setGlb(file)
              e.target.value = ''
            }}
          />
          <p className="mt-2 text-[10px] leading-relaxed text-stone">
            Si subes el GLB, la ficha lo mostrará en 3D con el color del catálogo. Si no, se usará
            el visor a partir de las fotos.
          </p>
        </div>
      </div>

      {/* ── Datos ──────────────────────────────────────────── */}
      <div>
        <div className="grid gap-5">
          <Field label="Nombre de la prenda">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
              placeholder="Hoodie Acanalado"
              className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>

          <Field label="Subtítulo">
            <input
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Punto grueso · Capota"
              className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Cuéntalo en dos líneas: tejido, caída, para qué sirve."
              className="w-full resize-y border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Categoría">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
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
                  <option key={c.value} value={c.value}>
                    {c.label}
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
                placeholder="329000"
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
                placeholder="359000"
                className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
              />
            </Field>
          </div>

          {precioNumero > 0 ? (
            <p className="text-[11px] text-stone">
              Se publicará como <span className="text-ink">$ {cop.format(precioNumero)}</span>. El
              IVA se muestra incluido en la ficha.
            </p>
          ) : null}

          <Field label="Tejido / composición">
            <input
              value={tejido}
              onChange={(e) => setTejido(e.target.value)}
              placeholder="55% algodón, 45% acrílico · 580 g/m²"
              className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>

          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.slug}
                  type="button"
                  onClick={() => setColorSlug(color.slug)}
                  aria-pressed={color.slug === colorSlug}
                  title={color.name}
                  className={cn(
                    'size-9 ring-1 ring-offset-2 ring-offset-paper transition-all',
                    color.slug === colorSlug ? 'ring-ink' : 'ring-ink/20 hover:ring-ink/50',
                  )}
                  style={{ backgroundColor: `#${color.hex}` }}
                />
              ))}
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Stock por talla">
              <input
                type="number"
                min={0}
                max={999}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
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
          </div>

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

        {error ? (
          <p
            className="mt-6 border border-copper/40 bg-copper/5 px-3 py-2.5 text-[12px] text-copper-deep"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {resultado?.ok ? (
          <div className="mt-6 border border-ink/15 bg-paper-dim px-4 py-4">
            <p className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] text-ink uppercase">
              <CheckCircle2 className="size-4 text-copper" strokeWidth={1.8} />
              Prenda publicada
            </p>
            <p className="mt-2 text-[12px] text-stone-dark">
              {resultado.imagenes} {resultado.imagenes === 1 ? 'imagen' : 'imágenes'} ·{' '}
              {resultado.glb ? 'modelo 3D adjunto' : 'sin modelo 3D'}
            </p>
            <Link
              href={resultado.url}
              className="mt-3 inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-[10px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
            >
              Ver la ficha
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </Link>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy || imagenes.length === 0 || nombre.length < 2}
          className="mt-7 w-full bg-ink py-4 text-[11px] tracking-[0.24em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Publicando…
            </span>
          ) : imagenes.length === 0 ? (
            'Falta la foto frontal'
          ) : (
            'Publicar prenda'
          )}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.22em] text-stone uppercase">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}
