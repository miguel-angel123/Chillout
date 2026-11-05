/**
 * Verifica la orientación de la textura sobre el GLB.
 *
 * Comprueba que el cuello (vértice más alto) muestre la parte ALTA del atlas,
 * el bajo la parte baja, y que el frente/espalda caigan en sus columnas.
 */
import { readFile } from 'node:fs/promises'

const ruta = process.argv[2] ?? 'public/media/models/hoodie-acanalado-carbon.glb'
const buffer = await readFile(ruta)

const jsonLen = buffer.readUInt32LE(12)
const padding = (4 - (jsonLen % 4)) % 4
const gltf = JSON.parse(buffer.slice(20, 20 + jsonLen).toString('utf8'))
const bin = buffer.slice(20 + jsonLen + padding + 8)

const prim = gltf.meshes[0].primitives[0]
const accPos = gltf.accessors[prim.attributes.POSITION]
const accUv = gltf.accessors[prim.attributes.TEXCOORD_0]
const bvPos = gltf.bufferViews[accPos.bufferView]
const bvUv = gltf.bufferViews[accUv.bufferView]

const N = accPos.count
let maxY = -Infinity
let minY = Infinity
let maxZ = -Infinity
let minZ = Infinity
let iMaxY = 0
let iMinY = 0
let iMaxZ = 0
let iMinZ = 0

for (let i = 0; i < N; i += 1) {
  const y = bin.readFloatLE(bvPos.byteOffset + i * 12 + 4)
  const z = bin.readFloatLE(bvPos.byteOffset + i * 12 + 8)
  if (y > maxY) {
    maxY = y
    iMaxY = i
  }
  if (y < minY) {
    minY = y
    iMinY = i
  }
  if (z > maxZ) {
    maxZ = z
    iMaxZ = i
  }
  if (z < minZ) {
    minZ = z
    iMinZ = i
  }
}

const uv = (i) => ({
  u: bin.readFloatLE(bvUv.byteOffset + i * 8),
  v: bin.readFloatLE(bvUv.byteOffset + i * 8 + 4),
})

const cuello = uv(iMaxY)
const bajo = uv(iMinY)
const frente = uv(iMaxZ)
const espalda = uv(iMinZ)

const dentro = (valor, min, max) => valor >= min && valor <= max

const pruebas = [
  ['cuello (Y máx) → parte alta del atlas (v≈0)', dentro(cuello.v, 0, 0.2), cuello.v.toFixed(3)],
  ['bajo (Y mín) → parte baja del atlas (v≈1)', dentro(bajo.v, 0.8, 1), bajo.v.toFixed(3)],
  ['frente (Z máx) → columna del frente (u 0.125–0.375)', dentro(frente.u, 0.125, 0.375), frente.u.toFixed(3)],
  ['espalda (Z mín) → columna de la espalda (u 0.625–0.875)', dentro(espalda.u, 0.625, 0.875), espalda.u.toFixed(3)],
]

console.log('')
console.log('  Verificación de orientación de textura')
console.log(`  archivo: ${ruta}`)
console.log('')
let ok = true
for (const [nombre, pasa, valor] of pruebas) {
  console.log(`  ${pasa ? '✓' : '✗'} ${nombre}  [${valor}]`)
  if (!pasa) ok = false
}
console.log('')
console.log(`  RESULTADO: ${ok ? 'ORIENTACIÓN CORRECTA ✓' : 'HAY UN PROBLEMA ✗'}`)
console.log('')

if (!ok) process.exitCode = 1
