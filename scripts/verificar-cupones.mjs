/**
 * Verifica el flujo de cupones de punta a punta:
 * crear cupÃ³n â†’ validar en el checkout â†’ crear pedido â†’ comprobar descuento.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const CODIGO = 'CHILLOUT10'

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
console.log('login:', login.status, cookie ? '(cookie ok)' : '(sin cookie)')

// 1. Crear el cupÃ³n (si ya existe, se informa)
const crear = await fetch(`${BASE}/api/admin/cupones`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ code: CODIGO, kind: 'percent', value: 10, minSubtotal: 200000 }),
})
const creado = await crear.json()
console.log('crear cupÃ³n:', crear.status, JSON.stringify(creado))

// 2. Validarlo como lo harÃ­a el checkout
const validar = await fetch(`${BASE}/api/cupones/validar`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ code: CODIGO.toLowerCase(), subtotal: 638000 }),
})
const valido = await validar.json()
console.log('validar (638.000):', validar.status, JSON.stringify(valido))

// 2b. CÃ³digo invÃ¡lido
const malo = await fetch(`${BASE}/api/cupones/validar`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ code: 'NOEXISTE', subtotal: 638000 }),
})
console.log('cÃ³digo falso:', malo.status, JSON.stringify(await malo.json()))

// 2c. Compra por debajo del mÃ­nimo
const bajo = await fetch(`${BASE}/api/cupones/validar`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ code: CODIGO, subtotal: 100000 }),
})
console.log('compra mÃ­nima:', bajo.status, JSON.stringify(await bajo.json()))

// 3. Crear un pedido real con el cupÃ³n
const pedido = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    items: [{ slug: 'hoodie-rib', colorSlug: 'naranja-quemado', size: 'S', qty: 1 }],
    customer: { name: 'Prueba Cupon', phone: '3000000000', city: 'BogotÃ¡' },
    couponCode: CODIGO,
  }),
})
const pedidoDatos = await pedido.json()
console.log('crear pedido:', pedido.status)
console.log('  subtotal   :', pedidoDatos.subtotalCop)
console.log('  descuento  :', pedidoDatos.discountCop)
console.log('  cupÃ³n      :', pedidoDatos.couponCode)
console.log('  envÃ­o      :', pedidoDatos.shippingCop)
console.log('  total      :', pedidoDatos.totalCop)
console.log('  cÃ³digo     :', pedidoDatos.code)

// 4. Intentar el mismo cupÃ³n con un cÃ³digo manipulado: debe ignorarse
const manipulado = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    items: [{ slug: 'hoodie-rib', colorSlug: 'naranja-quemado', size: 'S', qty: 1 }],
    customer: { name: 'Prueba Sin Cupon', phone: '3000000000', city: 'BogotÃ¡' },
    couponCode: 'INVENTADO99',
  }),
})
const manipuladoDatos = await manipulado.json()
console.log('pedido con cupÃ³n falso â†’ descuento:', manipuladoDatos.discountCop, '(debe ser 0)')

console.log('\nPEDIDOS_A_BORRAR:', [pedidoDatos.token, manipuladoDatos.token].filter(Boolean).join(' '))

