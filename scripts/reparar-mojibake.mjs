/**
 * Repara texto con mojibake (UTF-8 leído como Latin-1) en los archivos dados.
 *
 *   node scripts/reparar-mojibake.mjs src/app/api/admin/productos/route.ts ...
 */
import { readFile, writeFile } from 'node:fs/promises'

const ARCHIVOS = process.argv.slice(2)
if (ARCHIVOS.length === 0) {
  console.error('Uso: node scripts/reparar-mojibake.mjs <archivo> [...]')
  process.exit(1)
}

// Las secuencias más largas primero, para no romper «â€”» al sustituir «â€».
const MAPA = [
  ['â”€', '─'],
  ['â”‚', '│'],
  ['â”œ', '├'],
  ['â”¤', '┤'],
  ['â”´', '┴'],
  ['â”¬', '┬'],
  ['â”¼', '┼'],
  ['â€”', '—'],
  ['â€“', '–'],
  ['â€œ', '“'],
  ['â€\u009d', '”'],
  ['â€™', '’'],
  ['â€¦', '…'],
  ['â€', '”'],
  ['Ã³', 'ó'],
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ãº', 'ú'],
  ['Ã±', 'ñ'],
  ['Ã‘', 'Ñ'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Ã—', '×'],
  ['Ãº', 'ú'],
  ['Ã ', 'à'],
]

for (const archivo of ARCHIVOS) {
  const original = await readFile(archivo, 'utf8')
  let texto = original
  let cambios = 0

  for (const [roto, bueno] of MAPA) {
    if (!texto.includes(roto)) continue
    const antes = texto
    texto = texto.split(roto).join(bueno)
    if (texto !== antes) cambios += 1
  }

  if (texto === original) {
    console.log(`sin cambios: ${archivo}`)
    continue
  }

  await writeFile(archivo, texto, 'utf8')
  console.log(`reparado: ${archivo} (${cambios} secuencias)`)
}
