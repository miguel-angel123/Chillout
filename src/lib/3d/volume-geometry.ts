import * as THREE from 'three'

/**
 * Convierte una foto de prenda recortada en un **volumen 3D cerrado**.
 *
 * A diferencia de la versión de una sola capa, aquí se generan dos superficies
 * —frente y revés— unidas por el contorno:
 *
 *   · Frente: desplazado por el mapa de profundidad estimado con Depth
 *     Anything V2 (ONNX local). Aporta el bulto real: capota, mangas, pliegues.
 *   · Revés: el mismo campo de profundidad invertido, con la textura reflejada.
 *   · Contorno: la profundidad se fuerza a 0 en la silueta, así ambas capas se
 *     encuentran y el objeto queda cerrado. Se puede girar 360°.
 *
 * Si no hay mapa de profundidad disponible, se usa la transformada de
 * distancia sobre la silueta (perfil de almohada), que también cierra bien.
 */

export type VolumeOptions = {
  gridW?: number
  gridH?: number
  /** Profundidad máxima del frente, relativa a la altura de la prenda. */
  maxDepth?: number
  /** Qué tan grueso es el revés respecto al frente. */
  backRatio?: number
  /** Alfa mínimo para considerar una celda parte de la prenda. */
  alphaCutoff?: number
  /** Suavizado del mapa de profundidad (celdas). */
  depthSmoothing?: number
}

const DEFAULTS: Required<VolumeOptions> = {
  gridW: 200,
  gridH: 260,
  maxDepth: 0.22,
  backRatio: 0.55,
  alphaCutoff: 0.5,
  depthSmoothing: 2,
}

export type VolumeResult = {
  /** Capa frontal (mirando a +Z). */
  front: THREE.BufferGeometry
  /** Capa trasera (mirando a -Z), con UV reflejado. */
  back: THREE.BufferGeometry
  aspect: number
}

/* ── Utilidades de imagen ─────────────────────────────────── */

function drawToGrid(
  image: HTMLImageElement | ImageBitmap,
  w: number,
  h: number,
): { alpha: Float32Array; depthRaw: Float32Array | null } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No se pudo crear el contexto 2D')

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(image, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const alpha = new Float32Array(w * h)
  for (let i = 0; i < alpha.length; i += 1) {
    alpha[i] = data[i * 4 + 3]! / 255
  }

  return { alpha, depthRaw: null }
}

/** Luminancia del mapa de profundidad reescalada a la rejilla. */
function drawDepthToGrid(
  depthImage: HTMLImageElement | ImageBitmap,
  w: number,
  h: number,
): Float32Array {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No se pudo crear el contexto 2D para profundidad')

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(depthImage, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const out = new Float32Array(w * h)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = data[i * 4]! / 255
  }
  return out
}

/** Transformada de distancia chamfer 3-4 sobre la silueta, normalizada 0..1. */
function distanceTransform(alpha: Float32Array, w: number, h: number, cutoff: number): Float32Array {
  const INF = 1e9
  const dist = new Float32Array(w * h)
  for (let i = 0; i < dist.length; i += 1) dist[i] = alpha[i]! >= cutoff ? INF : 0

  const D1 = 1
  const D2 = Math.SQRT2

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x
      if (dist[i] === 0) continue
      let best = dist[i]!
      if (x > 0) best = Math.min(best, dist[i - 1]! + D1)
      if (y > 0) best = Math.min(best, dist[i - w]! + D1)
      if (x > 0 && y > 0) best = Math.min(best, dist[i - w - 1]! + D2)
      if (x < w - 1 && y > 0) best = Math.min(best, dist[i - w + 1]! + D2)
      dist[i] = best
    }
  }

  for (let y = h - 1; y >= 0; y -= 1) {
    for (let x = w - 1; x >= 0; x -= 1) {
      const i = y * w + x
      if (dist[i] === 0) continue
      let best = dist[i]!
      if (x < w - 1) best = Math.min(best, dist[i + 1]! + D1)
      if (y < h - 1) best = Math.min(best, dist[i + w]! + D1)
      if (x < w - 1 && y < h - 1) best = Math.min(best, dist[i + w + 1]! + D2)
      if (x > 0 && y < h - 1) best = Math.min(best, dist[i + w - 1]! + D2)
      dist[i] = best
    }
  }

  let peak = 0
  for (let i = 0; i < dist.length; i += 1) {
    const v = dist[i]!
    if (v < INF && v > peak) peak = v
  }
  if (peak > 0) {
    for (let i = 0; i < dist.length; i += 1) {
      dist[i] = dist[i]! >= INF ? 0 : dist[i]! / peak
    }
  }
  return dist
}

function smooth(source: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius < 1) return source
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  const span = radius * 2 + 1

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0
      for (let k = -radius; k <= radius; k += 1) {
        const xx = Math.min(w - 1, Math.max(0, x + k))
        sum += source[y * w + xx]!
      }
      tmp[y * w + x] = sum / span
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0
      for (let k = -radius; k <= radius; k += 1) {
        const yy = Math.min(h - 1, Math.max(0, y + k))
        sum += tmp[yy * w + x]!
      }
      out[y * w + x] = sum / span
    }
  }
  return out
}

/* ── Constructor principal ────────────────────────────────── */

export function buildVolumeGeometry(
  image: HTMLImageElement | ImageBitmap,
  depthImage: HTMLImageElement | ImageBitmap | null,
  options: VolumeOptions = {},
): VolumeResult {
  const { gridW, gridH, maxDepth, backRatio, alphaCutoff, depthSmoothing } = { ...DEFAULTS, ...options }

  const { alpha } = drawToGrid(image, gridW, gridH)

  // Perfil de cierre: 1 en el interior, 0 exactamente en la silueta.
  const rim = distanceTransform(alpha, gridW, gridH, alphaCutoff)

  // Campo de forma: profundidad aprendida si existe, si no el propio perfil.
  let shape: Float32Array
  if (depthImage) {
    const raw = drawDepthToGrid(depthImage, gridW, gridH)
    const smoothed = smooth(raw, gridW, gridH, depthSmoothing)

    // Normaliza solo dentro de la prenda para no arrastrar el fondo.
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < smoothed.length; i += 1) {
      if (alpha[i]! < alphaCutoff) continue
      if (smoothed[i]! < min) min = smoothed[i]!
      if (smoothed[i]! > max) max = smoothed[i]!
    }
    const span = max - min || 1

    shape = new Float32Array(smoothed.length)
    for (let i = 0; i < smoothed.length; i += 1) {
      const normalized = (smoothed[i]! - min) / span
      shape[i] = Math.max(0, Math.min(1, normalized))
    }
  } else {
    shape = rim.slice()
  }

  // Cierre del contorno: sin esto, frente y revés no se encontrarían.
  const closeRamp = 0.18
  const depth = new Float32Array(shape.length)
  for (let i = 0; i < depth.length; i += 1) {
    const closure = Math.min(1, rim[i]! / closeRamp)
    const gradient = closure * closure * (3 - 2 * closure) // smoothstep
    depth[i] = shape[i]! * gradient
  }

  const aspect = image.width / image.height
  const height = 1
  const width = height * aspect

  function buildLayer(sign: 1 | -1): THREE.BufferGeometry {
    const positions = new Float32Array(gridW * gridH * 3)
    const uvs = new Float32Array(gridW * gridH * 2)

    for (let y = 0; y < gridH; y += 1) {
      for (let x = 0; x < gridW; x += 1) {
        const i = y * gridW + x
        const u = x / (gridW - 1)
        const v = y / (gridH - 1)

        positions[i * 3] = (u - 0.5) * width
        positions[i * 3 + 1] = (0.5 - v) * height
        positions[i * 3 + 2] = depth[i]! * maxDepth * (sign === 1 ? 1 : -backRatio)

        // El revés ve la textura reflejada: se lee como la cara interna.
        uvs[i * 2] = sign === 1 ? u : 1 - u
        uvs[i * 2 + 1] = 1 - v
      }
    }

    const indices: number[] = []
    for (let y = 0; y < gridH - 1; y += 1) {
      for (let x = 0; x < gridW - 1; x += 1) {
        const a = y * gridW + x
        const b = a + 1
        const c = a + gridW
        const d = c + 1

        const touches = alpha[a]! > 0.04 || alpha[b]! > 0.04 || alpha[c]! > 0.04 || alpha[d]! > 0.04
        if (!touches) continue

        // Winding opuesto para que cada capa mire hacia fuera.
        if (sign === 1) indices.push(a, c, b, b, c, d)
        else indices.push(a, b, c, b, d, c)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    return geometry
  }

  return { front: buildLayer(1), back: buildLayer(-1), aspect }
}
