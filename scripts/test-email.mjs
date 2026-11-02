/** Prueba el pedido con correo y verifica la salida en .data/outbox. */
import { readdir, readFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const log = (...a) => console.log('[email]', ...a)

const res = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    items: [{ slug: 'quarterzip-solid', colorSlug: 'azul-marino', size: 'M', qty: 1 }],
    customer: {
      name: 'Ana Prueba',
      phone: '3109998877',
      email: 'ana@ejemplo.com',
      city: 'Medellín',
    },
  }),
})
const data = await res.json()
log('pedido:', res.status, data.code ?? data.error)
if (!res.ok) process.exit(1)

const files = (await readdir('.data/outbox')).filter((f) => f.endsWith('.html')).sort()
log('correos en outbox:', files.length)
const last = files.at(-1)
if (!last) {
  log('FALLO: no se escribió ningún correo')
  process.exit(1)
}

const html = await readFile(`.data/outbox/${last}`, 'utf8')
log('archivo:', last)
log('asunto correcto:', html.includes(`Pedido ${data.code} recibido`))
log('incluye el total:', html.includes('Total'))
log('incluye el nombre:', html.includes('Ana Prueba'))
