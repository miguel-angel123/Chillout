import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const rows = await sql`SELECT slug, status, featured FROM products ORDER BY created_at`
console.log('productos:')
for (const row of rows) console.log('  ', row.slug.padEnd(30), row.status, 'featured=' + row.featured)

const media = await sql`
  SELECT p.slug, m.kind, m.url
  FROM product_media m JOIN products p ON p.id = m.product_id
  WHERE p.slug LIKE 'prueba%'
  ORDER BY m.sort_order
`
console.log('\nmedia de prueba:')
for (const row of media) console.log('  ', row.kind.padEnd(6), row.url)
