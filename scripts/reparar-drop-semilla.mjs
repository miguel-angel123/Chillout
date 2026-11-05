/**
 * Repara el drop sembrado para que no apunte a prendas o imágenes borradas.
 *
 *   node scripts/reparar-drop-semilla.mjs
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const cambios = await sql`
  UPDATE drops
     SET product_slugs = ARRAY['hoodie-rib','quarterzip-stripe']::text[],
         image_url = '/media/products/hoodie-rib-orange-01.jpg'
   WHERE slug = 'carbon-nocturno'
  RETURNING slug, product_slugs, image_url
`

console.log(cambios.length ? `reparado: ${JSON.stringify(cambios[0])}` : 'no existe el drop semilla')
