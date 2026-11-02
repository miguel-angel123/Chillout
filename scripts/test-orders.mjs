/** Prueba el registro de pedidos de punta a punta. node scripts/test-orders.mjs */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const log = (...a) => console.log('[pedido]', ...a)

const payload = {
  items: [{ slug: 'hoodie-rib', colorSlug: 'naranja-quemado', size: 'M', qty: 2 }],
  customer: { name: 'Cliente Prueba', phone: '3001234567', city: 'Bogotá' },
}

const res = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
})
const data = await res.json()
log('crear pedido:', res.status)
console.log(JSON.stringify(data, null, 2))

if (!res.ok) process.exit(1)

const page = await fetch(`${BASE}${data.url}`)
const html = await page.text()
log('página del pedido:', page.status)
log('incluye el código:', html.includes(data.code))
log('incluye el total:', html.includes('total') || /\$\s?\d/.test(html))
log('url:', data.url)
