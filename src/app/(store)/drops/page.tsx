import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DropCountdown } from '@/components/drops/drop-countdown'
import { ProductCard } from '@/components/product/product-card'
import { Reveal } from '@/components/site/reveal'
import { getAllProducts } from '@/lib/catalog'
import { cargarDrops, proximoDrop } from '@/lib/drops'

export const metadata: Metadata = {
  title: 'Drops',
  description:
    'Cápsulas limitadas de CHILLOUT: series cortas de punto acanalado, sin reposición. Fecha de apertura y piezas disponibles.',
}

// La programación de drops vive en la base de datos cuando el administrador
// pueda crearlos: la página no puede congelarse en el build.
export const dynamic = 'force-dynamic'

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

export default async function DropsPage() {
  const [products, drops] = await Promise.all([getAllProducts(), cargarDrops()])
  const siguiente = proximoDrop(drops)
  const abierto = siguiente ? new Date(siguiente.lanzamiento).getTime() <= Date.now() : false

  const piezas = siguiente
    ? products.filter((p) => siguiente.productSlugs.includes(p.slug))
    : []

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Drops</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight text-ink">
          Series cortas
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Cápsulas de pocas piezas, teñidas en lote y sin reposición. Cuando se agotan, se cierra
          el drop.
        </p>
      </header>

      {siguiente ? (
        <>
          {/* ── Drop principal ─────────────────────────────── */}
          <Reveal className="mt-12">
            <article className="grid overflow-hidden bg-ink text-paper lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[320px] lg:min-h-[520px]">
                <Image
                  src={siguiente.imagen}
                  alt={`Drop ${siguiente.title}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent lg:bg-gradient-to-r"
                  aria-hidden
                />
              </div>

              <div className="flex flex-col justify-center gap-7 p-7 sm:p-10 lg:p-14">
                <div>
                  <p className="text-[10px] tracking-[0.32em] text-copper-bright uppercase">
                    {siguiente.eyebrow}
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(1.9rem,4.5vw,3.2rem)] leading-[1.02]">
                    {siguiente.title}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-paper/70">
                    {siguiente.description}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] tracking-[0.28em] text-paper/50 uppercase">
                    {abierto ? 'Abierto' : 'Abre el'} {formatoFecha.format(new Date(siguiente.lanzamiento))}
                  </p>
                  {abierto ? (
                    <p className="mt-3 font-display text-2xl">Disponible ahora</p>
                  ) : (
                    <DropCountdown objetivo={siguiente.lanzamiento} className="mt-3" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-paper/15 pt-6">
                  <Link
                    href={abierto ? '/coleccion' : `/coleccion?tag=${encodeURIComponent('Nuevo')}`}
                    className="sheen inline-flex items-center gap-3 bg-paper px-6 py-3.5 text-[10px] tracking-[0.22em] text-ink uppercase transition-colors hover:bg-copper hover:text-paper"
                  >
                    {abierto ? 'Comprar el drop' : 'Ver las piezas'}
                    <ArrowRight className="size-4" strokeWidth={1.5} />
                  </Link>
                  <p className="text-[10px] tracking-[0.2em] text-paper/50 uppercase tabular-nums">
                    {siguiente.unidadesPorReferencia} unidades por referencia
                  </p>
                </div>
              </div>
            </article>
          </Reveal>

          {/* ── Piezas del drop ────────────────────────────── */}
          {piezas.length > 0 ? (
            <section aria-labelledby="piezas-drop" className="mt-16">
              <div className="flex items-end justify-between gap-6">
                <h2 id="piezas-drop" className="font-display text-[clamp(1.4rem,3vw,2.2rem)] text-ink">
                  Lo que entra
                </h2>
                <Link
                  href="/coleccion"
                  className="hidden shrink-0 items-center gap-2 text-[11px] tracking-[0.2em] text-ink uppercase underline-offset-8 hover:underline sm:inline-flex"
                >
                  Ver todo
                  <ArrowRight className="size-3.5" strokeWidth={1.5} />
                </Link>
              </div>

              <div className="mt-8 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {piezas.map((product, i) => (
                  <Reveal key={product.slug} delay={i * 80}>
                    <ProductCard product={product} priority={i < 3} />
                  </Reveal>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <p className="mt-16 border border-dashed border-ink/20 px-6 py-20 text-center text-sm text-stone-dark">
          Todavía no hay drops programados.
        </p>
      )}

      {/* ── Historial ──────────────────────────────────────── */}
      {drops.length > 1 ? (
        <section aria-labelledby="drops-anteriores" className="mt-20 border-t border-ink/10 pt-10">
          <h2 id="drops-anteriores" className="text-[10px] tracking-[0.28em] text-stone uppercase">
            Drops anteriores
          </h2>
          <ul className="mt-5 divide-y divide-ink/10">
            {drops
              .filter((d) => d.slug !== siguiente?.slug)
              .map((drop) => (
                <li key={drop.slug} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                  <p className="font-display text-lg text-ink">{drop.title}</p>
                  <p className="text-[11px] tracking-[0.16em] text-stone uppercase">
                    {formatoFecha.format(new Date(drop.lanzamiento))}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
