import { desc } from 'drizzle-orm'
import { CouponManager } from '@/components/admin/coupon-manager'
import { getDb, schema } from '@/db/client'

export const dynamic = 'force-dynamic'

export default async function CuponesPage() {
  let cupones: {
    code: string
    kind: string
    value: number
    minSubtotalCop: number
    active: boolean
    usageLimit: number | null
    usedCount: number
    validUntil: string | null
  }[] = []
  let dbError: string | null = null

  try {
    const db = getDb()
    cupones = await db
      .select({
        code: schema.coupons.code,
        kind: schema.coupons.kind,
        value: schema.coupons.value,
        minSubtotalCop: schema.coupons.minSubtotalCop,
        active: schema.coupons.active,
        usageLimit: schema.coupons.usageLimit,
        usedCount: schema.coupons.usedCount,
        validUntil: schema.coupons.validUntil,
      })
      .from(schema.coupons)
      .orderBy(desc(schema.coupons.createdAt))
  } catch (error) {
    dbError = (error as Error).message
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Promociones</p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">Cupones</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Códigos que el cliente escribe en el checkout. El descuento se valida en el servidor al
          crear el pedido: aunque alguien manipule el navegador, se cobra lo que la base diga.
        </p>
      </div>

      {dbError ? (
        <p className="mt-6 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          Sin conexión a la base de datos: {dbError}
        </p>
      ) : null}

      <div className="mt-10">
        <CouponManager cupones={cupones} />
      </div>
    </div>
  )
}
