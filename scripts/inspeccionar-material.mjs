/** Inspecciona el material del GLB: doble cara, textura y color. */
import { readFile } from 'node:fs/promises'

const ruta = process.argv[2] ?? 'public/media/models/hoodie-acanalado-carbon.glb'
const buffer = await readFile(ruta)

const jsonLen = buffer.readUInt32LE(12)
const json = JSON.parse(buffer.slice(20, 20 + jsonLen).toString('utf8'))

console.log('')
console.log('  Material del GLB')
for (const [i, mat] of (json.materials ?? []).entries()) {
  console.log(`    [${i}] ${mat.name ?? '(sin nombre)'}`)
  console.log(`        doubleSided : ${mat.doubleSided ?? false}`)
  const pbr = mat.pbrMetallicRoughness ?? {}
  console.log(`        baseColor   : ${JSON.stringify(pbr.baseColorFactor ?? [1, 1, 1, 1])}`)
  console.log(`        textura     : ${pbr.baseColorTexture ? 'sí' : 'no'}`)
  console.log(`        roughness   : ${pbr.roughnessFactor ?? 1}`)
  console.log(`        metallic    : ${pbr.metallicFactor ?? 1}`)
}
console.log(`    imágenes      : ${json.images?.length ?? 0}`)
console.log(`    mallas        : ${json.meshes?.length ?? 0}`)
console.log('')
