import type { Metadata } from 'next'
import { Runway } from '@/components/runway/runway'
import { getAllProducts } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Pasarela digital',
  description:
    'La colección CHILLOUT desfila de una prenda en una: nombre, precio y navegación Anterior / Siguiente con contador de posición.',
}

// La colección cambia en caliente desde el 3D Studio: no puede congelarse.
export const dynamic = 'force-dynamic'

export default async function RunwayPage() {
  const products = await getAllProducts()

  return <Runway products={products} />
}
