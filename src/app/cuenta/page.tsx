import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Mi cuenta' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Mi cuenta"
      title="Tus pedidos, tus datos, tus direcciones"
      description="Acceso con correo y contraseña, historial de pedidos, direcciones guardadas y seguimiento de envíos. Los administradores entran por el panel con doble factor obligatorio."
      phase="Flujo de cliente · Fase 1"
    />
  )
}
