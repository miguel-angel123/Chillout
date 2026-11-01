import type { Metadata } from 'next'
import { ComingSoon } from '@/components/site/coming-soon'

export const metadata: Metadata = { title: 'Drops' }

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Drops"
      title="Lanzamientos en unidades limitadas"
      description="Cronómetro hacia la apertura de venta y aviso por correo, notificación push o WhatsApp. Sin costo por mensaje: usamos enlaces wa.me y Web Push en lugar de la API de pago de WhatsApp."
      phase="Módulo 14 · Fase 3"
    />
  )
}
