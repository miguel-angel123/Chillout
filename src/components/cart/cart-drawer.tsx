'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { ArrowRight, Minus, Plus, X } from 'lucide-react'
import { cartCount, cartTotal, useCart } from '@/lib/cart/store'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Carrito lateral (módulo 8). Se despliega sin salir de la página para que el
 * cliente no pierda el contexto de compra.
 */
export function CartDrawer() {
  const { items, isOpen, close, setQty, remove } = useCart()

  const total = cartTotal(items)
  const count = cartCount(items)

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!isOpen) return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, close])

  return (
    <>
      {/* Velo */}
      <div
        onClick={close}
        aria-hidden
        className={cn(
          'fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Panel */}
      <aside
        aria-label="Carrito de compras"
        aria-hidden={!isOpen}
        className={cn(
          'fixed top-0 right-0 z-[61] flex h-dvh w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-[420ms] ease-[var(--ease-out-expo)]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <p className="text-[11px] tracking-[0.24em] text-ink uppercase">
            Carrito {count > 0 ? `· ${count}` : ''}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar carrito"
            className="grid size-9 place-items-center text-stone-dark transition-colors hover:text-ink"
          >
            <X className="size-5" strokeWidth={1.6} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-xl text-ink">Tu carrito está vacío</p>
            <p className="mt-2 text-[12px] leading-relaxed text-stone-dark">
              Explora la colección y agrega tus prendas.
            </p>
            <Link
              href="/coleccion"
              onClick={close}
              className="mt-6 inline-flex bg-ink px-6 py-3 text-[10px] tracking-[0.2em] text-paper uppercase hover:bg-copper"
            >
              Ver colección
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 border-b border-ink/10 px-5 py-4">
                  <div className="relative size-20 shrink-0 overflow-hidden bg-paper-dim">
                    <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] text-ink">{item.name}</p>
                        <p className="mt-0.5 text-[10px] tracking-wide text-stone">
                          {item.colorName} · Talla {item.size}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.key)}
                        aria-label={`Quitar ${item.name}`}
                        className="shrink-0 text-stone transition-colors hover:text-copper"
                      >
                        <X className="size-3.5" strokeWidth={1.8} />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center border border-ink/20">
                        <button
                          type="button"
                          onClick={() => setQty(item.key, item.qty - 1)}
                          aria-label="Quitar una unidad"
                          className="grid size-7 place-items-center text-ink/60 hover:text-ink"
                        >
                          <Minus className="size-3" strokeWidth={2} />
                        </button>
                        <span className="w-6 text-center text-[11px] tabular-nums">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(item.key, item.qty + 1)}
                          aria-label="Agregar una unidad"
                          className="grid size-7 place-items-center text-ink/60 hover:text-ink"
                        >
                          <Plus className="size-3" strokeWidth={2} />
                        </button>
                      </div>

                      <p className="text-[11px] text-ink tabular-nums">
                        {item.priceCop !== null ? formatCop(item.priceCop * item.qty) : 'Por confirmar'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-ink/10 px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] tracking-[0.2em] text-stone uppercase">Subtotal</span>
                <span className="text-sm text-ink tabular-nums">
                  {total !== null ? formatCop(total) : 'Por confirmar'}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-stone">IVA incluido · Envío calculado al pagar</p>

              <Link
                href="/checkout"
                onClick={close}
                className="sheen mt-4 flex items-center justify-center gap-2 bg-ink py-3.5 text-[11px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper"
              >
                Ir a pagar
                <ArrowRight className="size-3.5" strokeWidth={1.6} />
              </Link>
              <button
                type="button"
                onClick={close}
                className="mt-2 w-full py-2 text-[10px] tracking-[0.18em] text-stone-dark uppercase hover:text-ink"
              >
                Seguir comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}
