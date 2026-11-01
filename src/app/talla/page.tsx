import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Guía de tallas' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Fit Finder"
      title="Encuentra tu talla sin adivinar"
      description="Elige estatura, peso aproximado y preferencia de calce (Slim, Regular u Oversize). El módulo calcula la talla recomendada con la tabla de medidas reales de confección y muestra gráficamente la caída de hombros, largo de torso y mangas sobre el modelo 3D."
      phase="Módulo 11 · Fase 3"
    />
  )
}
