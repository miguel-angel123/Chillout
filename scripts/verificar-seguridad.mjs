/** Verifica el endurecimiento de acceso: límite de intentos y rutas cerradas. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'

async function login(password, ip) {
  const r = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ password }),
  })
  return { estado: r.status, cuerpo: await r.json() }
}

// 1. Intentos fallidos hasta el bloqueo (IP de prueba aislada)
const IP = '203.0.113.77'
console.log('--- fuerza bruta desde una IP ---')
for (let i = 1; i <= 7; i += 1) {
  const r = await login(`clave-mala-${i}`, IP)
  console.log(`  intento ${i}: ${r.estado} ${JSON.stringify(r.cuerpo)}`)
}

// 2. Una IP distinta sigue pudiendo entrar con la buena
const correcto = await login(PASSWORD, '203.0.113.88')
console.log('acceso correcto desde otra IP:', correcto.estado, JSON.stringify(correcto.cuerpo))

// 3. La IP bloqueada no puede entrar ni con la contraseña buena
const bloqueada = await login(PASSWORD, IP)
console.log('IP bloqueada con clave buena:', bloqueada.estado, JSON.stringify(bloqueada.cuerpo))

// 4. La ruta del 3D Studio está cerrada
const upload = await fetch(`${BASE}/api/admin/upload`, { method: 'POST', body: new FormData() })
console.log('antigua ruta de subida:', upload.status, JSON.stringify(await upload.json()))

// 5. Rutas de API sin sesión
for (const ruta of ['/api/admin/productos', '/api/admin/cupones', '/api/admin/drops', '/api/admin/conjuntos']) {
  const r = await fetch(`${BASE}${ruta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  console.log(`  ${ruta.padEnd(28)} sin sesión → ${r.status}`)
}
