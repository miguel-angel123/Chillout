import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2560],
  },
  // PGlite (WASM Postgres) must not be bundled by Turbopack/webpack.
  serverExternalPackages: ['@electric-sql/pglite'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
}

export default nextConfig
