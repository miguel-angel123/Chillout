import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2560],
  },
  // Paquetes con binarios nativos o WASM que no deben empaquetarse.
  serverExternalPackages: [
    '@electric-sql/pglite',
    'sharp',
    'onnxruntime-node',
    '@huggingface/transformers',
    '@imgly/background-removal-node',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
}

export default nextConfig
