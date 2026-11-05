/** Comprueba el sello de rebaja del catálogo con escape Unicode exacto. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const SLUG = 'quarterzip-stripe'
const SENAL = '\u221220%' // MENOS (U+2212) + "20%"

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

console.log('aplicar:', await parche('247200', '309000'))
const catalogo = await fetch(`${BASE}/coleccion`).then((r) => r.text())
const indice = catalogo.indexOf(SENAL)
console.log('sello encontrado:', indice !== -1)
if (indice !== -1) console.log('contexto:', catalogo.slice(Math.max(0, indice - 90), indice + 30))

console.log('retirar:', await parche('309000', ''))
console.log('limpio:', !(await fetch(`${BASE}/coleccion`).then((r) => r.text())).includes(SENAL))
