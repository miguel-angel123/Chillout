#!/usr/bin/env node
/**
 * CHILLOUT · Motor 3D local
 * =========================
 *
 * Genera los activos de una prenda a partir de DOS fotografías (frontal y
 * trasera). Corre en tu propio PC, sin servicios externos, sin claves y sin
 * costo por prenda. No requiere GPU: los modelos ONNX van en CPU.
 *
 * Qué produce, por cada prenda:
 *
 *   products/<slug>-front.jpg     foto normalizada
 *   products/<slug>-back.jpg
 *   cutouts/<slug>.png            prenda recortada con transparencia
 *   cutouts/<slug>-back.png
 *   depth/<slug>.png              mapa de profundidad (volumen)
 *   detail/<slug>.png             MAPA DE DETALLE SIN COLOR (luminancia
 *                                 normalizada + alfa) ← es el que se tiñe
 *   detail/<slug>-back.png
 *   detail/<slug>.json            manifiesto con medidas y tiempos
 *
 * El mapa de detalle es la pieza clave: conserva el acanalado, las costuras y
 * el relieve del tejido, pero descarta el color. En la web el visor multiplica
 * ese detalle por el color que elija el cliente, así un solo modelo sirve para
 * todos los colores de la prenda.
 *
 * Uso
 * ---
 *   # Una prenda
 *   node tools/chillout-3d/engine.mjs --slug hoodie-carbon \
 *        --front foto-frontal.jpg --back foto-trasera.jpg
 *
 *   # Lote: todos los pares <nombre>-front.ext / <nombre>-back.ext de una carpeta
 *   node tools/chillout-3d/engine.mjs --batch ./fotos
 *
 *   # Opciones
 *   --force        regenera aunque existan los archivos
 *   --detail-only  solo recalcula el mapa de detalle (usa los recortes ya hechos)
 *   --quality      fast | balanced | best   (por defecto balanced)
 */

import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const MEDIA = 'public/media'
const DIRS = {
  products: join(MEDIA, 'products'),
  cutouts: join(MEDIA, 'cutouts'),
  depth: join(MEDIA, 'depth'),
  detail: join(MEDIA, 'detail'),
}

const QUALITY = {
  fast: { matte: 'small', maxEdge: 1400 },
  balanced: { matte: 'medium', maxEdge: 1800 },
  best: { matte: 'large', maxEdge: 2200 },
}

const DEPTH_MODEL = 'onnx-community/depth-anything-v2-small'

/** El modelo se carga una sola vez y se reutiliza en todo el lote. */
let depthEstimator = null
let matteEngine = null

/* ── utilidades ───────────────────────────────────────────── */

const log = (...a) => console.log('[motor]', ...a)

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function parseArgs(argv) {
  const args = { quality: 'balanced' }
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    if (key === 'force' || key === 'detail-only') {
      args[key === 'force' ? 'force' : 'detailOnly'] = true
      continue
    }
    args[key] = argv[i + 1]
    i += 1
  }
  return args
}

/* ── pasos ────────────────────────────────────────────────── */

async function getMatteEngine() {
  if (!matteEngine) {
    const mod = await import('@imgly/background-removal-node')
    matteEngine = mod.removeBackground
  }
  return matteEngine
}

async function getDepthEstimator() {
  if (!depthEstimator) {
    const { pipeline } = await import('@huggingface/transformers')
    depthEstimator = await pipeline('depth-estimation', DEPTH_MODEL, { dtype: 'fp32' })
  }
  return depthEstimator
}

/** 1. Normaliza la foto original. */
async function ingest(inputBuffer, targetPath, maxEdge) {
  await sharp(inputBuffer)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ quality: 92, mozjpeg: true, progressive: true })
    .toFile(targetPath)
  return targetPath
}

/** 2. Recorta el fondo conservando el gancho de la foto. */
async function cutout(sourcePath, targetPath, model) {
  const removeBackground = await getMatteEngine()
  const buffer = await readFile(sourcePath)
  const blob = new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' })

  const matte = await removeBackground(blob, { model, output: { format: 'image/png' } })
  const png = Buffer.from(await matte.arrayBuffer())

  await sharp(png)
    .trim({ threshold: 1 })
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(targetPath)

  return sharp(targetPath).metadata()
}

/** 3. Mapa de profundidad (blanco = más cerca). */
async function depth(cutoutPath, targetPath) {
  const estimator = await getDepthEstimator()
  const output = await estimator(cutoutPath)
  const map = output?.depth
  if (!map?.data) throw new Error('el modelo de profundidad no devolvió datos')

  const { data, width, height } = map
  const pixels = Buffer.alloc(width * height)

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < width * height; i += 1) {
    const v = data[i]
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min || 1
  for (let i = 0; i < width * height; i += 1) {
    pixels[i] = Math.round(((data[i] - min) / span) * 255)
  }

  await sharp(pixels, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(targetPath)
}

/**
 * 4. El paso que hace posible el cambio de color.
 *
 * Toma el recorte y lo convierte en LUMINANCIA NORMALIZADA: divide cada píxel
 * por la luminancia mediana del tejido y comprime el resultado a un rango
 * estrecho alrededor de 1. Así:
 *
 *   · desaparece el color original (queda gris neutro),
 *   · desaparece la iluminación del taller (que si no se duplica al iluminar
 *     en 3D),
 *   · se conserva el contraste fino del acanalado y las costuras.
 *
 * Se conserva el canal alfa para que el recorte de la silueta siga funcionando.
 */
async function detailMap(cutoutPath, targetPath) {
  const { data, info } = await sharp(cutoutPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const pixels = width * height

  // Luminancia Rec.709 y mediana robusta dentro de la prenda.
  const lum = new Float32Array(pixels)
  const samples = []

  for (let i = 0; i < pixels; i += 1) {
    const alpha = data[i * 4 + 3]
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const value = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    lum[i] = value
    if (alpha > 200) samples.push(value)
  }

  if (samples.length === 0) throw new Error('el recorte quedó vacío')

  samples.sort((a, b) => a - b)
  const median = samples[Math.floor(samples.length / 2)] || 0.5
  const reference = Math.max(0.08, median)

  const out = Buffer.alloc(pixels * 4)

  for (let i = 0; i < pixels; i += 1) {
    const alpha = data[i * 4 + 3]
    // ratio 1.0 = tejido típico; se comprime para no quemar ni empastar.
    const ratio = lum[i] / reference
    const t = Math.min(1, Math.max(0, (ratio - 0.55) / 1.15))
    const detail = 0.58 + 0.42 * t // 0.58 → 1.0

    const g = Math.round(detail * 255)
    out[i * 4] = g
    out[i * 4 + 1] = g
    out[i * 4 + 2] = g
    out[i * 4 + 3] = alpha
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(targetPath)

  return { median, reference }
}

/* ── una prenda ───────────────────────────────────────────── */

async function processGarment({ slug, front, back, quality, force, detailOnly }) {
  const preset = QUALITY[quality] ?? QUALITY.balanced
  const started = Date.now()
  const timings = {}

  const frontSource = join(DIRS.products, `${slug}-front.jpg`)
  const backSource = join(DIRS.products, `${slug}-back.jpg`)
  const frontCut = join(DIRS.cutouts, `${slug}.png`)
  const backCut = join(DIRS.cutouts, `${slug}-back.png`)
  const frontDetail = join(DIRS.detail, `${slug}.png`)
  const backDetail = join(DIRS.detail, `${slug}-back.png`)
  const frontDepth = join(DIRS.depth, `${slug}.png`)

  let t = Date.now()

  if (detailOnly) {
    log(`${slug}: solo mapa de detalle`)
    if (!(await exists(frontCut))) throw new Error(`falta el recorte ${frontCut}`)
  } else {
    log(`${slug}: ingesta`)
    await ingest(await readFile(front), frontSource, preset.maxEdge)
    await ingest(await readFile(back), backSource, preset.maxEdge)
  }
  timings.ingest = Date.now() - t

  if (!detailOnly) {
    t = Date.now()
    log(`${slug}: recortando fondo (2 vistas)`)
    const frontMeta = await cutout(frontSource, frontCut, preset.matte)
    await cutout(backSource, backCut, preset.matte)
    timings.cutout = Date.now() - t

    t = Date.now()
    log(`${slug}: profundidad`)
    await depth(frontCut, frontDepth)
    timings.depth = Date.now() - t

    t = Date.now()
    log(`${slug}: mapa de detalle sin color`)
    const stats = await detailMap(frontCut, frontDetail)
    await detailMap(backCut, backDetail)
    timings.detail = Date.now() - t

    const durationMs = Date.now() - started
    const manifest = {
      slug,
      generatedAt: new Date().toISOString(),
      quality,
      width: frontMeta.width,
      height: frontMeta.height,
      aspect: Number(((frontMeta.width ?? 1) / (frontMeta.height ?? 1)).toFixed(4)),
      medianLuminance: Number(stats.median.toFixed(4)),
      assets: {
        front: `/api/media/products/${slug}-front.jpg`,
        back: `/api/media/products/${slug}-back.jpg`,
        cutout: `/api/media/cutouts/${slug}.png`,
        backCutout: `/api/media/cutouts/${slug}-back.png`,
        depth: `/api/media/depth/${slug}.png`,
        detail: `/api/media/detail/${slug}.png`,
        backDetail: `/api/media/detail/${slug}-back.png`,
      },
      timingsMs: timings,
      durationMs,
    }

    await writeFile(join(DIRS.detail, `${slug}.json`), JSON.stringify(manifest, null, 2))
    log(`${slug}: listo en ${(durationMs / 1000).toFixed(1)} s`)
    return manifest
  }

  await detailMap(frontCut, frontDetail)
  if (await exists(backCut)) await detailMap(backCut, backDetail)
  log(`${slug}: mapas de detalle regenerados`)
  return { slug, detailOnly: true }
}

/* ── lote ─────────────────────────────────────────────────── */

async function collectPairs(folder) {
  const files = await readdir(folder)
  const fronts = files.filter((f) => /-front\.(jpe?g|png|webp)$/i.test(f))
  const pairs = []

  for (const frontFile of fronts) {
    const ext = extname(frontFile)
    const base = basename(frontFile, ext).replace(/-front$/i, '')
    const backFile = files.find(
      (f) => new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-back\\.(jpe?g|png|webp)$`, 'i').test(f),
    )
    if (!backFile) {
      log(`⚠ ${base}: falta la vista trasera, se omite`)
      continue
    }
    pairs.push({
      slug: slugify(base),
      front: join(folder, frontFile),
      back: join(folder, backFile),
    })
  }

  return pairs
}

/* ── principal ────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv)
  await Promise.all(Object.values(DIRS).map((dir) => mkdir(dir, { recursive: true })))

  const common = {
    quality: args.quality ?? 'balanced',
    force: Boolean(args.force),
    detailOnly: Boolean(args.detailOnly),
  }

  const jobs = []

  if (args.batch) {
    log(`buscando pares en ${args.batch}`)
    jobs.push(...(await collectPairs(args.batch)))
  } else if (args.front && args.back) {
    const slug = slugify(args.slug ?? basename(args.front, extname(args.front)).replace(/-?front(al)?$/i, ''))
    jobs.push({ slug, front: args.front, back: args.back })
  } else {
    console.error('Uso: --front <foto> --back <foto> [--slug nombre]  |  --batch <carpeta>')
    process.exit(1)
  }

  if (jobs.length === 0) {
    log('no se encontraron pares frontal/trasera')
    process.exit(1)
  }

  log(`${jobs.length} prenda(s) en cola · calidad ${common.quality}`)

  const results = []
  for (const [index, job] of jobs.entries()) {
    log(`\n(${index + 1}/${jobs.length}) ${job.slug}`)
    try {
      results.push(await processGarment({ ...job, ...common }))
    } catch (error) {
      log(`✗ ${job.slug}: ${error.message}`)
      results.push({ slug: job.slug, error: error.message })
    }
  }

  const ok = results.filter((r) => !r.error)
  const failed = results.filter((r) => r.error)
  log(`\nTerminado: ${ok.length} ok, ${failed.length} con error`)
  if (failed.length) for (const f of failed) log(`   ✗ ${f.slug}: ${f.error}`)
}

main().catch((error) => {
  console.error('[motor] falló:', error)
  process.exit(1)
})
