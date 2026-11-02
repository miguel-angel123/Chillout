import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

/**
 * Aísla la prenda de la persona en una fotografía.
 *
 * Dos modelos trabajan juntos:
 *   1. Un parser humano ATR (SegFormer-B2 int8) clasifica cada píxel y dice qué
 *      zona es ropa superior: aporta la región, no el borde.
 *   2. El matting de primer plano aporta el contorno real, píxel a píxel.
 *
 * Multiplicar ambos deja la prenda sola con un borde nítido. Se ejecuta sobre un
 * recorte ajustado a la figura para que los 128×128 del parser cubran menos
 * superficie y el contorno sea más fino.
 */

const MODEL_URL =
  'https://huggingface.co/AbrahamPJ/segformer-b2-clothes-onnx/resolve/main/atr-parser-int8-v1.onnx'
const MODEL_DIR = '.models'
const MODEL_PATH = join(MODEL_DIR, 'atr-parser-int8-v1.onnx')

const INPUT_SIZE = 512
/** 4 = ropa superior, 7 = vestido */
const KEEP = new Set([4, 7])

type Session = import('onnxruntime-node').InferenceSession

let sessionPromise: Promise<Session> | null = null

async function fileExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function ensureModel() {
  if (await fileExists(MODEL_PATH)) return
  await mkdir(MODEL_DIR, { recursive: true })
  const response = await fetch(MODEL_URL)
  if (!response.ok) throw new Error(`No se pudo descargar el parser (${response.status})`)
  await writeFile(MODEL_PATH, Buffer.from(await response.arrayBuffer()))
}

async function getSession(): Promise<Session> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      await ensureModel()
      const ort = await import('onnxruntime-node')
      return ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      })
    })()
  }
  return sessionPromise
}

/** Máscara 0/255 de la prenda, calculada sobre la imagen ya recortada. */
async function garmentMask(pngBuffer: Buffer): Promise<{ mask: Buffer; width: number; height: number }> {
  const ort = await import('onnxruntime-node')
  const session = await getSession()

  const { data, info } = await sharp(pngBuffer)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]
  const tensor = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE)

  for (let y = 0; y < INPUT_SIZE; y += 1) {
    for (let x = 0; x < INPUT_SIZE; x += 1) {
      const source = (y * INPUT_SIZE + x) * info.channels
      for (let c = 0; c < 3; c += 1) {
        const value = (data[source + c] ?? 0) / 255
        tensor[c * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = (value - mean[c]!) / std[c]!
      }
    }
  }

  const inputName = session.inputNames[0]!
  const results = await session.run({
    [inputName]: new ort.Tensor('float32', tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]),
  })

  const output = results[session.outputNames[0]!]!
  const [, classes, height, width] = output.dims as number[]
  const raw = output.data as Float32Array

  const mask = Buffer.alloc(width! * height!)
  for (let i = 0; i < width! * height!; i += 1) {
    let best = 0
    let score = -Infinity
    for (let c = 0; c < classes!; c += 1) {
      const value = raw[c * width! * height! + i]!
      if (value > score) {
        score = value
        best = c
      }
    }
    mask[i] = KEEP.has(best) ? 255 : 0
  }

  return { mask, width: width!, height: height! }
}

export type GarmentResult = {
  /** PNG RGBA con la prenda sola sobre transparencia. */
  png: Buffer
  width: number
  height: number
  /** Fracción del encuadre que ocupa la prenda. */
  coverage: number
}

/**
 * Devuelve la prenda aislada. Si no se detecta ropa, lanza para que el llamador
 * decida (en el pipeline se cae al matting simple como respaldo).
 */
export async function isolateGarment(input: Buffer, withAlpha: boolean): Promise<GarmentResult> {
  const { removeBackground } = await import('@imgly/background-removal-node')

  // 1. Matting de primer plano: contorno fino.
  const blob = new Blob([new Uint8Array(input)], { type: 'image/png' })
  const matte = await removeBackground(blob, { model: 'medium', output: { format: 'image/png' } })
  const mattePng = Buffer.from(await matte.arrayBuffer())

  // 2. Recorte ajustado a la figura → el parser rinde más.
  const trimmed = await sharp(mattePng).trim({ threshold: 1 }).png().toBuffer()
  const trimmedMeta = await sharp(trimmed).metadata()
  const width = trimmedMeta.width ?? 0
  const height = trimmedMeta.height ?? 0
  if (!width || !height) throw new Error('La imagen quedó vacía tras el recorte')

  // 3. Región de prenda según el parser.
  const { mask, width: maskW, height: maskH } = await garmentMask(trimmed)

  const maskResult = await sharp(mask, { raw: { width: maskW, height: maskH, channels: 1 } })
    .resize(width, height, { fit: 'fill', kernel: 'cubic' })
    .blur(Math.max(1.5, width * 0.003))
    .raw()
    .toBuffer({ resolveWithObject: true })

  const maskData = maskResult.data
  const maskChannels = maskResult.info.channels || 1

  // 4. Prenda = matting × región
  const { data: rgba } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(rgba)
  let visible = 0

  for (let i = 0; i < width * height; i += 1) {
    const matteAlpha = out[i * 4 + 3] ?? 0
    const regionRaw = (maskData[i * maskChannels] ?? 0) / 255
    // La región se expande un poco para que el borde lo defina el matting.
    const region = Math.min(1, Math.max(0, (regionRaw - 0.2) / 0.12))
    const alpha = Math.round(matteAlpha * region)
    out[i * 4 + 3] = withAlpha ? alpha : 255
    if (alpha > 8) visible += 1
  }

  const coverage = visible / (width * height)
  if (coverage < 0.02) throw new Error('No se detectó una prenda en la imagen')

  const png = await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
    .toBuffer()

  const finalMeta = await sharp(png).metadata()

  return {
    png,
    width: finalMeta.width ?? width,
    height: finalMeta.height ?? height,
    coverage,
  }
}

/** Lee el modelo si ya está descargado (para no bloquear el primer request). */
export async function isGarmentModelReady(): Promise<boolean> {
  return fileExists(MODEL_PATH)
}

export async function readGarmentModel(): Promise<Buffer | null> {
  if (!(await fileExists(MODEL_PATH))) return null
  return readFile(MODEL_PATH)
}
