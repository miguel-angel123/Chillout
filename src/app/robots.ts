import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/brand'

/**
 * robots.txt.
 *
 * El panel y las rutas de API quedan fuera de los buscadores: no aportan
 * tráfico y exponen información interna.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url ?? 'https://chillout.co'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/checkout', '/pedido/', '/cuenta'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
