import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Mix & Match' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Mix & Match"
      title="Arma el look completo"
      description="Tres carriles independientes — prendas superiores, inferiores y calzado o accesorios — que se deslizan por separado para previsualizar conjuntos en tiempo real. El botón «Comprar look completo» calcula el total y aplica el descuento por paquete."
      phase="Módulo 12 · Fase 3"
    />
  )
}
