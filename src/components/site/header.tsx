import Link from 'next/link'
import { Menu, Search, ShoppingBag, User } from 'lucide-react'
import { BrandMark } from '@/components/site/brand-mark'
import { NAV_LINKS, SITE } from '@/lib/brand'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
      {/* Barra superior */}
      <div className="border-b border-ink/10 bg-ink text-paper">
        <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-between px-4 text-[10px] tracking-[0.22em] uppercase sm:px-6">
          <span className="text-paper/70">Envío gratis desde $250.000</span>
          <span className="hidden text-paper/70 sm:inline">Confeccionado en Colombia</span>
          <a href={`https://wa.me/${SITE.whatsapp}`} className="text-paper/70 transition-colors hover:text-copper-bright">
            WhatsApp
          </a>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:h-20">
        {/* Móvil: menú */}
        <button
          type="button"
          aria-label="Abrir menú"
          className="inline-flex size-10 items-center justify-center text-ink lg:hidden"
        >
          <Menu className="size-5" strokeWidth={1.5} />
        </button>

        {/* Marca */}
        <Link href="/" aria-label="CHILLOUT — inicio" className="shrink-0">
          <BrandMark size="md" />
        </Link>

        {/* Navegación escritorio */}
        <nav aria-label="Principal" className="ml-6 hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-[11px] tracking-[0.2em] text-ink/80 uppercase transition-colors hover:text-ink"
            >
              {link.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-copper transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Buscar"
            className="inline-flex size-10 items-center justify-center text-ink/80 transition-colors hover:text-ink"
          >
            <Search className="size-[18px]" strokeWidth={1.5} />
          </button>
          <Link
            href="/cuenta"
            aria-label="Mi cuenta"
            className="hidden size-10 items-center justify-center text-ink/80 transition-colors hover:text-ink sm:inline-flex"
          >
            <User className="size-[18px]" strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            aria-label="Carrito, 0 artículos"
            className="relative inline-flex size-10 items-center justify-center text-ink/80 transition-colors hover:text-ink"
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.5} />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-copper" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
