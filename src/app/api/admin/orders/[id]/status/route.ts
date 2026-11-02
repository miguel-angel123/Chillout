import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin/auth'
import { ORDER_STATUS_LABELS, updateOrderStatus, type OrderStatus } from '@/lib/orders'

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

  await updateOrderStatus(id, status as OrderStatus)

  return NextResponse.redirect(new URL('/admin/pedidos', request.url), { status: 303 })
}
