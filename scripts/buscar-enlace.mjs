/** Busca en qué página se renderiza un enlace concreto. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const AGUJA = process.argv[3] ?? 'sueter-prueba-studio'

const RUTAS = [
  '/',
  '/coleccion',
  '/producto/hoodie-rib',
  '/producto/quarterzip-solid',
  '/producto/quarterzip-stripe',
  '/producto/hoodie-acanalado-carbon',
  '/lookbook',
  '/pasarela',
  '/drops',
  '/talla',
  '/checkout',
  '/comunidad',
  '/cuenta',
  '/pedido',
  '/legal/terminos',
  '/legal/privacidad',
]

console.log(`Buscando "${AGUJA}"…`)
for (const ruta of RUTAS) {
  const html = await fetch(`${BASE}${ruta}`).then((r) => r.text())
  if (html.includes(AGUJA)) {
    const indice = html.indexOf(AGUJA)
    console.log(`\n  ENCONTRADO en ${ruta}`)
    console.log(`  contexto: …${html.slice(Math.max(0, indice - 160), indice + 80)}…`)
  }
}
console.log('\nfin')
