import { asc, desc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'

export type OrderStatus = (typeof schema.orderStatus.enumValues)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Recibido',
  confirmed: 'Confirmado',
  packed: 'Empacado',
  shipped: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
]

export async function getOrderByToken(token: string) {
  const db = getDb()

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.token, token))
    .limit(1)

  if (!order) return null

  const [items, events] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, order.id))
      .orderBy(asc(schema.orderEvents.createdAt)),
  ])

  return { order, items, events }
}

export async function listOrders(limit = 100) {
  const db = getDb()
  return db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(limit)
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, message?: string) {
  const db = getDb()
  await db
    .update(schema.orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.orders.id, orderId))

  await db.insert(schema.orderEvents).values({
    orderId,
    status,
    message: message ?? `Estado actualizado a ${ORDER_STATUS_LABELS[status]}`,
  })
}
