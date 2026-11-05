/**
 * Anula un pedido de prueba: devuelve el stock de cada línea y borra el pedido.
 *
 *   node scripts/borrar-pedido.mjs <token> [token...]
 */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const tokens = process.argv.slice(2)
if (tokens.length === 0) {
  console.error('Uso: node scripts/borrar-pedido.mjs <token> [token...]')
  process.exit(1)
}

for (const token of tokens) {
  const pedidos = await sql`SELECT id, code FROM orders WHERE token = ${token}`
  const pedido = pedidos[0]
  if (!pedido) {
    console.log(`no existe: ${token}`)
    continue
  }

  const lineas = await sql`
    SELECT variant_id, qty FROM order_items WHERE order_id = ${pedido.id} AND variant_id IS NOT NULL
  `

  for (const linea of lineas) {
    await sql`
      UPDATE product_variants SET stock = stock + ${linea.qty} WHERE id = ${linea.variant_id}
    `
  }

  await sql`DELETE FROM orders WHERE id = ${pedido.id}`
  console.log(`anulado ${pedido.code}: ${lineas.length} línea(s), stock devuelto`)
}
