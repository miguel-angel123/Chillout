import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { isolateGarment } from '@/lib/3d/segment-garment'

/**
 * Pipeline foto → activos del visor 3D.
 *
 * Recibe las vistas que envía el gerente y produce, para cada una, la prenda
 * aislada con transparencia; además calcula el mapa de profundidad del frente,
 * que es el que da volumen a la malla.
 *
 * Con la vista trasera real el modelo deja de ser simétrico: el revés se
 * texturiza con la fotografía auténtica de la espalda.
 */

export type PipelineViews = {
  front: Buffer
  back?: Buffer
  side?: Buffer
}

export type PipelineStage = 'ingest' | 'garment' | 'depth' | 'done'

export type PipelineResult = {
  slug: string
  photoUrl: string
  cutoutUrl: string
  backPhotoUrl: string | null
  backCutoutUrl: string | null
  sideCutoutUrl: string | null
  depthUrl: string
  width: number
  height: number
  coverage: number
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

async function normalize(input: Buffer, targetPath: string) {
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ quality: 90, mozjpeg: true, progressive: true })
    .toBuffer()
  await writeFile(targetPath, buffer)
  return buffer
}

/** Aísla la prenda; si el parser falla, cae al matting simple. */
async function cutoutFrom(normalizedJpeg: Buffer): Promise<Buffer> {
  try {
    const garment = await isolateGarment(normalizedJpeg, true)
    return garment.png
  } catch (error) {
    console.warn('[pipeline] aislamiento de prenda falló, uso matting simple:', (error as Error).message)
    const { removeBackground } = await import('@imgly/background-removal-node')
    const blob = new Blob([new Uint8Array(normalizedJpeg)], { type: 'image/jpeg' })
    const matte = await removeBackground(blob, { model: 'medium', output: { format: 'image/png' } })
    return sharp(Buffer.from(await matte.arrayBuffer())).trim({ threshold: 1 }).png().toBuffer()
  }
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
  const frontJpeg = await normalize(views.front, join(MEDIA_ROOT, 'products', frontName))

  let backName: string | null = null
  let backJpeg: Buffer | null = null
  if (views.back) {
    backName = `${slug}-back.jpg`
    backJpeg = await normalize(views.back, join(MEDIA_ROOT, 'products', backName))
  }

  if (views.side) {
    await normalize(views.side, join(MEDIA_ROOT, 'products', `${slug}-side.jpg`))
  }
  timings.ingest = Date.now() - t

  // ── 2. Prenda aislada ─────────────────────────────────────
  t = Date.now()
  const frontCutoutName = `${slug}.png`
  const frontCutoutPath = join(MEDIA_ROOT, 'cutouts', frontCutoutName)
  const frontCutout = await cutoutFrom(frontJpeg)
  const frontInfo = await sharp(frontCutout).toFile(frontCutoutPath)

  let backCutoutName: string | null = null
  if (backJpeg) {
    backCutoutName = `${slug}-back.png`
    const backCutout = await cutoutFrom(backJpeg)
    await sharp(backCutout).toFile(join(MEDIA_ROOT, 'cutouts', backCutoutName))
  }

  let sideCutoutName: string | null = null
  if (views.side) {
    sideCutoutName = `${slug}-side.png`
    const sideJpeg = await sharp(join(MEDIA_ROOT, 'products', `${slug}-side.jpg`)).toBuffer()
    const sideCutout = await cutoutFrom(sideJpeg)
    await sharp(sideCutout).toFile(join(MEDIA_ROOT, 'cutouts', sideCutoutName))
  }
  timings.garment = Date.now() - t

  // ── 3. Profundidad del frente ─────────────────────────────
  t = Date.now()
  await depthMap(frontCutoutPath, join(MEDIA_ROOT, 'depth', frontCutoutName))
  timings.depth = Date.now() - t
  timings.done = 0

  return {
    slug,
    photoUrl: `/api/media/products/${frontName}`,
    cutoutUrl: `/api/media/cutouts/${frontCutoutName}`,
    backPhotoUrl: backName ? `/api/media/products/${backName}` : null,
    backCutoutUrl: backCutoutName ? `/api/media/cutouts/${backCutoutName}` : null,
    sideCutoutUrl: sideCutoutName ? `/api/media/cutouts/${sideCutoutName}` : null,
    depthUrl: `/api/media/depth/${frontCutoutName}`,
    width: frontInfo.width,
    height: frontInfo.height,
    coverage: 1,
    timings,
  }
}
