/** Busca el sello de rebaja por su parte estable ("20%"). */
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
const html = await fetch(`${BASE}/coleccion`).then((r) => r.text())

const i = html.indexOf('20%')
console.log('índice de "20%":', i)
if (i !== -1) {
  const crudo = html.slice(Math.max(0, i - 120), i + 10)
  console.log('contexto :', crudo.replace(/\s+/g, ' '))
  const menos = crudo.slice(-10, -7)
  console.log('carácter del guion:', JSON.stringify(crudo.split('20%')[0].slice(-1)), 'codePoint', crudo.split('20%')[0].slice(-1).codePointAt(0))
}

await parche('309000', '')
console.log('restaurado')
