import { asc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'

/**
 * Conjuntos (módulo 12).
 *
 * Un conjunto es una combinación curada de piezas que funcionan juntas: no es
 * un producto nuevo, sino la forma de comprar el look completo de una vez.
 * Se administran desde el panel y se muestran dentro del lookbook.
 *
 * Nota de honestidad: hoy el conjunto NO aplica un descuento, porque el carrito
 * cobra el precio de cada pieza. Cuando el descuento por conjunto exista, aquí
 * se declarará y el checkout lo validará en el servidor.
 */

export type Conjunto = {
  slug: string
  title: string
  eyebrow: string
  description: string
  /** Piezas que componen el conjunto. */
  productSlugs: string[]
}

export const CONJUNTOS_SEMILLA: Conjunto[] = [
  {
    slug: 'noche-en-la-azotea',
    title: 'Noche en la azotea',
    eyebrow: 'Conjunto 01',
    description:
      'Hoodie acanalado de capota alta con el suéter de franjas al hombro. Capas que abrigan sin sumar volumen.',
    productSlugs: ['hoodie-rib', 'quarterzip-stripe'],
  },
  {
    slug: 'oficina-sin-corbata',
    title: 'Oficina sin corbata',
    eyebrow: 'Conjunto 02',
    description:
      'Cuello polo liso y franjas tejidas. Dos cuellos altos, dos formas de llevarlo según el día.',
    productSlugs: ['quarterzip-solid', 'quarterzip-stripe'],
  },
]

/** Conjuntos activos; si no hay filas o falla la base, se usa la semilla. */
export async function cargarConjuntos(): Promise<Conjunto[]> {
  try {
    const db = getDb()
    const filas = await db
      .select()
      .from(schema.sets)
      .where(eq(schema.sets.active, true))
      .orderBy(asc(schema.sets.createdAt))

    if (filas.length === 0) return CONJUNTOS_SEMILLA

    return filas.map((fila) => ({
      slug: fila.slug,
      title: fila.title,
      eyebrow: fila.eyebrow,
      description: fila.description,
      productSlugs: fila.productSlugs ?? [],
    }))
  } catch {
    return CONJUNTOS_SEMILLA
  }
}
