import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, MessageCircle } from 'lucide-react'
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, getOrderByToken } from '@/lib/orders'
import { formatCop } from '@/lib/format'
import { waLink } from '@/lib/brand'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tu pedido',
  robots: { index: false, follow: false },
}

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getOrderByToken(token)
  if (!data) notFound()

  const { order, items, events } = data
  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status as (typeof ORDER_STATUS_FLOW)[number])

  const message = [
    `Hola CHILLOUT, escribo por el pedido ${order.code}.`,
    ...items.map((item) => `• ${item.name} — ${item.colorName}, talla ${item.size} × ${item.qty}`),
    `Total: ${formatCop(order.totalCop)}`,
  ].join('\n')

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Pedido {order.code}</p>
      <h1 className="mt-3 font-display text-[clamp(1.9rem,4.5vw,3rem)] leading-tight text-ink">
        {order.status === 'cancelled' ? 'Pedido cancelado' : '¡Recibimos tu pedido!'}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-dark">
        {order.status === 'cancelled'
          ? 'Este pedido fue cancelado. Si necesitas ayuda, escríbenos por WhatsApp.'
          : 'Lo revisamos y te contactamos al ' + order.customerPhone + ' para confirmar el pago y el envío.'}
      </p>

      {/* Línea de tiempo */}
      <ol className="mt-10 flex items-center gap-1" aria-label="Estado del pedido">
        {ORDER_STATUS_FLOW.map((status, index) => {
          const reached = currentIndex >= index
          return (
            <li key={status} className="flex flex-1 items-center gap-1">
              <div className="flex flex-1 flex-col items-start gap-2">
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border text-[10px]',
                    reached ? 'border-ink bg-ink text-paper' : 'border-ink/25 text-stone',
                  )}
                >
                  {reached ? <Check className="size-3" strokeWidth={2.5} /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-[9px] tracking-[0.14em] uppercase',
                    reached ? 'text-ink' : 'text-stone',
                  )}
                >
                  {ORDER_STATUS_LABELS[status]}
                </span>
              </div>
              {index < ORDER_STATUS_FLOW.length - 1 ? (
                <span
                  className={cn('mb-6 h-px flex-1', reached ? 'bg-ink/40' : 'bg-ink/10')}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      {/* Detalle */}
      <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-[13px] text-ink">{item.name}</p>
              <p className="mt-0.5 text-[11px] text-stone">
                {item.colorName} · Talla {item.size} · {item.qty} u.
              </p>
            </div>
            <p className="shrink-0 text-[12px] text-ink tabular-nums">
              {formatCop(item.lineTotalCop)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-2">
        <div className="flex justify-between text-[12px]">
          <dt className="text-stone">Subtotal</dt>
          <dd className="text-ink tabular-nums">{formatCop(order.subtotalCop)}</dd>
        </div>
        <div className="flex justify-between text-[12px]">
          <dt className="text-stone">Envío</dt>
          <dd className="text-ink tabular-nums">
            {order.shippingCop === 0 ? 'Gratis' : formatCop(order.shippingCop)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-ink/10 pt-2">
          <dt className="text-[10px] tracking-[0.2em] text-stone uppercase">Total</dt>
          <dd className="text-sm text-ink tabular-nums">{formatCop(order.totalCop)}</dd>
        </div>
      </dl>

      {events.length > 0 ? (
        <ul className="mt-8 space-y-2 border-l border-ink/15 pl-4">
          {events.map((event) => (
            <li key={event.id} className="text-[11px] leading-relaxed text-stone-dark">
              <span className="text-ink">{ORDER_STATUS_LABELS[event.status]}</span>
              {event.message ? ` — ${event.message}` : ''}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href={waLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-ink px-6 py-3.5 text-[11px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
        >
          <MessageCircle className="size-4" strokeWidth={1.7} />
          Escribir por WhatsApp
        </a>
        <Link
          href="/coleccion"
          className="text-[10px] tracking-[0.18em] text-stone-dark uppercase hover:text-ink"
        >
          Seguir comprando
        </Link>
      </div>

      <p className="mt-10 text-[10px] leading-relaxed text-stone">
        Guarda este enlace: es tu comprobante. No lo compartas, contiene los datos de tu pedido.
      </p>
    </div>
  )
}
