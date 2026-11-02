import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin/auth'
import { ORDER_STATUS_LABELS, updateOrderStatus, type OrderStatus } from '@/lib/orders'
import { orderStatusEmail, sendEmail } from '@/lib/notifications/email'

export const runtime = 'nodejs'

const VALID = new Set(Object.keys(ORDER_STATUS_LABELS))

/** Cambia el estado de un pedido y vuelve a la bandeja (sin JavaScript). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const store = await cookies()
  if (!verifyAdminToken(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 })
  }

  const { id } = await params
  const form = await request.formData()
  const status = String(form.get('status') ?? '')

  if (!VALID.has(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const db = getDb()
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1)

  await updateOrderStatus(id, status as OrderStatus)

  // Aviso al cliente solo si dejó correo.
  if (order?.customerEmail) {
    try {
      const template = orderStatusEmail({
        code: order.code,
        statusLabel: ORDER_STATUS_LABELS[status as OrderStatus]!,
        orderUrl: `${new URL(request.url).origin}/pedido/${order.token}`,
      })
      await sendEmail({ ...template, to: order.customerEmail })
    } catch (mailError) {
      console.warn('[orders] aviso de estado no enviado:', (mailError as Error).message)
    }
  }

  return NextResponse.redirect(new URL('/admin/pedidos', request.url), { status: 303 })
}
