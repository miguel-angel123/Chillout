/**
 * Conjuntos (módulo 12).
 *
 * Un conjunto es una combinación curada de piezas que funcionan juntas: no es
 * un producto nuevo, sino una forma de comprar el look completo de una vez.
 *
 * Nota de honestidad: hoy el conjunto NO aplica un descuento, porque el carrito
 * cobra el precio de cada pieza. Cuando exista el motor de promociones del
 * administrador, aquí se declarará el descuento y el checkout lo validará en el
 * servidor. Mientras tanto, mostramos el valor combinado real.
 */

export type Conjunto = {
  slug: string
  title: string
  eyebrow: string
  description: string
  /** Piezas que componen el conjunto. */
  productSlugs: string[]
}

export const CONJUNTOS: Conjunto[] = [
  {
    slug: 'noche-en-la-azotea',
    title: 'Noche en la azotea',
    eyebrow: 'Conjunto 01',
    description:
      'Hoodie acanalado de capota alta con el suéter de franjas al hombro. Capas que abrigan sin sumar volumen.',
    productSlugs: ['hoodie-rib', 'quarterzip-stripe'],
  },
  {
    slug: 'oficina-sin-corbata',
    title: 'Oficina sin corbata',
    eyebrow: 'Conjunto 02',
    description:
      'Cuello polo liso y franjas tejidas. Dos cuellos altos, dos formas de llevarlo según el día.',
    productSlugs: ['quarterzip-solid', 'quarterzip-stripe'],
  },
]

export function getConjuntos(): Conjunto[] {
  return CONJUNTOS
}
