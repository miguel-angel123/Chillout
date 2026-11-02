/**
 * Fija los precios del catálogo desde seed.json (COP, IVA incluido).
 *   node scripts/set-prices.mjs
 */
import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
    break
  } catch {
    /* sin archivo */
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}

const sql = neon(url)
const seed = JSON.parse(await readFile('src/db/seed.json', 'utf8'))

for (const product of seed.products) {
  await sql`
    UPDATE products
    SET price_cop = ${product.priceCop},
        compare_at_cop = ${product.compareAtCop},
        updated_at = now()
    WHERE slug = ${product.slug}
  `
  await sql`
    UPDATE product_variants
    SET price_cop = ${product.priceCop}
    WHERE product_id = (SELECT id FROM products WHERE slug = ${product.slug})
  `
  console.log(
    `✓ ${product.slug.padEnd(24)} $${(product.priceCop ?? 0).toLocaleString('es-CO')} COP`,
  )
}

const rows = await sql`SELECT slug, price_cop FROM products ORDER BY slug`
console.log('\nprecios en la base:')
for (const row of rows) console.log('  ', row.slug.padEnd(24), row.price_cop)
