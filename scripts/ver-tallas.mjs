/** Lista las tallas con sus medidas de confección. */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)

const filas = await sql`
  SELECT slug, label, chest_cm, length_cm, sleeve_cm, sort_order
    FROM sizes
   ORDER BY sort_order
`

for (const fila of filas) {
  console.log(
    `${fila.slug.padEnd(3)} ${fila.label.padEnd(4)} pecho=${fila.chest_cm ?? '—'} largo=${fila.length_cm ?? '—'} manga=${fila.sleeve_cm ?? '—'} orden=${fila.sort_order}`,
  )
}
