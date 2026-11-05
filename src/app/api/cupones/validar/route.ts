import { NextResponse } from 'next/server'
import { getDb } from '@/db/client'
import { validarCupon } from '@/lib/cupones'

export const runtime = 'nodejs'

/**
 * Consulta pública de un cupón desde el checkout.
 *
 * Solo informa al cliente de lo que se descontaría. El importe definitivo se
 * recalcula al crear el pedido, así que manipular esta petición no altera el
 * cobro.
 */
export async function POST(request: Request) {
  let cuerpo: { code?: unknown; subtotal?: unknown }
  try {
    cuerpo = (await request.json()) as { code?: unknown; subtotal?: unknown }
  } catch {
    return NextResponse.json({ ok: false, motivo: 'Petición inválida' }, { status: 400 })
  }

  const code = typeof cuerpo.code === 'string' ? cuerpo.code : ''
  const subtotal = Number(cuerpo.subtotal)

  if (!code.trim()) {
    return NextResponse.json({ ok: false, motivo: 'Escribe un código' }, { status: 400 })
  }
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ ok: false, motivo: 'Subtotal inválido' }, { status: 400 })
  }

  try {
    const resultado = await validarCupon(getDb(), code, Math.round(subtotal))
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 404 })
  } catch (error) {
    return NextResponse.json(
      { ok: false, motivo: `No se pudo comprobar el cupón: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}
