export const SITE = {
  name: 'CHILLOUT',
  line: 'MITOS',
  tagline: 'Prendas tejidas',
  description:
    'CHILLOUT · Prendas tejidas de punto grueso confeccionadas en Colombia. Hoodies acanalados y suéteres cuello polo, vistos en 3D antes de comprar.',
  locale: 'es-CO',
  currency: 'COP',
  country: 'Colombia',
  /** Dominio público: se usa en el sitemap y en las URL canónicas. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chillout.co',
  whatsapp: process.env.WHATSAPP_NUMBER ?? '573000000000',
  supportEmail: 'hola@chillout.co',
} as const

export const NAV_LINKS = [
  { href: '/coleccion', label: 'Colección' },
  { href: '/pasarela', label: 'Pasarela' },
  { href: '/lookbook', label: 'Lookbook' },
  { href: '/drops', label: 'Drops' },
  { href: '/comunidad', label: 'Comunidad' },
] as const

/** Enlace Click-to-Chat: gratis e ilimitado (sin API de pago). */
export function waLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`
}
