'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ImageUp, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ColorOption = { slug: string; name: string; hex: string }

type Result = {
  ok: boolean
  slug: string
  url: string
  assets: { photo: string; cutout: string; depth: string }
  timings: Record<string, number>
}

const CATEGORIES = [
  { value: 'hoodies', label: 'Hoodies' },
  { value: 'sueteres', label: 'Suéteres' },
  { value: 'camisetas', label: 'Camisetas' },
  { value: 'pantalones', label: 'Pantalones' },
  { value: 'accesorios', label: 'Accesorios' },
]

const FITS = [
  { value: 'regular', label: 'Regular' },
  { value: 'oversize', label: 'Oversize' },
  { value: 'slim', label: 'Slim' },
]

const STAGES = ['Normalizando la foto', 'Recortando la prenda', 'Estimando profundidad', 'Publicando']

export function StudioUploader({ colors }: { colors: ColorOption[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [sideFile, setSideFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [category, setCategory] = useState('sueteres')
  const [fit, setFit] = useState('regular')
  const [colorSlug, setColorSlug] = useState(colors[0]?.slug ?? '')
  const [stock, setStock] = useState('0')
  const [featured, setFeatured] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)
  const sideRef = useRef<HTMLInputElement>(null)

  function pickFile(next: File | null) {
    setError(null)
    setResult(null)
    if (!next) return
    if (!next.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      return
    }
    setFile(next)
    setPreview(URL.createObjectURL(next))
    if (!name) setName(next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!file || busy) return

    setBusy(true)
    setError(null)
    setResult(null)
    setStage(0)

    const advance = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4500)

    try {
      const body = new FormData()
      body.set('file', file)
      if (backFile) body.set('fileBack', backFile)
      if (sideFile) body.set('fileSide', sideFile)
      body.set('name', name)
      body.set('subtitle', subtitle)
      body.set('category', category)
      body.set('fit', fit)
      body.set('colorSlug', colorSlug)
      body.set('stock', stock)
      body.set('featured', String(featured))

      const response = await fetch('/api/admin/upload', { method: 'POST', body })
      const data = (await response.json()) as Result & { error?: string }

      if (!response.ok) {
        setError(data.error ?? 'El pipeline falló')
        return
      }

      setResult(data)
      setName('')
      setSubtitle('')
      setFile(null)
      setPreview(null)
    } catch {
      setError('Error de red durante la subida')
    } finally {
      clearInterval(advance)
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
      {/* ── Zona de carga ──────────────────────────────────── */}
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pickFile(e.dataTransfer.files?.[0] ?? null)
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={cn(
            'relative grid aspect-[3/4] cursor-pointer place-items-center overflow-hidden border border-dashed transition-colors',
            dragging ? 'border-copper bg-copper/5' : 'border-ink/25 bg-paper-dim hover:border-ink/50',
          )}
        >
          {preview ? (
            <>
              <Image src={preview} alt="Vista previa de la prenda" fill sizes="50vw" className="object-contain" unoptimized />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  setPreview(null)
                }}
                aria-label="Quitar imagen"
                className="absolute top-3 right-3 grid size-8 place-items-center bg-ink/80 text-paper"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <div className="px-8 text-center">
              <ImageUp className="mx-auto size-7 text-stone" strokeWidth={1.4} />
              <p className="mt-4 text-[12px] text-ink">Arrastra la foto de la prenda</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone">
                O haz clic para elegirla. JPG, PNG o WebP hasta 25 MB.
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-stone">
          Mejor resultado con la prenda centrada, fondo limpio y buena luz. El pipeline recorta el
          fondo, aísla la prenda y estima el volumen sin intervención.
        </p>

        {/* Las tres vistas son obligatorias: sin trasera y lateral el 3D es inventado */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ExtraSlot
            label="Vista trasera"
            hint="Obligatoria"
            file={backFile}
            inputRef={backRef}
            onPick={(f) => setBackFile(f)}
            onClear={() => setBackFile(null)}
          />
          <ExtraSlot
            label="Vista lateral"
            hint="Obligatoria"
            file={sideFile}
            inputRef={sideRef}
            onPick={(f) => setSideFile(f)}
            onClear={() => setSideFile(null)}
          />
        </div>

        {(() => {
          const missing = [
            !file ? 'frontal' : null,
            !backFile ? 'trasera' : null,
            !sideFile ? 'lateral' : null,
          ].filter(Boolean)
          if (missing.length === 0) {
            return (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-ink uppercase">
                <CheckCircle2 className="size-3.5 text-copper" strokeWidth={2} />
                Tres vistas completas
              </p>
            )
          }
          return (
            <p className="mt-3 border border-ink/15 bg-paper-dim px-3 py-2 text-[10px] leading-relaxed text-stone-dark">
              Faltan las vistas: {missing.join(', ')}. Se requieren las tres (frontal, trasera y
              lateral) para construir el 3D de la prenda real.
            </p>
          )
        })()}
      </div>

      {/* ── Formulario ─────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-5">
          <Field label="Nombre de la prenda">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Hoodie Acanalado"
              className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>

          <Field label="Subtítulo">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Punto grueso · Capota"
              className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Categoría">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Calce">
              <select
                value={fit}
                onChange={(e) => setFit(e.target.value)}
                className="w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
              >
                {FITS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

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
            <Field label="Stock inicial por talla">
              <input
                type="number"
                min={0}
                max={999}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
              />
            </Field>

            <label className="flex items-end gap-2.5 pb-2.5">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="size-4 accent-[#b4593a]"
              />
              <span className="text-[11px] text-stone-dark">
                Destacar en la página principal
              </span>
            </label>
          </div>
        </div>

        {error ? (
          <p className="mt-6 border border-copper/40 bg-copper/5 px-3 py-2.5 text-[12px] text-copper-deep" role="alert">
            {error}
          </p>
        ) : null}

        {busy ? (
          <div className="mt-6 border border-ink/15 px-4 py-3.5">
            <p className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] text-ink uppercase">
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              {STAGES[stage]}…
            </p>
            <p className="mt-1.5 text-[11px] text-stone">
              Suele tardar entre 10 y 20 segundos. No cierres esta pestaña.
            </p>
          </div>
        ) : null}

        {result?.ok ? (
          <div className="mt-6 border border-ink/15 bg-paper-dim px-4 py-4">
            <p className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] text-ink uppercase">
              <CheckCircle2 className="size-4 text-copper" strokeWidth={1.8} />
              Prenda publicada
            </p>
            <p className="mt-2 text-[12px] text-stone-dark">
              Recorte {result.timings.matte ?? 0} ms · profundidad {result.timings.depth ?? 0} ms
            </p>
            <Link
              href={result.url}
              className="mt-3 inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-[10px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
            >
              Ver la prenda en 3D
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </Link>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!file || !backFile || !sideFile || busy || name.length < 2}
          className="mt-7 w-full bg-ink py-4 text-[11px] tracking-[0.24em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy
            ? 'Procesando…'
            : !file || !backFile || !sideFile
              ? 'Faltan vistas por subir'
              : 'Generar modelo 3D y publicar'}
        </button>
      </form>
    </div>
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

/** Casilla compacta para las vistas adicionales (trasera / lateral). */
function ExtraSlot({
  label,
  hint,
  file,
  inputRef,
  onPick,
  onClear,
}: {
  label: string
  hint: string
  file: File | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (file: File | null) => void
  onClear: () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full items-center justify-between gap-2 border border-dashed px-3 py-3 text-left transition-colors',
          file ? 'border-ink/40 bg-paper' : 'border-ink/25 hover:border-ink/50',
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-[11px] text-ink">{label}</span>
          <span className="mt-0.5 block text-[9px] tracking-[0.14em] text-stone uppercase">
            {file ? file.name.slice(0, 22) : hint}
          </span>
        </span>
        {file ? <CheckCircle2 className="size-4 shrink-0 text-copper" strokeWidth={1.8} /> : null}
      </button>

      {file ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 text-[9px] tracking-[0.14em] text-stone uppercase hover:text-ink"
        >
          Quitar
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
