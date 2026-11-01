/**
 * Borra la base local de PGlite para reiniciar el catálogo desde cero.
 *   pnpm db:reset
 */
import { rm } from 'node:fs/promises'

const dir = process.env.PGLITE_DIR ?? '.data/chillout'

await rm(dir, { recursive: true, force: true })
console.log(`✓ Base local eliminada: ${dir}`)
