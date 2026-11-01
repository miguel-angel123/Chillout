import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Lookbook' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Lookbook"
      title="Compra el look completo"
      description="Campaña editorial con puntos interactivos sobre cada prenda. Al tocar un punto se abre una tarjeta con nombre, precio y enlace directo a la ficha del producto."
      phase="Módulo 9 · Fase 2"
    />
  )
}
