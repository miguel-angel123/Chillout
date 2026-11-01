/**
 * Prepara los activos de marca: copia las 19 fotografías originales a
 * `public/media` con nombres estables, normaliza a sRGB, elimina EXIF y
 * limita el lado mayor para que Next/Image no trabaje de más.
 *
 * Se ejecuta con Node puro (sin tsx): en este entorno esbuild no puede
 * levantar su service worker por la política del sandbox.
 *
 *   node scripts/prepare-assets.mjs
 */
import { mkdir, readdir, copyFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const SOURCE_DIR = 'Chillout_imagenes'
const OUT_DIR = 'public/media/products'
const BRAND_DIR = 'public/media/brand'

/** Mapa: nombre original de WhatsApp → nombre estable en el proyecto. */
const MAP = {
  // Hoodie acanalado
  'WhatsApp Image 2026-11-01 at 4.25.09 PM (2).jpeg': 'hoodie-rib-orange-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.08 PM.jpeg': 'hoodie-rib-orange-02.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.09 PM (1).jpeg': 'hoodie-rib-black-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.08 PM (1).jpeg': 'hoodie-rib-black-02.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.09 PM.jpeg': 'hoodie-rib-green-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.08 PM (2).jpeg': 'hoodie-rib-green-02.jpg',

  // Suéter cuello polo (producto plano)
  'WhatsApp Image 2026-11-01 at 4.25.07 PM.jpeg': 'quarterzip-solid-navy-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.07 PM (1).jpeg': 'quarterzip-solid-black-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.07 PM (2).jpeg': 'quarterzip-solid-burgundy-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.08 PM (3).jpeg': 'quarterzip-solid-cream-01.jpg',

  // Suéter polo con franjas
  'WhatsApp Image 2026-11-01 at 4.25.06 PM (2).jpeg': 'quarterzip-stripe-navy-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.06 PM (3).jpeg': 'quarterzip-stripe-green-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.06 PM.jpeg': 'quarterzip-stripe-black-01.jpg',
  'WhatsApp Image 2026-11-01 at 4.25.07 PM (3).jpeg': 'quarterzip-stripe-cream-01.jpg',
}

/** Activos de marca (logo, mockups). */
const BRAND_MAP = {
  'WhatsApp Image 2026-11-01 at 4.26.43 PM.jpeg': 'chillout-logo.jpg',
  'WhatsApp Image 2026-11-01 at 4.26.44 PM.jpeg': 'mitos-cover.jpg',
}

const MAX_EDGE = 2000

async function normalize(input, output) {
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ quality: 88, mozjpeg: true, progressive: true })
    .toFile(output)
  return `${info.width}x${info.height}`
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(BRAND_DIR, { recursive: true })

  const present = new Set(await readdir(SOURCE_DIR))
  const mapped = new Set([...Object.keys(MAP), ...Object.keys(BRAND_MAP)])
  const missing = []
  let done = 0

  for (const [source, target] of Object.entries(MAP)) {
    if (!present.has(source)) {
      missing.push(source)
      continue
    }
    const dimensions = await normalize(join(SOURCE_DIR, source), join(OUT_DIR, target))
    done += 1
    console.log(`✓ ${target.padEnd(36)} ${dimensions}`)
  }

  for (const [source, target] of Object.entries(BRAND_MAP)) {
    if (!present.has(source)) {
      missing.push(source)
      continue
    }
    await copyFile(join(SOURCE_DIR, source), join(BRAND_DIR, target))
    console.log(`✓ brand/${target}`)
  }

  // Cortesía: imágenes del set que aún no están mapeadas a un producto.
  const unmapped = [...present].filter(
    (name) => !mapped.has(name) && /\.(jpe?g|png|webp)$/i.test(name),
  )
  for (const name of unmapped) {
    const safe = `extra-${parse(name).name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`
    await normalize(join(SOURCE_DIR, name), join(OUT_DIR, safe))
    console.log(`✓ ${safe} (sin mapear)`)
  }

  console.log(`\nListo: ${done} imágenes de producto normalizadas.`)
  if (missing.length) console.warn(`Faltaron ${missing.length} archivos:`, missing)
}

main().catch((err) => {
  console.error('Falló la preparación de activos:', err)
  process.exit(1)
})
