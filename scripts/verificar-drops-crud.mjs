/** Verifica crear/editar/borrar drops desde el panel y su efecto en la tienda. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
console.log('login:', login.status, cookie ? '(cookie ok)' : '(sin cookie)')

// Fecha: pasado mañana a las 10:00 Colombia
const objetivo = new Date(Date.now() + 2 * 24 * 3600 * 1000)
const isoColombia = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(objetivo).replace(' ', 'T')

const cuerpo = new FormData()
cuerpo.set('title', 'Drop de Prueba')
cuerpo.set('eyebrow', 'Drop 99')
cuerpo.set('description', 'Cápsula temporal creada por la verificación automática.')
cuerpo.set('launchAt', new Date(`${isoColombia}:00-05:00`).toISOString())
cuerpo.set('unidades', '4')
cuerpo.set('productSlugs', JSON.stringify(['hoodie-rib']))
cuerpo.set('active', 'true')

const crear = await fetch(`${BASE}/api/admin/drops`, { method: 'POST', body: cuerpo, headers: { cookie } })
console.log('crear drop:', crear.status, JSON.stringify(await crear.json()))

// La tienda debe mostrarlo como próximo (es el más cercano en el futuro)
const tienda = await fetch(`${BASE}/drops`).then((r) => r.text())
console.log('tienda muestra el nuevo drop:', tienda.includes('Drop de Prueba'))
console.log('tienda aún muestra la semilla:', tienda.includes('Carbón nocturno'))

// Cambiar la fecha a dentro de 5 días
const nuevaFecha = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
const patch = await fetch(`${BASE}/api/admin/drops`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ slug: 'drop-de-prueba', launchAt: nuevaFecha }),
})
console.log('cambiar fecha:', patch.status, JSON.stringify(await patch.json()))

// Ocultarlo: la tienda debe volver a la semilla
const ocultar = await fetch(`${BASE}/api/admin/drops`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ slug: 'drop-de-prueba', active: false }),
})
console.log('ocultar drop:', ocultar.status)

const trasOcultar = await fetch(`${BASE}/drops`).then((r) => r.text())
console.log('tienda tras ocultar → muestra prueba:', trasOcultar.includes('Drop de Prueba'))
console.log('tienda tras ocultar → muestra semilla:', trasOcultar.includes('Carbón nocturno'))

// Borrar
const borrar = await fetch(`${BASE}/api/admin/drops?slug=drop-de-prueba`, {
  method: 'DELETE',
  headers: { cookie },
})
console.log('borrar drop:', borrar.status, JSON.stringify(await borrar.json()))

// Sin permisos
const sinAuth = await fetch(`${BASE}/api/admin/drops`, {
  method: 'POST',
  body: new FormData(),
})
console.log('sin sesión:', sinAuth.status, '(debe ser 401)')
