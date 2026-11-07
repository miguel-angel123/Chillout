/** Verifica el acceso: bcrypt en base, sesiones revocables y límite persistente. */
import { neon } from '@neondatabase/serverless'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD

function cookieDe(respuesta) {
  return (respuesta.headers.getSetCookie?.() ?? [])
    .filter((c) => c.startsWith('chillout_admin='))
    .map((c) => c.split(';')[0])
    .join('; ')
}

// 1. La base guarda un hash, no la contraseña
const [usuario] = await sql`SELECT email, password_hash, length(password_hash) AS largo FROM admin_users LIMIT 1`
console.log('usuario  :', usuario?.email)
console.log('hash     :', usuario?.password_hash?.slice(0, 7), '…', usuario?.largo, 'caracteres')
console.log('es bcrypt:', usuario?.password_hash?.startsWith('$2'))
console.log('¿guarda la contraseña en claro?:', usuario?.password_hash?.includes(PASSWORD))

// 2. Login correcto
const ok = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = cookieDe(ok)
console.log('\nlogin correcto:', ok.status, cookie ? '(cookie emitida)' : '(sin cookie)')

// 3. La sesión existe en la base y guarda solo el hash del token
const sesiones = await sql`
  SELECT left(token_hash, 8) AS prefijo, revoked_at, expires_at
    FROM admin_sessions ORDER BY created_at DESC LIMIT 1
`
console.log('sesión en base:', JSON.stringify(sesiones[0] ?? null))

// 4. Con esa sesión, el panel responde
const panel = await fetch(`${BASE}/admin/productos`, { headers: { cookie }, redirect: 'manual' })
console.log('panel con sesión:', panel.status)

// 5. Logout: revoca en base y la cookie deja de servir
const salir = await fetch(`${BASE}/api/admin/logout`, {
  method: 'POST',
  headers: { cookie },
  redirect: 'manual',
})
console.log('logout:', salir.status)
const tras = await fetch(`${BASE}/admin/productos`, { headers: { cookie }, redirect: 'manual' })
console.log('panel con la MISMA cookie tras logout:', tras.status, tras.headers.get('location') ?? '')

// 6. Límite de intentos persistente (IP nueva)
console.log('\n--- 6 intentos fallidos desde 198.51.100.99 ---')
for (let i = 1; i <= 6; i += 1) {
  const r = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.99' },
    body: JSON.stringify({ password: `mala-${i}` }),
  })
  const datos = await r.json()
  console.log(`  ${i}: ${r.status} ${JSON.stringify(datos)}`)
}

const intentos = await sql`
  SELECT count(*)::int AS total FROM login_attempts WHERE ip = '198.51.100.99'
`
console.log('intentos registrados en base:', intentos[0]?.total)

// 7. Otra IP con la clave buena sigue entrando
const otra = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.11' },
  body: JSON.stringify({ password: PASSWORD }),
})
console.log('otra IP con clave buena:', otra.status)
