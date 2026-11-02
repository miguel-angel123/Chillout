/**
 * Genera recortes con transparencia (PNG RGBA) de las fotografías de producto.
 *
 *   node scripts/matte.mjs            # todas
 *   node scripts/matte.mjs <archivo>  # una sola
 *
 * El modelo de segmentación corre localmente (ONNX) con
 * @imgly/background-removal-node: sin claves ni costo por llamada.
 * La primera ejecución descarga los pesos del modelo.
 */
import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { removeBackground } from '@imgly/background-removal-node'
import sharp from 'sharp'

const SRC_DIR = 'public/media/products'
const OUT_DIR = 'public/media/cutouts'
const MAX_EDGE = 1400

const log = (...a) => console.log('[matte]', ...a)

await mkdir(OUT_DIR, { recursive: true })

const only = process.argv[2]
const all = (await readdir(SRC_DIR)).filter((f) => /\.jpe?g$/i.test(f))
const files = only ? [only] : all

log(`${files.length} imagen(es) a procesar`)

let ok = 0
let failed = 0

for (const file of files) {
  const src = join(SRC_DIR, file)
  const target = join(OUT_DIR, file.replace(/\.jpe?g$/i, '.png'))
  const started = Date.now()

  try {
    const blob = await removeBackground(src, {
      model: 'medium',
      output: { format: 'image/png' },
    })
    const buffer = Buffer.from(await blob.arrayBuffer())

    // Recorta el aire sobrante y normaliza el tamaño.
    await sharp(buffer)
      .trim({ threshold: 1 })
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(target)

    const { size } = await sharp(target).metadata()
    const seconds = ((Date.now() - started) / 1000).toFixed(1)
    log(`✓ ${file.padEnd(34)} ${seconds}s`)
    ok += 1
  } catch (error) {
    failed += 1
    log(`✗ ${file}:`)
    console.error(error)
  }
}

log(`listo — ${ok} recortes, ${failed} fallos`)
