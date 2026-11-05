import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Ruler, Scissors, Shirt } from 'lucide-react'
import { FitFinder } from '@/components/sizes/fit-finder'
import { cargarTallas } from '@/lib/tallas'

export const metadata: Metadata = {
  title: 'Guía de tallas',
  description:
    'Encuentra tu talla de CHILLOUT con las medidas reales de confección: contorno de pecho, largo de torso y manga. Recomendador de talla en vivo.',
}

// Las medidas se editan en la base de datos: la página no puede congelarse.
export const dynamic = 'force-dynamic'

const PASOS = [
  {
    icon: Ruler,
    title: 'Contorno de pecho',
    body: 'Rodea la parte más ancha del pecho con la cinta horizontal. Ni apretada ni floja: debe quedar pegada a la ropa interior.',
  },
  {
    icon: Shirt,
    title: 'Largo de torso',
    body: 'Del hombro, junto al cuello, hasta el bajo. En nuestras prendas el bajo cae entre cadera y primera cadera.',
  },
  {
    icon: Scissors,
    title: 'Largo de manga',
    body: 'Del hombro al puño, con el brazo un poco flexionado. Nuestras mangas son largas a propósito: se quedan en la muñeca.',
  },
] as const

export default async function GuiaDeTallasPage() {
  const tallas = await cargarTallas()

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Guía de tallas</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight text-ink">
          Tu talla, sin adivinar
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Estas son las medidas reales de nuestras prendas, tomadas en plano sobre la mesa y abiertas
          en redondo. Compáralas con una prenda que ya tengas y te quede bien: es el método más
          fiable.
        </p>
      </header>

      {/* ── Recomendador ────────────────────────────────────── */}
      <section aria-labelledby="recomendador" className="mt-12">
        <h2 id="recomendador" className="sr-only">
          Recomendador de talla
        </h2>
        <FitFinder tallas={tallas} />
      </section>

      {/* ── Tabla ───────────────────────────────────────────── */}
      <section aria-labelledby="tabla-medidas" className="mt-16">
        <h2 id="tabla-medidas" className="font-display text-[clamp(1.5rem,3vw,2.2rem)] text-ink">
          Medidas de la prenda
        </h2>
        <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-stone-dark">
          Todas las cifras son de la prenda, no del cuerpo. El contorno está abierto en redondo.
          Tolerancia de confección: ±2 cm.
        </p>

        <div className="mt-6 overflow-x-auto border border-ink/10">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <caption className="sr-only">
              Medidas de cada talla en centímetros: contorno de pecho, largo de torso y largo de
              manga.
            </caption>
            <thead>
              <tr className="border-b border-ink/10 text-[9px] tracking-[0.2em] text-stone uppercase">
                <th scope="col" className="px-4 py-3 font-normal">
                  Talla
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Contorno de pecho
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Largo de torso
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Largo de manga
                </th>
              </tr>
            </thead>
            <tbody>
              {tallas.map((talla) => (
                <tr key={talla.slug} className="border-b border-ink/5 last:border-0">
                  <th scope="row" className="px-4 py-3 text-[13px] font-medium text-ink">
                    {talla.label}
                  </th>
                  <td className="px-4 py-3 text-[13px] text-ink tabular-nums">
                    {talla.chestCm ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink tabular-nums">
                    {talla.lengthCm ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink tabular-nums">
                    {talla.sleeveCm ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-stone">Medidas en centímetros (cm).</p>
      </section>

      {/* ── Cómo medirte ────────────────────────────────────── */}
      <section aria-labelledby="como-medir" className="mt-16 border-t border-ink/10 pt-10">
        <h2 id="como-medir" className="font-display text-[clamp(1.5rem,3vw,2.2rem)] text-ink">
          Cómo medirte
        </h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {PASOS.map(({ icon: Icon, title, body }, indice) => (
            <li key={title}>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center border border-ink/20 text-[10px] text-stone tabular-nums">
                  {indice + 1}
                </span>
                <Icon className="size-4 text-copper" strokeWidth={1.5} />
              </div>
              <h3 className="mt-3 text-[12px] tracking-[0.14em] text-ink uppercase">{title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-stone-dark">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Tip de calce ────────────────────────────────────── */}
      <section className="mt-14 border border-ink/15 bg-paper-dim px-6 py-6 sm:px-8">
        <h2 className="text-[12px] tracking-[0.14em] text-ink uppercase">
          Si estás entre dos tallas
        </h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-stone-dark">
          Nuestras prendas son de caída recta y punto grueso. Si buscas el calce de las fotos, elige
          tu talla habitual. Si quieres que caiga con más holgura, sube una. Si dudas, escríbenos por
          WhatsApp y te ayudamos con tus medidas.
        </p>
      </section>

      <div className="mt-14 flex flex-col items-start justify-between gap-5 border-t border-ink/10 pt-10 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-[clamp(1.4rem,3vw,2.1rem)] text-ink">
            ¿Ya sabes tu talla?
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-dark">
            Explora la colección y revisa cada prenda en 3D antes de decidir.
          </p>
        </div>
        <Link
          href="/coleccion"
          className="sheen inline-flex items-center gap-3 bg-ink px-6 py-3.5 text-[11px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper"
        >
          Ver la colección
          <ArrowRight className="size-4" strokeWidth={1.6} />
        </Link>
      </div>
    </div>
  )
}
