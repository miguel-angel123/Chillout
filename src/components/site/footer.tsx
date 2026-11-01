import Link from 'next/link'
import { BrandMark } from '@/components/site/brand-mark'
import { SITE, waLink } from '@/lib/brand'

const COLUMNS = [
  {
    title: 'Tienda',
    links: [
      { href: '/coleccion', label: 'Toda la colección' },
      { href: '/coleccion?tag=Hoodies', label: 'Hoodies' },
      { href: '/coleccion?tag=Su%C3%A9teres', label: 'Suéteres' },
      { href: '/pasarela', label: 'Pasarela digital' },
    ],
  },
  {
    title: 'Experiencia',
    links: [
      { href: '/lookbook', label: 'Lookbook' },
      { href: '/mix-and-match', label: 'Mix & Match' },
      { href: '/talla', label: 'Guía de tallas' },
      { href: '/comunidad', label: 'Visto en la calle' },
    ],
  },
  {
    title: 'Ayuda',
    links: [
      { href: '/pedido', label: 'Seguir mi pedido' },
      { href: '/legal/devoluciones', label: 'Cambios y devoluciones' },
      { href: '/legal/terminos', label: 'Términos y condiciones' },
      { href: '/legal/privacidad', label: 'Tratamiento de datos' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-ink text-paper">
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <BrandMark size="lg" className="text-paper" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-paper/60">
              {SITE.description}
            </p>
            <a
              href={waLink('Hola CHILLOUT, quiero información sobre una prenda.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-copper-bright uppercase hover:text-paper"
            >
              Escríbenos por WhatsApp →
            </a>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-[10px] tracking-[0.28em] text-paper/40 uppercase">{col.title}</h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-paper/70 transition-colors hover:text-paper"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-paper/10 pt-8 text-[11px] text-paper/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CHILLOUT · {SITE.line}. Bogotá, Colombia.</p>
          <p>Precios en COP con IVA incluido.</p>
        </div>
      </div>
    </footer>
  )
}
