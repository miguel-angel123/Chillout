import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Seguir mi pedido' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Posventa"
      title="Sigue tu pedido paso a paso"
      description="Panel con la línea de tiempo real del pedido: alistamiento y confección, empaque, tránsito con la transportadora y entrega final. Cada pedido tendrá un enlace privado con su número de guía."
      phase="Módulo 19 · Fase 3"
    />
  )
}
