import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Pasarela digital' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Pasarela digital"
      title="Una prenda a la vez, a pantalla completa"
      description="La colección desfila de una en una: nombre, precio, descripción breve y controles Anterior / Siguiente con contador de posición. La imagen actual se desliza hacia un lado mientras la siguiente entra desde el extremo opuesto."
      phase="Módulo 4 · Fase 2"
    />
  )
}
