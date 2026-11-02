/**
 * Looks editoriales.
 *
 * Cada look es una fotografía de campaña con puntos interactivos que enlazan a
 * la prenda que aparece en la imagen. Las coordenadas son porcentajes sobre la
 * fotografía, así que se mantienen al cambiar el tamaño de pantalla.
 *
 * El gerente editará esto desde el panel (módulo 9 completo); por ahora es la
 * semilla curada del catálogo real.
 */

export type Hotspot = {
  /** Posición en porcentaje sobre la imagen. */
  x: number
  y: number
  productSlug: string
  /** Etiqueta corta que se muestra junto al punto. */
  label: string
}

export type Look = {
  slug: string
  title: string
  subtitle: string
  image: string
  alt: string
  hotspots: Hotspot[]
}

export const LOOKS: Look[] = [
  {
    slug: 'tarde-en-la-azotea',
    title: 'Tarde en la azotea',
    subtitle: 'Hoodie acanalado · Naranja quemado',
    image: '/media/products/hoodie-rib-orange-02.jpg',
    alt: 'Modelo con hoodie acanalado naranja quemado en una azotea',
    hotspots: [{ x: 52, y: 58, productSlug: 'hoodie-rib', label: 'Hoodie Acanalado' }],
  },
  {
    slug: 'cafe-en-la-cabana',
    title: 'Café en la cabaña',
    subtitle: 'Suéter polo franjas · Negro y crema',
    image: '/media/products/quarterzip-stripe-black-01.jpg',
    alt: 'Modelo con suéter polo de franjas en un interior de madera',
    hotspots: [{ x: 50, y: 55, productSlug: 'quarterzip-stripe', label: 'Suéter Polo Franjas' }],
  },
  {
    slug: 'escaleras-del-barrio',
    title: 'Escaleras del barrio',
    subtitle: 'Hoodie acanalado · Verde bosque',
    image: '/media/products/hoodie-rib-green-01.jpg',
    alt: 'Modelo con hoodie acanalado verde bosque en unas escaleras',
    hotspots: [{ x: 48, y: 52, productSlug: 'hoodie-rib', label: 'Hoodie Acanalado' }],
  },
]

export function getLooks(): Look[] {
  return LOOKS
}
