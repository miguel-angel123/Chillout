import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

/**
 * Pipeline de una foto de prenda → activos del visor 3D.
 *
 *   1. Normaliza la fotografía original (sRGB, sin EXIF, lado mayor 2000 px).
 *   2. Recorta la prenda con matting (ONNX local, sin claves).
 *   3. Estima el mapa de profundidad con Depth Anything V2 (ONNX local).
 *
 * Todo corre en el propio proceso de Node: sin servicios externos, sin costo
 * por llamada y sin GPU. El resultado son los tres archivos que consume el
 * visor: original, recorte con alfa y mapa de profundidad.
 */

export type PipelineStage = 'ingest' | 'matte' | 'depth' | 'done'

export type PipelineResult = {
  slug: string
  photoUrl: string
  cutoutUrl: string
  depthUrl: string
  width: number
  height: number
  timings: Partial<Record<PipelineStage, number>>
}

const MEDIA_ROOT = 'public/media'
const MAX_EDGE = 2000
const DEPTH_MODEL = 'onnx-community/depth-anything-v2-small'

/** El modelo se carga una sola vez por proceso (0,5 s las siguientes veces). */
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

export async function runPhotoPipeline(
  input: Buffer,
  options: { slug: string; onStage?: (stage: PipelineStage) => void },
): Promise<PipelineResult> {
  const { slug, onStage } = options
  const timings: Partial<Record<PipelineStage, number>> = {}
  const mark = (stage: PipelineStage, started: number) => {
    timings[stage] = Date.now() - started
  }

  await ensureDirs()

  // ── 1. Ingesta ────────────────────────────────────────────
  onStage?.('ingest')
  let t = Date.now()
  const photoName = `${slug}.jpg`
  const photoPath = join(MEDIA_ROOT, 'products', photoName)

  const normalized = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ quality: 90, mozjpeg: true, progressive: true })
    .toBuffer()

  await writeFile(photoPath, normalized)
  mark('ingest', t)

  // ── 2. Recorte de la prenda ───────────────────────────────
  onStage?.('matte')
  t = Date.now()
  const { removeBackground } = await import('@imgly/background-removal-node')
  const matted = await removeBackground(photoPath, { model: 'medium', output: { format: 'image/png' } })

  const cutoutName = `${slug}.png`
  const cutoutPath = join(MEDIA_ROOT, 'cutouts', cutoutName)

  const cutoutInfo = await sharp(Buffer.from(await matted.arrayBuffer()))
    .trim({ threshold: 1 })
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(cutoutPath)
  mark('matte', t)

  // ── 3. Profundidad ────────────────────────────────────────
  onStage?.('depth')
  t = Date.now()
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

  const depthPath = join(MEDIA_ROOT, 'depth', cutoutName)
  await sharp(pixels, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(depthPath)
  mark('depth', t)

  onStage?.('done')

  return {
    slug,
    // Se sirven por /api/media: Next no publica archivos añadidos a public/
    // después del build, y el gerente sube fotos en caliente.
    photoUrl: `/api/media/products/${photoName}`,
    cutoutUrl: `/api/media/cutouts/${cutoutName}`,
    depthUrl: `/api/media/depth/${cutoutName}`,
    width: cutoutInfo.width ?? width,
    height: cutoutInfo.height ?? height,
    timings,
  }
}
