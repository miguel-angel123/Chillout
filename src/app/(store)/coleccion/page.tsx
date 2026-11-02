import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CatalogView } from '@/components/catalog/catalog-view'
import { getAllProducts, getAllTags } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Colección',
  description:
    'Hoodies acanalados y suéteres cuello polo tejidos en Colombia. Explora la colección completa de CHILLOUT.',
}

type SearchParams = Promise<{ q?: string; tag?: string; view?: string }>

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const [products, tags, params] = await Promise.all([getAllProducts(), getAllTags(), searchParams])

  const view = params.view === 'tienda' ? 'tienda' : 'lookbook'

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Colección</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight text-ink">
          Todo el tejido
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          {products.length} piezas · Punto acanalado de gramaje alto · Confeccionadas en Colombia.
        </p>
      </header>

      <Suspense fallback={<div className="mt-12 h-24" />}>
        <CatalogView
          products={products}
          tags={tags}
          initialQuery={params.q ?? ''}
          initialTag={params.tag ?? 'todas'}
          initialView={view}
        />
      </Suspense>
    </div>
  )
}
