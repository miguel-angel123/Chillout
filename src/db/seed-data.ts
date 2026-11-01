/**
 * Catálogo semilla de CHILLOUT — fuente única de verdad.
 *
 * Derivado de las 19 fotografías reales de la marca en `Chillout_imagenes/`.
 * Todo es editable desde el admin; esto solo siembra la primera versión.
 */

export type SeedColor = {
  slug: string
  name: string
  /** Hex sin "#" */
  hex: string
}

export const SEED_COLORS: SeedColor[] = [
  { slug: 'naranja-quemado', name: 'Naranja quemado', hex: 'A9542E' },
  { slug: 'negro', name: 'Negro', hex: '121110' },
  { slug: 'verde-bosque', name: 'Verde bosque', hex: '123A2E' },
  { slug: 'azul-marino', name: 'Azul marino', hex: '1C2B45' },
  { slug: 'borgona', name: 'Borgoña', hex: '5A2130' },
  { slug: 'crema', name: 'Crema', hex: 'EDE7DA' },
]

export type SeedSize = {
  slug: string
  label: string
  sortOrder: number
  chestCm: number
  lengthCm: number
  sleeveCm: number
}

export const SEED_SIZES: SeedSize[] = [
  { slug: 's', label: 'S', sortOrder: 1, chestCm: 104, lengthCm: 66, sleeveCm: 60 },
  { slug: 'm', label: 'M', sortOrder: 2, chestCm: 110, lengthCm: 68, sleeveCm: 61 },
  { slug: 'l', label: 'L', sortOrder: 3, chestCm: 116, lengthCm: 70, sleeveCm: 62 },
  { slug: 'xl', label: 'XL', sortOrder: 4, chestCm: 122, lengthCm: 72, sleeveCm: 63 },
]

export type SeedImage = {
  url: string
  alt: string
  kind: 'front' | 'back' | 'detail' | 'editorial' | 'flat'
  isEditorial?: boolean
}

export type SeedVariantColor = {
  colorSlug: string
  images: SeedImage[]
  /** Stock por talla; ausente ⇒ 0 */
  stock: Record<string, number>
}

export type SeedProduct = {
  slug: string
  name: string
  subtitle: string
  description: string
  line: 'CHILLOUT' | 'MITOS'
  category: string
  fit: 'slim' | 'regular' | 'oversize'
  fabric: string
  priceCop: number
  compareAtCop?: number
  tags: string[]
  featured: boolean
  colors: SeedVariantColor[]
}

const HOODIE_DESC =
  'Hoodie tejido en punto acanalado de gramaje alto. Capota doble con cordón, bolsillo canguro y puños elásticos. ' +
  'La caída es amplia sin perder estructura: abriga sin verse rígido. Confeccionado en Colombia.'

const QZ_DESC =
  'Suéter de cuello polo con medio zip metálico y acanalado vertical fino. Escote alto que sostiene la forma, ' +
  'mangas rectas con puño tejido y bajo elástico. Un básico de temporada que combina con sastrería o jean.'

const QZ_STRIPE_DESC =
  'Suéter de cuello polo con medio zip y dos franjas en contraste sobre el pecho, tejidas en el cuerpo (no estampadas). ' +
  'El acanalado grueso da textura visible y el contraste en crema define la silueta.'

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: 'hoodie-rib',
    name: 'Hoodie Acanalado',
    subtitle: 'Punto grueso · Capota',
    description: HOODIE_DESC,
    line: 'CHILLOUT',
    category: 'hoodies',
    fit: 'oversize',
    fabric: '60% algodón, 40% acrílico · 580 g/m²',
    priceCop: 329000,
    tags: ['Heavyweight', 'Oversize', 'Hoodies', 'Básicos'],
    featured: true,
    colors: [
      {
        colorSlug: 'naranja-quemado',
        images: [
          { url: '/media/products/hoodie-rib-orange-01.jpg', alt: 'Hoodie acanalado naranja quemado, vista frontal con capota y bolsillo canguro', kind: 'front' },
          { url: '/media/products/hoodie-rib-orange-02.jpg', alt: 'Hoodie acanalado naranja quemado en modelo, detalle de puño acanalado', kind: 'editorial', isEditorial: true },
        ],
        stock: { s: 4, m: 2, l: 6, xl: 1 },
      },
      {
        colorSlug: 'negro',
        images: [
          { url: '/media/products/hoodie-rib-black-01.jpg', alt: 'Hoodie acanalado negro, vista frontal con bolsillo canguro', kind: 'front' },
          { url: '/media/products/hoodie-rib-black-02.jpg', alt: 'Hoodie acanalado negro en modelo urbano', kind: 'editorial', isEditorial: true },
        ],
        stock: { s: 8, m: 5, l: 3, xl: 2 },
      },
      {
        colorSlug: 'verde-bosque',
        images: [
          { url: '/media/products/hoodie-rib-green-01.jpg', alt: 'Hoodie acanalado verde bosque, vista frontal', kind: 'front' },
          { url: '/media/products/hoodie-rib-green-02.jpg', alt: 'Hoodie acanalado verde bosque en modelo', kind: 'editorial', isEditorial: true },
        ],
        stock: { s: 3, m: 4, l: 0, xl: 0 },
      },
    ],
  },
  {
    slug: 'quarterzip-solid',
    name: 'Suéter Cuello Polo',
    subtitle: 'Medio zip · Acanalado fino',
    description: QZ_DESC,
    line: 'CHILLOUT',
    category: 'sueteres',
    fit: 'regular',
    fabric: '55% algodón, 45% acrílico · 420 g/m²',
    priceCop: 289000,
    tags: ['Básicos', 'Suéteres', 'Cuello polo'],
    featured: true,
    colors: [
      {
        colorSlug: 'azul-marino',
        images: [{ url: '/media/products/quarterzip-solid-navy-01.jpg', alt: 'Suéter cuello polo azul marino con medio zip, sobre perchero', kind: 'flat' }],
        stock: { s: 5, m: 7, l: 4, xl: 2 },
      },
      {
        colorSlug: 'negro',
        images: [{ url: '/media/products/quarterzip-solid-black-01.jpg', alt: 'Suéter cuello polo negro con medio zip, sobre perchero', kind: 'flat' }],
        stock: { s: 6, m: 3, l: 5, xl: 1 },
      },
      {
        colorSlug: 'borgona',
        images: [{ url: '/media/products/quarterzip-solid-burgundy-01.jpg', alt: 'Suéter cuello polo borgoña con medio zip, sobre perchero', kind: 'flat' }],
        stock: { s: 2, m: 4, l: 2, xl: 0 },
      },
      {
        colorSlug: 'crema',
        images: [{ url: '/media/products/quarterzip-solid-cream-01.jpg', alt: 'Suéter cuello polo crema con medio zip dorado, sobre perchero', kind: 'flat' }],
        stock: { s: 1, m: 2, l: 1, xl: 1 },
      },
    ],
  },
  {
    slug: 'quarterzip-stripe',
    name: 'Suéter Polo Franjas',
    subtitle: 'Medio zip · Franjas tejidas',
    description: QZ_STRIPE_DESC,
    line: 'CHILLOUT',
    category: 'sueteres',
    fit: 'regular',
    fabric: '55% algodón, 45% acrílico · 460 g/m²',
    priceCop: 309000,
    compareAtCop: 359000,
    tags: ['Cuello polo', 'Suéteres', 'Básicos'],
    featured: true,
    colors: [
      {
        colorSlug: 'azul-marino',
        images: [{ url: '/media/products/quarterzip-stripe-navy-01.jpg', alt: 'Suéter polo franjas azul marino con franjas crema, en modelo', kind: 'editorial', isEditorial: true }],
        stock: { s: 4, m: 6, l: 3, xl: 1 },
      },
      {
        colorSlug: 'verde-bosque',
        images: [{ url: '/media/products/quarterzip-stripe-green-01.jpg', alt: 'Suéter polo franjas verde bosque con franjas crema, en modelo', kind: 'editorial', isEditorial: true }],
        stock: { s: 3, m: 2, l: 4, xl: 2 },
      },
      {
        colorSlug: 'negro',
        images: [{ url: '/media/products/quarterzip-stripe-black-01.jpg', alt: 'Suéter polo franjas negro con franjas crema, en modelo', kind: 'editorial', isEditorial: true }],
        stock: { s: 5, m: 4, l: 2, xl: 0 },
      },
      {
        colorSlug: 'crema',
        images: [{ url: '/media/products/quarterzip-stripe-cream-01.jpg', alt: 'Suéter polo franjas crema con franjas azul marino, en modelo', kind: 'editorial', isEditorial: true }],
        stock: { s: 2, m: 3, l: 1, xl: 1 },
      },
    ],
  },
]

export const SEED_COLLECTIONS = [
  { slug: 'nueva-coleccion', name: 'Nueva colección', description: 'Tejidos de temporada en punto grueso.' },
  { slug: 'mitos', name: 'Mitos', description: 'Prendas tejidas de edición continua.' },
] as const
