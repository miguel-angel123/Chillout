import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type LegalDoc = {
  slug: string
  title: string
  updated: string
  sections: { heading: string; body: string[] }[]
}

/**
 * Textos legales base del mercado colombiano.
 * PENDIENTE: revisión por abogado antes de publicar en producción.
 */
const DOCS: LegalDoc[] = [
  {
    slug: 'terminos',
    title: 'Términos y condiciones',
    updated: '2026',
    sections: [
      {
        heading: '1. Identificación del vendedor',
        body: [
          'CHILLOUT, marca de prendas tejidas con domicilio en Bogotá, Colombia. Canal de atención: WhatsApp y correo electrónico publicados en el sitio.',
        ],
      },
      {
        heading: '2. Productos y precios',
        body: [
          'Los precios se expresan en pesos colombianos (COP) e incluyen el Impuesto al Valor Agregado (IVA) del 19 %. Las fotografías son referencias; las variaciones de tono por calibración de pantalla no constituyen defecto.',
          'Las prendas tejidas pueden presentar variaciones mínimas de textura y medida propias del proceso de confección artesanal.',
        ],
      },
      {
        heading: '3. Disponibilidad e inventario',
        body: [
          'La disponibilidad se confirma al momento del pago. Si una referencia se agota después de la compra, se reembolsará el valor correspondiente o se ofrecerá una alternativa.',
        ],
      },
      {
        heading: '4. Envíos',
        body: [
          'Los despachos se realizan por transportadora aliada a la dirección indicada. Los tiempos de tránsito se informan al momento del despacho y varían según el destino.',
        ],
      },
      {
        heading: '5. Atención y PQRS',
        body: [
          'Las peticiones, quejas, reclamos y sugerencias se reciben por los canales de contacto publicados y se atienden en los plazos de la Ley 1480 de 2011.',
        ],
      },
    ],
  },
  {
    slug: 'privacidad',
    title: 'Política de tratamiento de datos personales',
    updated: '2026',
    sections: [
      {
        heading: '1. Marco legal',
        body: [
          'Esta política se expide en cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 y las normas que los modifiquen o sustituyan.',
        ],
      },
      {
        heading: '2. Datos que recolectamos',
        body: [
          'Datos de identificación y contacto (nombre, correo, teléfono, dirección de envío), información de pedidos y datos de navegación estrictamente necesarios para operar el sitio.',
        ],
      },
      {
        heading: '3. Finalidad',
        body: [
          'Procesar pedidos, gestionar envíos y devoluciones, atender solicitudes, y —solo con autorización previa, expresa e informada— enviar comunicaciones sobre lanzamientos y novedades.',
        ],
      },
      {
        heading: '4. Derechos del titular',
        body: [
          'El titular puede conocer, actualizar, rectificar y suprimir sus datos, revocar la autorización y presentar quejas, escribiendo a los canales de contacto. La solicitud se atiende en los términos legales.',
        ],
      },
      {
        heading: '5. Cookies',
        body: [
          'Usamos cookies necesarias para el funcionamiento del carrito y la sesión. Las cookies analíticas y publicitarias solo se activan con consentimiento previo y pueden rechazarse sin afectar la compra.',
        ],
      },
    ],
  },
  {
    slug: 'devoluciones',
    title: 'Cambios y devoluciones',
    updated: '2026',
    sections: [
      {
        heading: '1. Derecho de retracto',
        body: [
          'De acuerdo con el artículo 47 de la Ley 1480 de 2011, el cliente puede ejercer el derecho de retracto dentro de los cinco (5) días hábiles siguientes a la entrega, sin necesidad de justificar la decisión.',
          'El producto debe devolverse sin uso, con etiquetas y empaque originales. Los costos de transporte del retracto se informan al momento de la solicitud.',
        ],
      },
      {
        heading: '2. Cambios por talla',
        body: [
          'Aceptamos un cambio de talla por pedido dentro de los treinta (30) días posteriores a la entrega, sujeto a disponibilidad de inventario en la talla o color solicitados.',
        ],
      },
      {
        heading: '3. Producto defectuoso',
        body: [
          'Si la prenda presenta una falla de confección, el cambio o la reparación procede sin costo para el cliente. Escríbenos con el número de pedido y una fotografía del defecto.',
        ],
      },
      {
        heading: '4. Reembolsos',
        body: [
          'El reembolso se procesa por el mismo medio de pago utilizado, dentro de los plazos que defina la pasarela de pagos.',
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Política de cookies',
    updated: '2026',
    sections: [
      {
        heading: '1. Qué son',
        body: [
          'Las cookies son archivos que el sitio guarda en el navegador para recordar información entre visitas.',
        ],
      },
      {
        heading: '2. Categorías',
        body: [
          'Necesarias: mantienen el carrito y la sesión. Analíticas: miden el uso del sitio de forma agregada. Publicitarias: permiten medir campañas y mostrar anuncios relevantes.',
        ],
      },
      {
        heading: '3. Control',
        body: [
          'Puedes aceptar, rechazar o configurar las categorías no necesarias desde el aviso de cookies del sitio, y cambiar la decisión cuando quieras. Tambén puedes eliminar las cookies desde tu navegador.',
        ],
      },
    ],
  },
]

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS.find((d) => d.slug === slug)
  return { title: doc?.title ?? 'Legal' }
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = DOCS.find((d) => d.slug === slug)
  if (!doc) notFound()

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
      <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Legal</p>
      <h1 className="mt-4 font-display text-[clamp(1.9rem,4.5vw,3rem)] leading-tight text-ink">
        {doc.title}
      </h1>
      <p className="mt-3 text-[11px] text-stone">Actualizado: {doc.updated}</p>

      <div className="mt-12 space-y-10">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-sans text-[12px] tracking-[0.16em] text-ink uppercase">
              {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="mt-3 text-[13px] leading-relaxed text-stone-dark">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-16 border-t border-ink/10 pt-6 text-[11px] leading-relaxed text-stone">
        Este texto es una base de trabajo y debe ser revisado por asesoría jurídica antes del
        lanzamiento en producción.
      </p>
    </article>
  )
}
