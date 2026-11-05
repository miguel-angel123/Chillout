/**
 * Drops (módulo 14).
 *
 * Un drop es una cápsula limitada: pocas piezas, fecha fija y stock corto.
 * Por ahora la programación vive aquí; cuando el administrador pueda crear
 * drops, esta lista se leerá de la base de datos sin cambiar la página.
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

export const DROPS: Drop[] = [
  {
    slug: 'carbon-nocturno',
    eyebrow: 'Drop 01',
    title: 'Carbón nocturno',
    description:
      'Cinco piezas en punto acanalado teñidas en carbón profundo. Serie corta, sin reposición: cuando se agota, se cierra.',
    lanzamiento: '2026-11-21T10:00:00-05:00',
    imagen: '/media/products/hoodie-acanalado-carbon.jpg',
    productSlugs: ['hoodie-acanalado-carbon', 'quarterzip-stripe'],
    unidadesPorReferencia: 6,
  },
]

export function getDrops(): Drop[] {
  return DROPS
}

/** El próximo drop futuro; si todos pasaron, el más reciente. */
export function getNextDrop(ahora = Date.now()): Drop | null {
  const futuros = DROPS.filter((d) => new Date(d.lanzamiento).getTime() > ahora).sort(
    (a, b) => new Date(a.lanzamiento).getTime() - new Date(b.lanzamiento).getTime(),
  )
  return futuros[0] ?? DROPS[0] ?? null
}
