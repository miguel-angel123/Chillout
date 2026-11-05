import { asc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'

/**
 * Drops (módulo 14).
 *
 * Un drop es una cápsula limitada: pocas piezas, fecha fija y stock corto.
 * La programación se administra desde el panel y vive en la base de datos.
 * Si la tabla está vacía —o falla la conexión— se usa la semilla de abajo para
 * que la página nunca quede en blanco.
 */

export type Drop = {
  slug: string
  eyebrow: string
  title: string
  description: string
  /** Fecha en ISO con zona horaria de Colombia (UTC−5). */
  lanzamiento: string
  imagen: string
  /** Piezas que entran en la cápsula. */
  productSlugs: string[]
  /** Cuántas unidades por referencia, para dar urgencia. */
  unidadesPorReferencia: number
}

const IMAGEN_POR_DEFECTO = '/media/products/hoodie-rib-orange-01.jpg'

export const DROPS_SEMILLA: Drop[] = [
  {
    slug: 'carbon-nocturno',
    eyebrow: 'Drop 01',
    title: 'Carbón nocturno',
    description:
      'Cinco piezas en punto acanalado teñidas en carbón profundo. Serie corta, sin reposición: cuando se agota, se cierra.',
    lanzamiento: '2026-11-21T10:00:00-05:00',
    imagen: IMAGEN_POR_DEFECTO,
    productSlugs: ['hoodie-rib', 'quarterzip-stripe'],
    unidadesPorReferencia: 6,
  },
]

/** Drops activos, del más próximo al más lejano. */
export async function cargarDrops(): Promise<Drop[]> {
  try {
    const db = getDb()
    const filas = await db
      .select()
      .from(schema.drops)
      .where(eq(schema.drops.active, true))
      .orderBy(asc(schema.drops.launchAt))

    if (filas.length === 0) return DROPS_SEMILLA

    return filas.map((fila) => ({
      slug: fila.slug,
      eyebrow: fila.eyebrow,
      title: fila.title,
      description: fila.description,
      lanzamiento: fila.launchAt.toISOString(),
      imagen: fila.imageUrl || IMAGEN_POR_DEFECTO,
      productSlugs: fila.productSlugs ?? [],
      unidadesPorReferencia: fila.unidadesPorReferencia,
    }))
  } catch {
    return DROPS_SEMILLA
  }
}

/** El próximo drop futuro; si todos pasaron, el más reciente. */
export function proximoDrop(drops: Drop[], ahora = Date.now()): Drop | null {
  const futuros = drops
    .filter((drop) => new Date(drop.lanzamiento).getTime() > ahora)
    .sort((a, b) => new Date(a.lanzamiento).getTime() - new Date(b.lanzamiento).getTime())

  return futuros[0] ?? drops[0] ?? null
}
