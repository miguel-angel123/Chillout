import { NextResponse } from 'next/server'

/**
 * Ruta retirada.
 *
 * Este endpoint construía la prenda a partir de las fotos (el viejo 3D Studio).
 * Ese flujo ya no se usa: el modelo se genera fuera (Meshy) y se sube desde el
 * alta de producto. Se deja cerrada para no mantener una superficie de ataque
 * que nadie revisa.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'El 3D Studio se retiró. Sube el modelo .glb desde /admin/productos/nuevo al crear la prenda.',
    },
    { status: 410 },
  )
}

export async function GET() {
  return NextResponse.json({ error: 'Ruta retirada' }, { status: 410 })
}
