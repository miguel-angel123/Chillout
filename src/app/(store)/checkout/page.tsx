'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Loader2, MessageCircle } from 'lucide-react'
import { cartTotal, useCart } from '@/lib/cart/store'
import { SITE, waLink } from '@/lib/brand'
import { formatCop } from '@/lib/format'

/**
 * Finalización del pedido.
 *
 * Mientras la cuenta de Wompi no esté aprobada, el pedido se cierra por
 * WhatsApp: es gratis, funciona hoy y no bloquea la venta. El formulario de
 * tarjeta se conecta en cuanto existan las llaves de la pasarela.
 */
export default function CheckoutPage() {
  const { items, clear } = useCart()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', city: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = cartTotal(items)

  async function submitOrder() {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            slug: item.slug,
            colorSlug: item.colorSlug,
            size: item.size,
            qty: item.qty,
          })),
          customer: { name: form.name, phone: form.phone, city: form.city },
        }),
      })

      const data = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !data.url) {
        setError(data.error ?? 'No se pudo registrar el pedido')
        setSubmitting(false)
        return
      }

      clear()
      router.push(data.url)
    } catch {
      setError('Error de red al registrar el pedido')
      setSubmitting(false)
    }
  }

  const message = [
    'Hola CHILLOUT, quiero confirmar este pedido:',
    ...items.map(
      (item) =>
        `• ${item.name} — ${item.colorName}, talla ${item.size} × ${item.qty}${
          item.priceCop ? ` (${formatCop(item.priceCop * item.qty)})` : ''
        }`,
    ),
    total !== null ? `Total: ${formatCop(total)} (IVA incluido)` : 'Total: por confirmar',
    form.name ? `A nombre de: ${form.name}` : '',
    form.phone ? `Teléfono: ${form.phone}` : '',
    form.city ? `Ciudad: ${form.city}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Checkout</p>
        <h1 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] text-ink">
          No hay nada que pagar
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-dark">
          Tu carrito está vacío. Agrega una prenda desde la colección para continuar.
        </p>
        <Link
          href="/coleccion"
          className="mt-8 inline-flex bg-ink px-6 py-3.5 text-[11px] tracking-[0.22em] text-paper uppercase hover:bg-copper"
        >
          Ver colección
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:py-16">
      <p className="text-[10px] tracking-[0.3em] text-stone uppercase">Checkout</p>
      <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">Confirma tu pedido</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        {/* Resumen */}
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {items.map((item) => (
            <li key={item.key} className="flex gap-4 py-4">
              <div className="relative size-20 shrink-0 overflow-hidden bg-paper-dim">
                <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{item.name}</p>
                <p className="mt-0.5 text-[11px] text-stone">
                  {item.colorName} · Talla {item.size} · {item.qty} u.
                </p>
              </div>
              <p className="shrink-0 text-[12px] text-ink tabular-nums">
                {item.priceCop !== null ? formatCop(item.priceCop * item.qty) : 'Por confirmar'}
              </p>
            </li>
          ))}
        </ul>

        {/* Datos y cierre */}
        <div>
          <div className="border border-ink/15 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] tracking-[0.2em] text-stone uppercase">Total</span>
              <span className="font-display text-2xl text-ink tabular-nums">
                {total !== null ? formatCop(total) : 'Por confirmar'}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-stone">IVA incluido · Envío se confirma al despachar</p>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-[10px] tracking-[0.22em] text-stone uppercase">Nombre</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-2 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
                placeholder="Nombre y apellido"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] tracking-[0.22em] text-stone uppercase">Teléfono</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-2 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
                  placeholder="300 000 0000"
                  inputMode="tel"
                />
              </label>
              <label className="block">
                <span className="text-[10px] tracking-[0.22em] text-stone uppercase">Ciudad</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-2 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
                  placeholder="Bogotá"
                />
              </label>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-6 border border-copper/40 bg-copper/5 px-3 py-2.5 text-[11px] leading-relaxed text-copper-deep"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={submitOrder}
            disabled={submitting || form.name.trim().length < 2 || form.phone.trim().length < 7}
            className="sheen mt-6 flex w-full items-center justify-center gap-2.5 bg-ink py-4 text-[11px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                Registrando pedido…
              </>
            ) : (
              <>
                Confirmar pedido
                <ArrowRight className="size-4" strokeWidth={1.7} />
              </>
            )}
          </button>

          <a
            href={waLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2.5 border border-ink/20 py-3.5 text-[10px] tracking-[0.2em] text-ink uppercase transition-colors hover:border-ink"
          >
            <MessageCircle className="size-3.5" strokeWidth={1.7} />
            Prefiero cerrarlo por WhatsApp
          </a>

          <p className="mt-4 border border-ink/10 bg-paper-dim px-3 py-2.5 text-[10px] leading-relaxed text-stone-dark">
            El pedido queda registrado con un código y un enlace de seguimiento. El pago en línea con
            tarjeta, PSE y Nequi (Wompi) se activa cuando la cuenta de comercio esté aprobada; por
            ahora lo confirmamos por WhatsApp al {SITE.whatsapp}.
          </p>

          <Link
            href="/coleccion"
            className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[0.18em] text-stone-dark uppercase hover:text-ink"
          >
            Seguir comprando
            <ArrowRight className="size-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </div>
    </div>
  )
}
