import { asc } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'

/**
 * Guía de tallas y recomendador (módulo 11).
 *
 * Las medidas que guarda la base son de la PRENDA (contorno completo, ya
 * abierta en plano y multiplicada por dos), no del cuerpo. Esa distinción es la
 * que evita devoluciones, así que la interfaz la dice explícitamente.
 */

export type Talla = {
  slug: string
  label: string
  chestCm: number | null
  lengthCm: number | null
  sleeveCm: number | null
}

export const TALLAS_SEMILLA: Talla[] = [
  { slug: 's', label: 'S', chestCm: 104, lengthCm: 66, sleeveCm: 60 },
  { slug: 'm', label: 'M', chestCm: 110, lengthCm: 68, sleeveCm: 61 },
  { slug: 'l', label: 'L', chestCm: 116, lengthCm: 70, sleeveCm: 62 },
  { slug: 'xl', label: 'XL', chestCm: 122, lengthCm: 72, sleeveCm: 63 },
]

export async function cargarTallas(): Promise<Talla[]> {
  try {
    const db = getDb()
    const filas = await db
      .select({
        slug: schema.sizes.slug,
        label: schema.sizes.label,
        chestCm: schema.sizes.chestCm,
        lengthCm: schema.sizes.lengthCm,
        sleeveCm: schema.sizes.sleeveCm,
      })
      .from(schema.sizes)
      .orderBy(asc(schema.sizes.sortOrder))

    if (filas.length === 0) return TALLAS_SEMILLA
    return filas
  } catch {
    return TALLAS_SEMILLA
  }
}

export type Calce = 'ajustado' | 'regular' | 'holgado'

/** Holgura recomendada entre el pecho del cuerpo y el contorno de la prenda. */
const HOLGURA: Record<Calce, number> = {
  ajustado: 4,
  regular: 8,
  holgado: 14,
}

export type Recomendacion =
  | { ok: true; talla: Talla; contorno: number; holguraReal: number; holguraBuscada: number }
  | { ok: false; motivo: string; talla?: Talla }

/**
 * Recomienda la talla más pequeña cuyo contorno de prenda cubra el pecho del
 * cliente con la holgura que pide.
 */
export function recomendarTalla(
  tallas: Talla[],
  pechoCm: number,
  calce: Calce = 'regular',
): Recomendacion {
  if (!Number.isFinite(pechoCm) || pechoCm < 60 || pechoCm > 180) {
    return { ok: false, motivo: 'Escribe un contorno de pecho entre 60 y 180 cm.' }
  }

  const utils = tallas
    .filter((t) => typeof t.chestCm === 'number' && t.chestCm > 0)
    .sort((a, b) => (a.chestCm ?? 0) - (b.chestCm ?? 0))

  if (utils.length === 0) {
    return { ok: false, motivo: 'Todavía no hay medidas cargadas.' }
  }

  const holguraBuscada = HOLGURA[calce]
  const objetivo = pechoCm + holguraBuscada
  const elegida = utils.find((t) => (t.chestCm ?? 0) >= objetivo)

  if (!elegida) {
    const grande = utils[utils.length - 1]
    return {
      ok: false,
      motivo: `La talla ${grande.label} es la más grande y no llega a la holgura de ${calce}. Escríbenos y lo miramos contigo.`,
      talla: grande,
    }
  }

  return {
    ok: true,
    talla: elegida,
    contorno: elegida.chestCm ?? 0,
    holguraReal: (elegida.chestCm ?? 0) - pechoCm,
    holguraBuscada,
  }
}
