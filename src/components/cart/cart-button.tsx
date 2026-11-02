'use client'

import { useEffect, useState } from 'react'
import { useCart, cartCount } from '@/lib/cart/store'

/** Contador del carrito. Se hidrata en cliente para no romper el SSR. */
export function CartButton({ label }: { label: string }) {
  const items = useCart((state) => state.items)
  const open = useCart((state) => state.open)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const count = mounted ? cartCount(items) : 0

  return (
    <button
      type="button"
      onClick={open}
      aria-label={count > 0 ? `${label}, ${count} artículos` : label}
      className="relative inline-flex size-10 items-center justify-center text-ink/80 transition-colors hover:text-ink"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-hidden>
        <path
          d="M6 8h12l-1 12H7L6 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-copper text-[9px] leading-none text-paper tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  )
}
