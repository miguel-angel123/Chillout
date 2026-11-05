import { eq, sql } from 'drizzle-orm'
import { schema } from '@/db/client'

/**
 * Cupones de descuento.
 *
 * La validación vive aquí y la usan tanto la consulta pública del checkout como
 * la creación del pedido. El cliente puede PREGUNTAR si un cupón sirve, pero
 * nunca decide cuánto se descuenta: al crear el pedido se vuelve a calcular.
 */

export type CuponAplicado = {
  ok: true
  code: string
  kind: 'percent' | 'fixed'
  value: number
  discountCop: number
}

export type CuponRechazado = { ok: false; motivo: string }

export type ResultadoCupon = CuponAplicado | CuponRechazado

/** Normaliza el código: sin espacios y en mayúsculas. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, '')
}

/** Calcula el descuento en pesos sin pasarse del subtotal. */
export function calcularDescuento(
  cupon: { kind: string; value: number },
  subtotalCop: number,
): number {
  if (subtotalCop <= 0) return 0
  const bruto =
    cupon.kind === 'fixed'
      ? Math.round(cupon.value)
      : Math.round((subtotalCop * Math.min(100, Math.max(0, cupon.value))) / 100)
  return Math.max(0, Math.min(subtotalCop, bruto))
}

type BaseDatos = ReturnType<typeof import('@/db/client').getDb>

/**
 * Comprueba un cupón contra la base y devuelve el descuento real para un
 * subtotal dado. No incrementa usos: eso ocurre al confirmar el pedido.
 */
export async function validarCupon(
  db: BaseDatos,
  codigoCrudo: string,
  subtotalCop: number,
): Promise<ResultadoCupon> {
  const code = normalizarCodigo(codigoCrudo)
  if (!code) return { ok: false, motivo: 'Escribe un código' }

  const [cupon] = await db
    .select()
    .from(schema.coupons)
    .where(eq(schema.coupons.code, code))
    .limit(1)

  if (!cupon) return { ok: false, motivo: 'Ese código no existe' }
  if (!cupon.active) return { ok: false, motivo: 'Ese cupón ya no está disponible' }

  const ahora = Date.now()
  if (cupon.validFrom && new Date(cupon.validFrom).getTime() > ahora) {
    return { ok: false, motivo: 'Ese cupón todavía no empieza' }
  }
  if (cupon.validUntil && new Date(cupon.validUntil).getTime() < ahora) {
    return { ok: false, motivo: 'Ese cupón venció' }
  }
  if (cupon.usageLimit !== null && cupon.usedCount >= cupon.usageLimit) {
    return { ok: false, motivo: 'Ese cupón alcanzó su límite de usos' }
  }
  if (subtotalCop < cupon.minSubtotalCop) {
    return {
      ok: false,
      motivo: `Ese cupón aplica desde $ ${new Intl.NumberFormat('es-CO').format(cupon.minSubtotalCop)}`,
    }
  }

  const discountCop = calcularDescuento(cupon, subtotalCop)
  if (discountCop <= 0) return { ok: false, motivo: 'Ese cupón no descuenta nada en este pedido' }

  return {
    ok: true,
    code: cupon.code,
    kind: cupon.kind === 'fixed' ? 'fixed' : 'percent',
    value: cupon.value,
    discountCop,
  }
}

/** Suma un uso al cupón. Se llama solo cuando el pedido quedó registrado. */
export async function registrarUsoCupon(db: BaseDatos, code: string): Promise<void> {
  await db
    .update(schema.coupons)
    .set({ usedCount: sql`${schema.coupons.usedCount} + 1` })
    .where(eq(schema.coupons.code, code))
}
