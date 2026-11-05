/** Diagnóstico: ¿el catálogo recibe el precio con descuento? */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const SLUG = 'quarterzip-stripe'

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')

async function parche(precio, antes) {
  const cuerpo = new FormData()
  cuerpo.set('name', 'Suéter Polo Franjas')
  cuerpo.set('priceCop', precio)
  cuerpo.set('compareAtCop', antes)
  const r = await fetch(`${BASE}/api/admin/productos/${SLUG}`, {
    method: 'PATCH',
    body: cuerpo,
    headers: { cookie },
  })
  return r.status
}

await parche('247200', '309000')

const catalogo = await fetch(`${BASE}/coleccion`).then((r) => r.text())
console.log('catalogo contiene 247.200:', catalogo.includes('247.200'))
console.log('catalogo contiene 309.000:', catalogo.includes('309.000'))
console.log('catalogo contiene 247000  :', catalogo.includes('247000'))
console.log('catalogo contiene la clase bg-copper:', catalogo.includes('bg-copper'))

// Snippet alrededor del nombre del producto
const i = catalogo.indexOf('Suéter Polo Franjas')
console.log('\n--- fragmento ---')
console.log(catalogo.slice(Math.max(0, i - 700), i + 400).replace(/\s+/g, ' '))

await parche('309000', '')
console.log('\nrestaurado')
