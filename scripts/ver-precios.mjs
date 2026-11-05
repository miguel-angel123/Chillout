/** Revisa precios y stock de un producto concreto. */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const productos = await sql`
  SELECT slug, name, price_cop, compare_at_cop, status
    FROM products
   ORDER BY slug
`
for (const p of productos) {
  console.log(`${p.slug.padEnd(28)} precio=${p.price_cop ?? 'NULL'} antes=${p.compare_at_cop ?? 'NULL'} ${p.status}`)
}

const variantes = await sql`
  SELECT p.slug, c.slug AS color, s.label AS talla, v.stock, v.price_cop
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    JOIN colors c ON c.id = v.color_id
    JOIN sizes s ON s.id = v.size_id
   WHERE p.slug = ${process.argv[2] ?? 'hoodie-acanalado-carbon'}
   ORDER BY c.slug, s.sort_order
`
console.log('\nVariantes:')
for (const v of variantes) {
  console.log(`  ${v.color.padEnd(16)} ${v.talla.padEnd(3)} stock=${v.stock} precio=${v.price_cop ?? 'NULL'}`)
}
