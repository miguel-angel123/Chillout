/** Consulta rápida de variantes con stock para pruebas. */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const filas = await sql`
  SELECT p.slug, c.slug AS color, s.slug AS talla, v.stock, v.price_cop
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    JOIN colors c ON c.id = v.color_id
    JOIN sizes s ON s.id = v.size_id
   WHERE p.slug = ${process.argv[2] ?? 'hoodie-rib'}
   ORDER BY c.slug, s.sort_order
`

for (const f of filas) {
  console.log(`${f.slug} · ${f.color} · ${f.talla} · stock=${f.stock} · ${f.price_cop}`)
}
