/**
 * Publica el GLB del motor 3D en la tienda.
 *
 *   node scripts/publicar-glb.mjs --slug hoodie-acanalado-carbon \
 *        --archivo "CHILLOUT-MOTOR-3D/salida/hoodie-carbon/modelo.glb"
 *
 * Copia el archivo a public/media/models/<slug>.glb (la ruta que sirve
 * /api/media y que el visor busca) y actualiza la fila de models_3d.
 */
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, token, i, all) => {
    if (token.startsWith('--')) acc.push([token.slice(2), all[i + 1]])
    return acc
  }, []),
)

const slug = args.slug
const archivo = args.archivo

if (!slug || !archivo) {
  console.error('Uso: node scripts/publicar-glb.mjs --slug <producto> --archivo <modelo.glb>')
  process.exit(1)
}

const info = await stat(archivo)
const destino = join(process.cwd(), 'public', 'media', 'models', `${slug}.glb`)
await mkdir(join(process.cwd(), 'public', 'media', 'models'), { recursive: true })
await copyFile(archivo, destino)

const sql = neon(process.env.DATABASE_URL)

const filas = await sql`SELECT id FROM products WHERE slug = ${slug} LIMIT 1`
const producto = filas[0]

if (!producto) {
  console.error(`No existe el producto ${slug} en la base de datos.`)
  process.exit(1)
}

const url = `/api/media/models/${slug}.glb`

const actualizadas = await sql`
  UPDATE models_3d
     SET glb_url = ${url},
         glb_bytes = ${info.size},
         status = 'ready',
         updated_at = now()
   WHERE product_id = ${producto.id}
  RETURNING id
`

console.log('')
console.log('  GLB publicado:')
console.log(`    producto     : ${slug}`)
console.log(`    archivo      : ${destino}`)
console.log(`    tamaño       : ${(info.size / 1024 / 1024).toFixed(2)} MB`)
console.log(`    URL          : ${url}`)
console.log(`    modelos 3D   : ${actualizadas.length} fila(s) actualizada(s)`)
console.log('')
