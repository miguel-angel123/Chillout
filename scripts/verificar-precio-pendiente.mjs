/** Verifica el bloqueo de compra cuando la prenda no tiene precio. */
import { neon } from '@neondatabase/serverless'
import { chromium } from 'playwright'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const SLUG = 'acanalado-elegante-y-punto-grueso'

const [producto] = await sql`SELECT slug, price_cop FROM products WHERE slug = ${SLUG}`
console.log('producto:', producto?.slug, '· precio:', producto?.price_cop ?? 'NULL')

const variantes = await sql`
  SELECT c.slug AS color, s.label AS talla, v.stock
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    JOIN colors c ON c.id = v.color_id
    JOIN sizes s ON s.id = v.size_id
   WHERE p.slug = ${SLUG}
   ORDER BY s.sort_order
   LIMIT 1
`
console.log('variante disponible:', JSON.stringify(variantes[0] ?? null))

// 1. Ficha: no debe dejar comprar y debe ofrecer WhatsApp
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)

const ficha = await page.evaluate(() => {
  const botones = [...document.querySelectorAll('button')]
  const comprar = botones.find((b) => /precio por confirmar|añadir al carrito|elige una talla/i.test(b.textContent ?? ''))
  const wsp = [...document.querySelectorAll('a')].find((a) => /preguntar el precio/i.test(a.textContent ?? ''))
  return {
    etiquetaBoton: comprar?.textContent?.trim() ?? null,
    deshabilitado: comprar?.disabled ?? null,
    whatsapp: wsp?.getAttribute('href')?.slice(0, 90) ?? null,
  }
})
console.log('ficha:', JSON.stringify(ficha))

await page.screenshot({ path: 'docs/screenshots/ficha-precio-pendiente.png' })
await browser.close()

// 2. API: debe rechazar el pedido
if (variantes[0]) {
  const respuesta = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ slug: SLUG, colorSlug: variantes[0].color, size: variantes[0].talla, qty: 1 }],
      customer: { name: 'Prueba Precio', phone: '3000000000' },
    }),
  })
  console.log('API:', respuesta.status, JSON.stringify(await respuesta.json()))
}
