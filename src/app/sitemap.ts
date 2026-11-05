import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/brand'
import { getAllProductSlugs } from '@/lib/catalog'

/**
 * sitemap.xml.
 *
 * Incluye las páginas fijas y una entrada por prenda publicada. Se genera en
 * cada petición (la colección cambia desde el panel), así que un producto nuevo
 * aparece sin volver a desplegar.
 */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, '')
  const ahora = new Date()

  const fijas: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: ahora, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/coleccion`, lastModified: ahora, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/lookbook`, lastModified: ahora, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/pasarela`, lastModified: ahora, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/drops`, lastModified: ahora, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/talla`, lastModified: ahora, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/comunidad`, lastModified: ahora, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/legal/terminos`, lastModified: ahora, changeFrequency: 'yearly', priority: 0.2 },
    {
      url: `${base}/legal/privacidad`,
      lastModified: ahora,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${base}/legal/devoluciones`,
      lastModified: ahora,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]

  let productos: MetadataRoute.Sitemap = []
  try {
    const slugs = await getAllProductSlugs()
    productos = slugs.map((slug) => ({
      url: `${base}/producto/${slug}`,
      lastModified: ahora,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    productos = []
  }

  return [...fijas, ...productos]
}
