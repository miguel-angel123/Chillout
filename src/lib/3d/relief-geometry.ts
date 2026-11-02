import * as THREE from 'three'

/**
 * Convierte una foto de prenda recortada (PNG con transparencia) en una
 * superficie 3D con relieve real.
 *
 * Enfoque "2.5D con profundidad" (Ruta C del plan): el frente de la prenda es
 * la fotografía exacta, píxel a píxel. La tercera dimensión sale de una
 * transformada de distancia sobre la silueta: la profundidad es 0 en el borde
 * y máxima en el eje medial, así la pieza se abomba como una tela de verdad y
 * el contorno queda limpio (sin picos ni flecos).
 */

export type ReliefOptions = {
  /** Resolución de la malla en vértices. */
  gridW?: number
  gridH?: number
  /** Profundidad máxima, relativa a la altura de la prenda. */
  maxDepth?: number
  /** Alfa mínimo para conservar una celda. */
  alphaCutoff?: number
  /** Exponente del perfil de profundidad (más alto = más plano). */
  profile?: number
}

const DEFAULTS: Required<ReliefOptions> = {
  gridW: 200,
  gridH: 260,
  maxDepth: 0.19,
  alphaCutoff: 0.5,
  profile: 0.7,
}

export type ReliefResult = {
  geometry: THREE.BufferGeometry
  aspect: number
}

/**
 * Transformada de distancia aproximada (chamfer 3-4) sobre la silueta.
 * Devuelve, por celda opaca, la distancia en celdas hasta el borde.
 */
function distanceTransform(alpha: Float32Array, w: number, h: number, cutoff: number): Float32Array {
  const INF = 1e9
  const dist = new Float32Array(w * h)

  for (let i = 0; i < dist.length; i += 1) {
    dist[i] = alpha[i]! >= cutoff ? INF : 0
  }

  const D1 = 1
  const D2 = Math.SQRT2

  // Pasada hacia adelante
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

  // Pasada hacia atrás
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
    if (dist[i]! > peak && dist[i]! < INF) peak = dist[i]!
  }
  if (peak > 0) {
    for (let i = 0; i < dist.length; i += 1) {
      dist[i] = dist[i]! >= INF ? 0 : dist[i]! / peak
    }
  }

  return dist
}

export function buildReliefGeometry(
  image: HTMLImageElement | ImageBitmap,
  options: ReliefOptions = {},
): ReliefResult {
  const { gridW, gridH, maxDepth, alphaCutoff, profile } = { ...DEFAULTS, ...options }

  const canvas = document.createElement('canvas')
  canvas.width = gridW
  canvas.height = gridH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No se pudo crear el contexto 2D')

  ctx.clearRect(0, 0, gridW, gridH)
  ctx.drawImage(image, 0, 0, gridW, gridH)
  const { data } = ctx.getImageData(0, 0, gridW, gridH)

  const alpha = new Float32Array(gridW * gridH)
  for (let i = 0; i < alpha.length; i += 1) {
    alpha[i] = data[i * 4 + 3]! / 255
  }

  // Profundidad: 0 en el contorno, máxima en el eje medial de la pieza.
  const normalized = distanceTransform(alpha, gridW, gridH, alphaCutoff)
  const depth = new Float32Array(gridW * gridH)
  for (let i = 0; i < depth.length; i += 1) {
    depth[i] = Math.pow(normalized[i]!, profile) * maxDepth * (alpha[i]! >= alphaCutoff ? 1 : 0)
  }

  const aspect = image.width / image.height
  const height = 1
  const width = height * aspect

  const positions = new Float32Array(gridW * gridH * 3)
  const uvs = new Float32Array(gridW * gridH * 2)

  for (let y = 0; y < gridH; y += 1) {
    for (let x = 0; x < gridW; x += 1) {
      const i = y * gridW + x
      const u = x / (gridW - 1)
      const v = y / (gridH - 1)

      positions[i * 3] = (u - 0.5) * width
      positions[i * 3 + 1] = (0.5 - v) * height
      positions[i * 3 + 2] = depth[i]!

      uvs[i * 2] = u
      uvs[i * 2 + 1] = 1 - v
    }
  }

  // Se conservan todos los cuadros que toquen la silueta. El recorte fino lo
  // hace el `alphaTest` del material contra la textura a resolución completa,
  // de modo que el contorno queda suave y no escalonado a la rejilla.
  const indices: number[] = []
  for (let y = 0; y < gridH - 1; y += 1) {
    for (let x = 0; x < gridW - 1; x += 1) {
      const a = y * gridW + x
      const b = a + 1
      const c = a + gridW
      const d = c + 1

      const touches =
        alpha[a]! > 0.04 || alpha[b]! > 0.04 || alpha[c]! > 0.04 || alpha[d]! > 0.04

      if (!touches) continue

      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return { geometry, aspect }
}
