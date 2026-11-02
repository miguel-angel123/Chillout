/**
 * Estima el mapa de profundidad de una prenda con Depth Anything V2 (ONNX local).
 *
 *   node scripts/depth.mjs            # todas
 *   node scripts/depth.mjs <archivo>  # una sola
 *
 * Sin claves ni costo por llamada: el modelo corre en CPU con onnxruntime.
 * La primera ejecución descarga los pesos (~25 MB) desde el CDN de Hugging Face.
 *
 * Salida: public/media/depth/<nombre>.png en escala de grises (16 bits del
 * modelo reescalados a 8 bits; claro = más cerca de la cámara).
 */
import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { pipeline } from '@huggingface/transformers'

const SRC_DIR = 'public/media/cutouts'
const OUT_DIR = 'public/media/depth'
const MODEL = 'onnx-community/depth-anything-v2-small'

const log = (...a) => console.log('[depth]', ...a)

await mkdir(OUT_DIR, { recursive: true })

const only = process.argv[2]
const all = (await readdir(SRC_DIR)).filter((f) => /\.png$/i.test(f))
const files = only ? [only] : all

log(`cargando ${MODEL}…`)
const started = Date.now()
const estimator = await pipeline('depth-estimation', MODEL, { dtype: 'fp32' })
log(`modelo listo en ${((Date.now() - started) / 1000).toFixed(1)}s`)

let ok = 0
let failed = 0

for (const file of files) {
  const src = join(SRC_DIR, file)
  const target = join(OUT_DIR, file)
  const t0 = Date.now()

  try {
    const output = await estimator(src)
    const map = output?.depth ?? output?.[0]?.depth ?? output
    if (!map) throw new Error('la salida no trae mapa de profundidad')

    // `map` es un RawImage con .data (Float32Array), .width y .height
    const { data, width, height } = map
    const buffer = Buffer.alloc(width * height)

    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < width * height; i += 1) {
      const v = data[i]
      if (v < min) min = v
      if (v > max) max = v
    }
    const span = max - min || 1
    for (let i = 0; i < width * height; i += 1) {
      buffer[i] = Math.round(((data[i] - min) / span) * 255)
    }

    await sharp(buffer, { raw: { width, height, channels: 1 } }).png({ compressionLevel: 9 }).toFile(target)

    log(`✓ ${file.padEnd(34)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${width}x${height}`)
    ok += 1
  } catch (error) {
    failed += 1
    log(`✗ ${file}: ${error.message?.split('\n')[0]}`)
  }
}

log(`listo — ${ok} mapas, ${failed} fallos`)
