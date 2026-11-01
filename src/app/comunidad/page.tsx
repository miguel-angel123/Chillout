import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Comunidad' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Visto en la calle"
      title="La marca la llevan ustedes"
      description="Mosaico de fotos de clientes reales con la prenda puesta. Cada imagen lleva etiquetas de compra enlazadas a los artículos que aparecen en ella. Toda contribución pasa por moderación antes de publicarse."
      phase="Módulo 20 · Fase 3"
    />
  )
}
