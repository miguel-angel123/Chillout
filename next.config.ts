import type { NextConfig } from 'next'

/**
 * Cabeceras de seguridad para producción.
 *
 * La CSP es deliberadamente permisiva con `'unsafe-inline'`: Next inyecta el
 * bootstrap de hidratación en línea y el visor 3D crea blobs para texturas. Con
 * nonces habría que tocar cada script; mientras tanto, esto ya bloquea lo
 * importante (cargar scripts de terceros, incrustar el sitio en un iframe).
 */
const CABECERAS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // three.js decodifica el GLB con WebAssembly: sin 'wasm-unsafe-eval' el
      // visor queda en blanco. Es la variante acotada de 'unsafe-eval'.
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self' data: blob:",
      // El cargador de texturas del GLB las pide como blob:.
      "connect-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2560],
  },
  // Paquetes con binarios nativos que no deben empaquetarse.
  serverExternalPackages: ['@electric-sql/pglite', 'sharp'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: CABECERAS,
      },
    ]
  },
}

export default nextConfig
