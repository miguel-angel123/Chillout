import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Box, Ruler, Truck } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'
import { getFeaturedProducts } from '@/lib/catalog'

const VALUE_PROPS = [
  {
    icon: Box,
    title: 'Cada prenda en 3D',
    body: 'Gírala, cambia el color y revisa la textura antes de comprar.',
  },
  {
    icon: Ruler,
    title: 'Calce sin dudas',
    body: 'Guía de tallas con medidas reales de confección.',
  },
  {
    icon: Truck,
    title: 'Envíos a todo el país',
    body: 'Gratis desde $250.000. Despacho en 24–48 h.',
  },
] as const

export default function HomePage() {
  const featured = getFeaturedProducts()

  return (
    <>
      {/* ── Portada ─────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[86svh] items-end overflow-hidden bg-ink">
        <Image
          src="/media/products/quarterzip-stripe-black-01.jpg"
          alt="Modelo con suéter polo de franjas negro en un interior de madera"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_28%] opacity-90"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/20"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-14 sm:px-6 lg:pb-20">
          <p className="reveal text-[10px] tracking-[0.42em] text-copper-bright uppercase">
            Mitos · Prendas tejidas
          </p>
          <h1 className="reveal mt-4 max-w-3xl font-display text-[clamp(2.75rem,9vw,7rem)] leading-[0.92] text-paper">
            El punto
            <br />
            <span className="italic text-paper/90">bien hecho</span>
          </h1>
          <p className="reveal mt-6 max-w-md text-sm leading-relaxed text-paper/70">
            Tejidos de gramaje alto, confeccionados en Colombia. Piezas que abrigan de verdad y
            envejecen bien.
          </p>

          <div className="reveal mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/coleccion"
              className="sheen group inline-flex items-center gap-3 bg-paper px-7 py-4 text-[11px] tracking-[0.24em] text-ink uppercase transition-colors hover:bg-copper hover:text-paper"
            >
              Explorar colección
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
            <Link
              href="/pasarela"
              className="text-[11px] tracking-[0.24em] text-paper/70 uppercase underline-offset-8 transition-colors hover:text-paper hover:underline"
            >
              Ver pasarela digital
            </Link>
          </div>
        </div>
      </section>

      {/* ── Beneficios ──────────────────────────────────────── */}
      <section aria-label="Beneficios" className="border-b border-ink/10 bg-paper">
        <div className="mx-auto grid max-w-[1600px] gap-px px-4 py-10 sm:grid-cols-3 sm:px-6">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 py-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-copper" strokeWidth={1.4} />
              <div>
                <h2 className="font-sans text-[12px] tracking-[0.14em] text-ink uppercase">{title}</h2>
                <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-stone-dark">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Destacados ──────────────────────────────────────── */}
      <section aria-labelledby="destacados" className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Selección</p>
            <h2 id="destacados" className="mt-3 font-display text-[clamp(1.75rem,4vw,3rem)] leading-tight text-ink">
              Nueva colección
            </h2>
          </div>
          <Link
            href="/coleccion"
            className="hidden shrink-0 items-center gap-2 text-[11px] tracking-[0.2em] text-ink uppercase underline-offset-8 hover:underline sm:inline-flex"
          >
            Ver todo
            <ArrowRight className="size-3.5" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="mt-10 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product, i) => (
            <ProductCard key={product.slug} product={product} priority={i < 3} />
          ))}
        </div>
      </section>

      {/* ── Editorial: confección ───────────────────────────── */}
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="relative aspect-[4/5] overflow-hidden bg-ink-700">
            <Image
              src="/media/products/hoodie-rib-orange-01.jpg"
              alt="Detalle del punto acanalado del hoodie naranja quemado"
              fill
              sizes="(max-width: 1024px) 92vw, 46vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.32em] text-copper-bright uppercase">Confección</p>
            <h2 className="mt-4 font-display text-[clamp(1.75rem,4vw,3.25rem)] leading-[1.05]">
              Gramaje que se
              <br />
              <span className="italic">siente al tacto</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-paper/65">
              Tejemos en punto acanalado de 580 g/m² y rematamos cada pieza a mano. El resultado es
              una prenda con cuerpo propio: cae recta, no se deforma y conserva la textura lavado
              tras lavado.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-paper/15 pt-8">
              {[
                ['Gramaje', '580 g/m²'],
                ['Origen', 'Colombia'],
                ['Composición', 'Algodón · acrílico'],
                ['Acabado', 'Remate manual'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] tracking-[0.24em] text-paper/40 uppercase">{label}</dt>
                  <dd className="mt-1.5 text-sm text-paper/90">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Cierre ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-ink/10 pt-12 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.5rem)] text-ink">
              Revisa la prenda desde todos los ángulos
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-dark">
              Arrastra para girar el modelo, cambia el color en vivo y acércate a la trama del tejido.
            </p>
          </div>
          <Link
            href="/coleccion"
            className="sheen inline-flex items-center gap-3 border border-ink px-7 py-4 text-[11px] tracking-[0.24em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper"
          >
            Ir a la colección
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </>
  )
}
