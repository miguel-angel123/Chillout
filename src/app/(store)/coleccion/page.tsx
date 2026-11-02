import type { Metadata } from 'next'
import { ProductCard } from '@/components/product/product-card'
import { getAllProducts } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Colección',
  description: 'Hoodies acanalados y suéteres cuello polo tejidos en Colombia. Explora la colección completa de CHILLOUT.',
}

export default async function CollectionPage() {
  const products = await getAllProducts()

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

      <div className="mt-12 grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard key={product.slug} product={product} priority={i < 3} />
        ))}
      </div>
    </div>
  )
}
