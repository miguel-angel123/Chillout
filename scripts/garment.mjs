/**
 * Aísla la prenda de la persona en una fotografía.
 *
 * Usa un parser humano ATR (SegFormer-B2, int8) sobre onnxruntime: clasifica
 * cada píxel en 18 categorías y conserva solo la ropa superior. El resultado es
 * la prenda sola, sobre transparencia, lista para el visor 3D.
 *
 *   node scripts/garment.mjs <archivo.jpg> [salida.png]
 *
 * El modelo se descarga una vez a .models/ y queda fuera del repositorio.
 */
import { mkdir, writeFile, access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'
import { removeBackground } from '@imgly/background-removal-node'

const MODEL_ID = 'AbrahamPJ/segformer-b2-clothes-onnx'
const MODEL_FILE = 'atr-parser-int8-v1.onnx'
const MODEL_URL = `https://huggingface.co/${MODEL_ID}/resolve/main/${MODEL_FILE}`
const MODEL_DIR = '.models'
const MODEL_PATH = join(MODEL_DIR, MODEL_FILE)

const INPUT_SIZE = 512

/** Categorías ATR. 4 = ropa superior; 7 = vestido. */
const KEEP_CLASSES = new Set([4, 7])
const LABELS = [
  'Background', 'Hat', 'Hair', 'Sunglasses', 'Upper-clothes', 'Skirt', 'Pants', 'Dress',
  'Belt', 'Left-shoe', 'Right-shoe', 'Face', 'Left-leg', 'Right-leg', 'Left-arm',
  'Right-arm', 'Bag', 'Scarf',
]

const log = (...a) => console.log('[garment]', ...a)

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function ensureModel() {
  if (await exists(MODEL_PATH)) return MODEL_PATH

  await mkdir(MODEL_DIR, { recursive: true })
  log('descargando modelo…')
  const response = await fetch(MODEL_URL)
  if (!response.ok) throw new Error(`descarga del modelo falló: ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(MODEL_PATH, buffer)
  log(`modelo guardado (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
  return MODEL_PATH
}

async function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('Uso: node scripts/garment.mjs <archivo.jpg> [salida.png]')
    process.exit(1)
  }
  const output = process.argv[3] ?? 'docs/screenshots/garment-test.png'

  await ensureModel()

  const session = await ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  })

  log('entradas :', session.inputNames.join(', '))
  log('salidas  :', session.outputNames.join(', '))

  // Preprocesado: 512×512, NCHW, normalización ImageNet
  const { data, info } = await sharp(input)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]
  const tensorData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE)

  for (let y = 0; y < INPUT_SIZE; y += 1) {
    for (let x = 0; x < INPUT_SIZE; x += 1) {
      const source = (y * INPUT_SIZE + x) * info.channels
      for (let c = 0; c < 3; c += 1) {
        const value = data[source + c] / 255
        tensorData[c * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = (value - mean[c]) / std[c]
      }
    }
  }

  const inputName = session.inputNames[0]
  const feeds = { [inputName]: new ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]) }

  const started = Date.now()
  const results = await session.run(feeds)
  log(`inferencia: ${Date.now() - started} ms`)

  const outputName = session.outputNames[0]
  const logits = results[outputName]
  const [, classes, height, width] = logits.dims
  log(`salida: dims=${logits.dims.join('x')} clases=${classes} ${width}x${height}`)

  // Argmax por píxel sobre las 18 categorías
  const raw = logits.data
  const classMap = new Uint8Array(width * height)
  const histogram = new Array(classes).fill(0)

  for (let i = 0; i < width * height; i += 1) {
    let best = 0
    let bestScore = -Infinity
    for (let c = 0; c < classes; c += 1) {
      const score = raw[c * width * height + i]
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    classMap[i] = best
    histogram[best] += 1
  }

  log('distribución de clases:')
  histogram
    .map((count, index) => ({ label: LABELS[index] ?? `clase-${index}`, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .forEach((entry) => {
      log(`   ${entry.label.padEnd(16)} ${((entry.count / (width * height)) * 100).toFixed(1)}%`)
    })

  // Máscara binaria de la prenda
  const mask = Buffer.alloc(width * height)
  let kept = 0
  for (let i = 0; i < classMap.length; i += 1) {
    if (KEEP_CLASSES.has(classMap[i])) {
      mask[i] = 255
      kept += 1
    }
  }
  log(`prenda cubre ${((kept / (width * height)) * 100).toFixed(1)}% del encuadre`)

  if (kept === 0) {
    log('no se detectó prenda: revisa la imagen o la normalización')
    process.exit(2)
  }

  // Aplica la máscara sobre el original a resolución completa.
  // El parser devuelve 128×128, así que la máscara se escala con interpolación
  // cúbica, se suaviza para seguir el contorno real y se umbraliza para
  // recortar el halo; el desenfoque final solo sirve de antialias.
  const original = sharp(input).rotate()
  const metadata = await original.metadata()
  const fullWidth = metadata.width ?? width
  const fullHeight = metadata.height ?? height

  // Máscara suave de la prenda (sin umbral: el escalón del parser se ve si se
  // umbraliza). Se usa como región, no como borde final.
  const maskResult = await sharp(mask, { raw: { width, height, channels: 1 } })
    .resize(fullWidth, fullHeight, { fit: 'fill', kernel: 'cubic' })
    .blur(Math.max(2, fullWidth * 0.004))
    .raw()
    .toBuffer({ resolveWithObject: true })

  const maskData = maskResult.data
  const maskChannels = maskResult.info.channels || 1

  // Contorno fino: el matting de primer plano aporta el borde real píxel a píxel
  // en los hombros, mangas y costados; el parser solo decide qué es prenda.
  // El matting recibe la imagen como Blob: si se le pasa una ruta absoluta de
  // Windows la interpreta como URI y falla con "Unsupported protocol: c:".
  log('refinando contorno con matting…')
  const sourceBuffer = await readFile(input)
  const matte = await removeBackground(new Blob([sourceBuffer], { type: 'image/jpeg' }), {
    model: 'medium',
    output: { format: 'image/png' },
  })
  const { data: matteData } = await sharp(Buffer.from(await matte.arrayBuffer()))
    .resize(fullWidth, fullHeight, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rgba = Buffer.from(matteData)

  for (let i = 0; i < fullWidth * fullHeight; i += 1) {
    const matteAlpha = rgba[i * 4 + 3] ?? 0
    const garmentAlpha = maskData[i * maskChannels] ?? 0
    // La región se expande un poco más allá del contorno del parser: así el
    // borde exterior lo define el matting (nítido) y el parser solo recorta
    // cabeza, manos y piernas, evitando el escalón de sus 128 px.
    const region = Math.min(1, Math.max(0, (garmentAlpha / 255 - 0.2) / 0.12))
    rgba[i * 4 + 3] = Math.round(matteAlpha * region)
  }

  await sharp(rgba, { raw: { width: fullWidth, height: fullHeight, channels: 4 } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
    .toFile(output)

  log('✓ guardado en', output)
}

main().catch((error) => {
  console.error('[garment] falló:', error)
  process.exit(1)
})
