import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

/**
 * Pipeline foto → activos del visor 3D.
 *
 * El gerente envía la vista frontal y la trasera; las imágenes son del producto
 * sobre fondo limpio (con su propio gancho), así que aquí solo se recorta el
 * fondo: no hay detección de personas ni clasificación de prendas.
 *
 * Produce, por vista, un PNG con transparencia, y calcula el mapa de
 * profundidad del frente, que es el que da volumen a la malla.
 */

export type PipelineViews = {
  front: Buffer
  back: Buffer
}

export type PipelineStage = 'ingest' | 'cutout' | 'depth' | 'done'

export type PipelineResult = {
  slug: string
  photoUrl: string
  cutoutUrl: string
  backPhotoUrl: string
  backCutoutUrl: string
  depthUrl: string
  width: number
  height: number
  timings: Partial<Record<PipelineStage, number>>
}

const MEDIA_ROOT = 'public/media'
const MAX_EDGE = 2000
const DEPTH_MODEL = 'onnx-community/depth-anything-v2-small'

let depthEstimator: Promise<unknown> | null = null

async function getDepthEstimator() {
  if (!depthEstimator) {
    depthEstimator = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return pipeline('depth-estimation', DEPTH_MODEL, { dtype: 'fp32' })
    })()
  }
  return depthEstimator
}

async function ensureDirs() {
  await Promise.all([
    mkdir(join(MEDIA_ROOT, 'products'), { recursive: true }),
    mkdir(join(MEDIA_ROOT, 'cutouts'), { recursive: true }),
    mkdir(join(MEDIA_ROOT, 'depth'), { recursive: true }),
  ])
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Normaliza la foto original: sRGB, sin EXIF, lado mayor 2000 px. */
async function normalize(input: Buffer, targetPath: string): Promise<Buffer> {
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ quality: 90, mozjpeg: true, progressive: true })
    .toBuffer()
  await writeFile(targetPath, buffer)
  return buffer
}

/** Recorta el fondo. El gancho de la foto queda incluido: es parte del producto. */
async function cutout(normalizedJpeg: Buffer): Promise<Buffer> {
  const { removeBackground } = await import('@imgly/background-removal-node')
  const blob = new Blob([new Uint8Array(normalizedJpeg)], { type: 'image/jpeg' })
  const matte = await removeBackground(blob, { model: 'medium', output: { format: 'image/png' } })

  return sharp(Buffer.from(await matte.arrayBuffer()))
    .trim({ threshold: 1 })
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function depthMap(cutoutPath: string, targetPath: string) {
  const estimator = (await getDepthEstimator()) as (input: string) => Promise<{
    depth?: { data: Float32Array; width: number; height: number }
  }>

  const output = await estimator(cutoutPath)
  const map = output?.depth
  if (!map?.data) throw new Error('El modelo de profundidad no devolvió un mapa válido')

  const { data, width, height } = map
  const pixels = Buffer.alloc(width * height)
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < width * height; i += 1) {
    const v = data[i]!
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min || 1
  for (let i = 0; i < width * height; i += 1) {
    pixels[i] = Math.round(((data[i]! - min) / span) * 255)
  }

  await sharp(pixels, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(targetPath)
}

export async function runPhotoPipeline(
  views: PipelineViews,
  options: { slug: string },
): Promise<PipelineResult> {
  const { slug } = options
  const timings: Partial<Record<PipelineStage, number>> = {}
  await ensureDirs()

  // ── 1. Ingesta ────────────────────────────────────────────
  let t = Date.now()
  const frontName = `${slug}.jpg`
  const backName = `${slug}-back.jpg`

  const frontJpeg = await normalize(views.front, join(MEDIA_ROOT, 'products', frontName))
  const backJpeg = await normalize(views.back, join(MEDIA_ROOT, 'products', backName))
  timings.ingest = Date.now() - t

  // ── 2. Recorte de fondo ───────────────────────────────────
  t = Date.now()
  const frontCutoutName = `${slug}.png`
  const backCutoutName = `${slug}-back.png`

  const frontCutoutPath = join(MEDIA_ROOT, 'cutouts', frontCutoutName)
  const frontCutout = await cutout(frontJpeg)
  const frontInfo = await sharp(frontCutout).toFile(frontCutoutPath)

  const backCutout = await cutout(backJpeg)
  await sharp(backCutout).toFile(join(MEDIA_ROOT, 'cutouts', backCutoutName))
  timings.cutout = Date.now() - t

  // ── 3. Profundidad del frente ─────────────────────────────
  t = Date.now()
  await depthMap(frontCutoutPath, join(MEDIA_ROOT, 'depth', frontCutoutName))
  timings.depth = Date.now() - t
  timings.done = 0

  return {
    slug,
    photoUrl: `/api/media/products/${frontName}`,
    cutoutUrl: `/api/media/cutouts/${frontCutoutName}`,
    backPhotoUrl: `/api/media/products/${backName}`,
    backCutoutUrl: `/api/media/cutouts/${backCutoutName}`,
    depthUrl: `/api/media/depth/${frontCutoutName}`,
    width: frontInfo.width,
    height: frontInfo.height,
    timings,
  }
}
