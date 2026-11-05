/** Comprueba si el servidor está entregando el código nuevo del visor. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

const html = await (await fetch(`${BASE}/producto/hoodie-acanalado-carbon`)).text()
const urls = [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0])
const unicas = [...new Set(urls)]

console.log('chunks referenciados:', unicas.length)

let encontrado = false
for (const url of unicas) {
  try {
    const js = await (await fetch(BASE + url)).text()
    if (js.includes('GLB v3')) {
      console.log('✓ marcador "GLB v3" en', url)
      encontrado = true
      break
    }
    if (js.includes('useGLTF') || js.includes('escalaAncho')) {
      console.log('~ visor presente sin marcador v3 en', url)
    }
  } catch {
    /* chunk no accesible */
  }
}

console.log('')
console.log(encontrado ? 'SERVIDOR CON CÓDIGO NUEVO ✓' : 'SERVIDOR CON CÓDIGO VIEJO ✗')
