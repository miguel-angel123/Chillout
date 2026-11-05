/**
 * Verifica los conjuntos: sección en el lookbook, redirección de la ruta vieja
 * y CRUD desde el panel.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
console.log('login:', login.status)

// 1. Lookbook con la sección de conjuntos
const lookbook = await fetch(`${BASE}/lookbook`).then((r) => r.text())
console.log('lookbook tiene ancla #conjuntos :', lookbook.includes('id="conjuntos"'))
console.log('lookbook muestra "El look completo":', lookbook.includes('El look completo'))
console.log('lookbook muestra "Noche en la azotea":', lookbook.includes('Noche en la azotea'))

// 2. Ruta antigua redirige
const vieja = await fetch(`${BASE}/mix-and-match`, { redirect: 'manual' })
console.log('mix-and-match:', vieja.status, '→', vieja.headers.get('location'))

// 3. Crear conjunto desde el panel
const crear = await fetch(`${BASE}/api/admin/conjuntos`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({
    title: 'Conjunto de Prueba',
    eyebrow: 'Conjunto 99',
    description: 'Creado por la verificación automática.',
    productSlugs: ['hoodie-rib', 'quarterzip-solid'],
  }),
})
console.log('crear conjunto:', crear.status, JSON.stringify(await crear.json()))

const trasCrear = await fetch(`${BASE}/lookbook`).then((r) => r.text())
console.log('lookbook muestra el conjunto nuevo:', trasCrear.includes('Conjunto de Prueba'))

// 4. Ocultarlo
const ocultar = await fetch(`${BASE}/api/admin/conjuntos`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ slug: 'conjunto-de-prueba', active: false }),
})
console.log('ocultar:', ocultar.status)

const trasOcultar = await fetch(`${BASE}/lookbook`).then((r) => r.text())
console.log('lookbook tras ocultar → muestra prueba:', trasOcultar.includes('Conjunto de Prueba'))

// 5. Validación: menos de dos piezas
const invalido = await fetch(`${BASE}/api/admin/conjuntos`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ title: 'Solo una', productSlugs: ['hoodie-rib'] }),
})
console.log('con una sola pieza:', invalido.status, JSON.stringify(await invalido.json()))

// 6. Borrar
const borrar = await fetch(`${BASE}/api/admin/conjuntos?slug=conjunto-de-prueba`, {
  method: 'DELETE',
  headers: { cookie },
})
console.log('borrar:', borrar.status, JSON.stringify(await borrar.json()))

// 7. Sin sesión
const sinAuth = await fetch(`${BASE}/api/admin/conjuntos`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: 'Intruso', productSlugs: ['hoodie-rib', 'quarterzip-solid'] }),
})
console.log('sin sesión:', sinAuth.status, '(debe ser 401)')
