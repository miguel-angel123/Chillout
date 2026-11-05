/** Comprueba que el descuento se guarda y se ve en la tienda; luego lo retira. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const SLUG = 'quarterzip-stripe'

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')

async function parche(campos) {
  const cuerpo = new FormData()
  cuerpo.set('name', 'Suéter Polo Franjas')
  cuerpo.set('priceCop', campos.precio)
  cuerpo.set('compareAtCop', campos.antes)
  const r = await fetch(`${BASE}/api/admin/productos/${SLUG}`, {
    method: 'PATCH',
    body: cuerpo,
    headers: { cookie },
  })
  return { estado: r.status, datos: await r.json() }
}

// 1. Aplicar −20%
console.log('aplicar:', JSON.stringify(await parche({ precio: '247200', antes: '309000' })))

const html = await fetch(`${BASE}/producto/${SLUG}`).then((r) => r.text())
console.log('ficha muestra 247.200:', html.includes('247.200'))
console.log('ficha muestra 309.000 tachado:', html.includes('309.000'))

const catalogo = await fetch(`${BASE}/coleccion`).then((r) => r.text())
console.log('catalogo muestra −20%:', /−20%|&#x2212;20%/.test(catalogo))

// 2. Retirar el descuento y dejar el precio original
console.log('retirar:', JSON.stringify(await parche({ precio: '309000', antes: '' })))

const despues = await fetch(`${BASE}/producto/${SLUG}`).then((r) => r.text())
console.log('restaurado a 309.000:', despues.includes('309.000'))
console.log('sin −20% en catalogo:', !/−20%|&#x2212;20%/.test(await fetch(`${BASE}/coleccion`).then((r) => r.text())))
