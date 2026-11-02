import Link from 'next/link'
import { ORDER_STATUS_LABELS, listOrders } from '@/lib/orders'
import { formatCop } from '@/lib/format'

export const dynamic = 'force-dynamic'

const dateFormat = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default async function AdminOrdersPage() {
  let orders: Awaited<ReturnType<typeof listOrders>> = []
  let error: string | null = null

  try {
    orders = await listOrders()
  } catch (caught) {
    error = (caught as Error).message
  }

  const pending = orders.filter((order) => order.status === 'pending').length
  const revenue = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.totalCop, 0)

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Pedidos</p>
      <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">Bandeja de pedidos</h1>

      {error ? (
        <p className="mt-6 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          No se pudieron cargar los pedidos: {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-px border border-ink/10 sm:grid-cols-3">
        <div className="bg-paper p-5">
          <p className="font-display text-3xl text-ink tabular-nums">{orders.length}</p>
          <p className="mt-1 text-[10px] tracking-[0.2em] text-stone uppercase">Pedidos</p>
        </div>
        <div className="bg-paper p-5">
          <p className="font-display text-3xl text-ink tabular-nums">{pending}</p>
          <p className="mt-1 text-[10px] tracking-[0.2em] text-stone uppercase">Por confirmar</p>
        </div>
        <div className="bg-paper p-5">
          <p className="font-display text-3xl text-ink tabular-nums">{formatCop(revenue)}</p>
          <p className="mt-1 text-[10px] tracking-[0.2em] text-stone uppercase">Valor registrado</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="mt-10 border border-dashed border-ink/20 px-6 py-16 text-center">
          <p className="font-display text-xl text-ink">Todavía no hay pedidos</p>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-stone-dark">
            Cuando un cliente confirme su compra aparecerá aquí con su código y estado.
          </p>
          <Link
            href="/coleccion"
            className="mt-6 inline-flex bg-ink px-5 py-3 text-[10px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
          >
            Ver la tienda
          </Link>
        </div>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/15">
                {['Código', 'Fecha', 'Cliente', 'Teléfono', 'Total', 'Estado'].map((heading) => (
                  <th
                    key={heading}
                    className="py-3 pr-4 text-[9px] tracking-[0.2em] text-stone uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-ink/10">
                  <td className="py-3 pr-4 text-[12px] text-ink">{order.code}</td>
                  <td className="py-3 pr-4 text-[11px] text-stone">
                    {dateFormat.format(new Date(order.createdAt))}
                  </td>
                  <td className="py-3 pr-4 text-[12px] text-ink">{order.customerName}</td>
                  <td className="py-3 pr-4 text-[11px] text-stone tabular-nums">
                    {order.customerPhone}
                  </td>
                  <td className="py-3 pr-4 text-[12px] text-ink tabular-nums">
                    {formatCop(order.totalCop)}
                  </td>
                  <td className="py-3 pr-4">
                    <form
                      action={`/api/admin/orders/${order.id}/status`}
                      method="post"
                      className="flex items-center gap-2"
                    >
                      <select
                        name="status"
                        defaultValue={order.status}
                        aria-label={`Estado del pedido ${order.code}`}
                        className="border border-ink/20 bg-paper px-2 py-1 text-[11px] outline-none focus:border-ink"
                      >
                        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="border border-ink/20 px-2 py-1 text-[9px] tracking-[0.14em] text-ink uppercase hover:bg-ink hover:text-paper"
                      >
                        Guardar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
