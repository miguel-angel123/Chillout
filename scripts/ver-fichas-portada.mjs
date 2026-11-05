/** Lista los enlaces a fichas de producto que aparecen en una página. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const RUTA = process.argv[3] ?? '/'

const html = await fetch(`${BASE}${RUTA}`).then((r) => r.text())
const enlaces = [...html.matchAll(/\/producto\/([a-z0-9-]+)/g)].map((m) => m[1])
const unicos = [...new Set(enlaces)]

console.log(`Fichas enlazadas desde ${RUTA}: ${unicos.length}`)
for (const slug of unicos) console.log(`  ${slug}`)

// Estado real de cada una
for (const slug of unicos) {
  const r = await fetch(`${BASE}/producto/${slug}`)
  console.log(`  /producto/${slug} → ${r.status}`)
}
