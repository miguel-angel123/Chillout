import { NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db/client'
import { registrarUsoCupon, validarCupon } from '@/lib/cupones'
import { orderConfirmationEmail, sendEmail } from '@/lib/notifications/email'

export const runtime = 'nodejs'

/**
 * Crea un pedido.
 *
 * El cliente envía solo qué compra (producto, color, talla, cantidad). Los
 * precios, el stock y el total se resuelven aquí contra la base de datos: el
 * carrito del navegador nunca es autoridad sobre el dinero.
 */

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        colorSlug: z.string().min(1),
        size: z.string().min(1),
        qty: z.number().int().min(1).max(20),
      }),
    )
    .min(1),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(30),
    email: z.string().trim().email().optional().or(z.literal('')),
    city: z.string().trim().max(80).optional(),
    address: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  /** Código de cupón; se valida contra la base, nunca se confía en el cliente. */
  couponCode: z.string().trim().max(40).optional().or(z.literal('')),
})

const FREE_SHIPPING_FROM = 250_000
const SHIPPING_COP = 15_000

function makeCode(): string {
  const now = new Date()
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CHL-${stamp}-${random}`
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos del pedido inválidos' }, { status: 400 })
  }

  const { items, customer } = parsed.data
  const db = getDb()

  // ── Resolver cada línea contra la base ────────────────────
  const resolved: {
    productSlug: string
    variantId: string
    name: string
    colorName: string
    size: string
    qty: number
    unitPriceCop: number
  }[] = []

  for (const line of items) {
    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, line.slug))
      .limit(1)

    if (!product) {
      return NextResponse.json({ error: `Producto no disponible: ${line.slug}` }, { status: 409 })
    }
    if (product.status !== 'active') {
      return NextResponse.json(
        { error: `${product.name} no está disponible para la venta` },
        { status: 409 },
      )
    }
    // Sin precio no hay venta: el pedido no puede calcular un total fiable.
    if (product.priceCop === null) {
      return NextResponse.json(
        {
          error: `${product.name} tiene el precio por confirmar. Escríbenos por WhatsApp y lo cerramos contigo.`,
          motivo: 'precio-pendiente',
          slug: product.slug,
        },
        { status: 409 },
      )
    }

    const [color] = await db
      .select()
      .from(schema.colors)
      .where(eq(schema.colors.slug, line.colorSlug))
      .limit(1)
    if (!color) {
      return NextResponse.json({ error: `Color no disponible: ${line.colorSlug}` }, { status: 409 })
    }

    const [size] = await db
      .select()
      .from(schema.sizes)
      .where(eq(schema.sizes.label, line.size))
      .limit(1)
    if (!size) {
      return NextResponse.json({ error: `Talla no válida: ${line.size}` }, { status: 409 })
    }

    const [variant] = await db
      .select()
      .from(schema.productVariants)
      .where(
        and(
          eq(schema.productVariants.productId, product.id),
          eq(schema.productVariants.colorId, color.id),
          eq(schema.productVariants.sizeId, size.id),
        ),
      )
      .limit(1)

    if (!variant) {
      return NextResponse.json(
        { error: `Esa combinación no existe para ${product.name}` },
        { status: 409 },
      )
    }
    if (variant.stock < line.qty) {
      return NextResponse.json(
        {
          error: `Solo quedan ${variant.stock} unidades de ${product.name} talla ${line.size}`,
        },
        { status: 409 },
      )
    }

    resolved.push({
      productSlug: product.slug,
      variantId: variant.id,
      name: product.name,
      colorName: color.name,
      size: size.label,
      qty: line.qty,
      unitPriceCop: product.priceCop,
    })
  }

  // ── Totales en servidor ───────────────────────────────────
  const subtotal = resolved.reduce((sum, line) => sum + line.unitPriceCop * line.qty, 0)

  // El cupón se vuelve a validar aquí: el checkout solo mostró una estimación.
  let descuento = 0
  let cuponAplicado: string | null = null
  if (parsed.data.couponCode) {
    const resultado = await validarCupon(db, parsed.data.couponCode, subtotal)
    if (resultado.ok) {
      descuento = resultado.discountCop
      cuponAplicado = resultado.code
    }
  }

  // El envío gratis se mide sobre el subtotal ANTES del descuento: usar un
  // cupón no debe quitarle al cliente el beneficio del envío.
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COP
  const total = Math.max(0, subtotal - descuento) + shipping

  const token = crypto.randomUUID()
  let code = makeCode()

  try {
    const [order] = await db
      .insert(schema.orders)
      .values({
        code,
        token,
        status: 'pending',
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || null,
        city: customer.city || null,
        address: customer.address || null,
        notes: customer.notes || null,
        subtotalCop: subtotal,
        shippingCop: shipping,
        discountCop: descuento,
        couponCode: cuponAplicado,
        totalCop: total,
      })
      .returning({ id: schema.orders.id })

    if (!order) throw new Error('No se pudo crear el pedido')

    for (const line of resolved) {
      await db.insert(schema.orderItems).values({
        orderId: order.id,
        productSlug: line.productSlug,
        variantId: line.variantId,
        name: line.name,
        colorName: line.colorName,
        size: line.size,
        qty: line.qty,
        unitPriceCop: line.unitPriceCop,
        lineTotalCop: line.unitPriceCop * line.qty,
      })

      // El stock se descuenta aquí; el checkout no puede saltarse el inventario.
      await db
        .update(schema.productVariants)
        .set({ stock: sql`GREATEST(0, ${schema.productVariants.stock} - ${line.qty})` })
        .where(eq(schema.productVariants.id, line.variantId))
    }

    await db.insert(schema.orderEvents).values({
      orderId: order.id,
      status: 'pending',
      message: 'Pedido recibido. Te contactamos para confirmar el pago y el envío.',
    })

    // El uso del cupón se cuenta solo cuando el pedido ya quedó registrado.
    if (cuponAplicado) {
      try {
        await registrarUsoCupon(db, cuponAplicado)
      } catch (cuponError) {
        console.warn('[orders] uso de cupón no registrado:', (cuponError as Error).message)
      }
    }

    // El correo no puede tumbar el pedido: si falla, solo se registra.
    if (customer.email) {
      try {
        const origin = new URL(request.url).origin
        const template = orderConfirmationEmail({
          code,
          customerName: customer.name,
          items: resolved.map((line) => ({
            name: line.name,
            colorName: line.colorName,
            size: line.size,
            qty: line.qty,
            lineTotalCop: line.unitPriceCop * line.qty,
          })),
          subtotalCop: subtotal,
          shippingCop: shipping,
          totalCop: total,
          orderUrl: `${origin}/pedido/${token}`,
        })

        await sendEmail({ ...template, to: customer.email })
      } catch (mailError) {
        console.warn('[orders] confirmación no enviada:', (mailError as Error).message)
      }
    }
  } catch (error) {
    console.error('[orders] no se pudo registrar:', error)
    return NextResponse.json(
      { error: `No se pudo registrar el pedido: ${(error as Error).message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    code,
    token,
    url: `/pedido/${token}`,
    subtotalCop: subtotal,
    discountCop: descuento,
    couponCode: cuponAplicado,
    shippingCop: shipping,
    totalCop: total,
  })
}
