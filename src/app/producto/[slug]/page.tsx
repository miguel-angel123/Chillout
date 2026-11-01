import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/product/product-detail'
import { getAllProductSlugs, getProductBySlug } from '@/lib/catalog'

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return getAllProductSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) return { title: 'Producto' }

  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: {
      title: `${product.name} · CHILLOUT`,
      description: product.subtitle,
      images: product.colors[0] ? [{ url: product.colors[0].image.url }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: { '@type': 'Brand', name: 'CHILLOUT' },
    category: product.category,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'COP',
      price: product.priceCop,
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD generado en servidor a partir del catálogo; no hay entrada de usuario.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} />
    </>
  )
}
