'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Carrito del cliente.
 *
 * Vive en el navegador (localStorage) para que la navegación sea instantánea y
 * no dependa de la red. El pedido se materializa en el servidor recién al
 * finalizar el checkout, donde se vuelven a validar precios y stock: el total
 * del cliente nunca es autoridad.
 */

export type CartItem = {
  /** slug + color + talla: identifica la variante comprada. */
  key: string
  slug: string
  name: string
  colorSlug: string
  colorName: string
  size: string
  priceCop: number | null
  image: string
  qty: number
}

type CartState = {
  items: CartItem[]
  isOpen: boolean
  add: (item: Omit<CartItem, 'key' | 'qty'>, qty?: number) => void
  remove: (key: string) => void
  setQty: (key: string, qty: number) => void
  open: () => void
  close: () => void
  clear: () => void
}

export function cartKey(slug: string, colorSlug: string, size: string) {
  return `${slug}::${colorSlug}::${size}`
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      add: (item, qty = 1) =>
        set((state) => {
          const key = cartKey(item.slug, item.colorSlug, item.size)
          const existing = state.items.find((entry) => entry.key === key)

          const items = existing
            ? state.items.map((entry) =>
                entry.key === key ? { ...entry, qty: Math.min(99, entry.qty + qty) } : entry,
              )
            : [...state.items, { ...item, key, qty }]

          return { items, isOpen: true }
        }),

      remove: (key) =>
        set((state) => ({ items: state.items.filter((entry) => entry.key !== key) })),

      setQty: (key, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((entry) => entry.key !== key)
              : state.items.map((entry) =>
                  entry.key === key ? { ...entry, qty: Math.min(99, qty) } : entry,
                ),
        })),

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'chillout-cart',
      // La apertura del panel no debe persistirse entre sesiones.
      partialize: (state) => ({ items: state.items }),
    },
  ),
)

/** Total en COP. Devuelve null si algún ítem no tiene precio definido. */
export function cartTotal(items: CartItem[]): number | null {
  let total = 0
  for (const item of items) {
    if (item.priceCop === null) return null
    total += item.priceCop * item.qty
  }
  return total
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0)
}
