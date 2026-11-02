import type { Metadata } from 'next'
import Link from 'next/link'
import { LookSpread } from '@/components/lookbook/look-spread'
import { getAllProducts } from '@/lib/catalog'
import { getLooks } from '@/lib/lookbook'

export const metadata: Metadata = {
  title: 'Lookbook',
  description:
    'Campaña editorial CHILLOUT: toca los puntos sobre cada fotografía para ver la prenda, su precio y comprarla.',
}

// El catálogo cambia desde el admin: el lookbook no puede congelarse.
export const dynamic = 'force-dynamic'

export default async function LookbookPage() {
  const [products, looks] = await Promise.all([getAllProducts(), Promise.resolve(getLooks())])

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Lookbook</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight text-ink">
          Compra el look
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Toca los puntos sobre cada fotografía para ver qué prenda es, cuánto cuesta y llevarla
          directo a tu carrito.
        </p>
      </header>

      <div className="mt-12 grid gap-x-6 gap-y-16 lg:grid-cols-2">
        {looks.map((look, index) => (
          <LookSpread key={look.slug} look={look} products={products} priority={index < 2} />
        ))}
      </div>

      <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-ink/10 pt-10 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] text-ink">
            ¿Quieres ver las prendas girando?
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-dark">
            Cada ficha tiene su visor 3D: gírala, cambia el color y revisa la textura.
          </p>
        </div>
        <Link
          href="/coleccion"
          className="sheen inline-flex items-center gap-3 border border-ink px-6 py-3.5 text-[11px] tracking-[0.22em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper"
        >
          Ver la colección
        </Link>
      </div>
    </div>
  )
}
