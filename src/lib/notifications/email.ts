import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { formatCop } from '@/lib/format'

/**
 * Notificaciones por correo.
 *
 * Modo Cero: sin RESEND_API_KEY los correos se escriben en `.data/outbox/` y se
 * revisan abriendo el HTML. Cuando llegue la clave, el mismo código envía de
 * verdad cambiando una variable de entorno.
 */

export type EmailMessage = {
  to: string
  subject: string
  html: string
  text?: string
}

export type SendResult =
  | { provider: 'outbox'; file: string }
  | { provider: 'resend'; id: string }
  | { provider: 'none'; reason: string }

const OUTBOX = '.data/outbox'
const FROM = process.env.EMAIL_FROM ?? 'CHILLOUT <pedidos@chillout.co>'

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!message.to || !message.to.includes('@')) {
    return { provider: 'none', reason: 'sin destinatario válido' }
  }

  const provider = process.env.EMAIL_PROVIDER ?? 'outbox'
  const apiKey = process.env.RESEND_API_KEY

  if (provider === 'resend' && apiKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    })

    if (!response.ok) {
      throw new Error(`Resend respondió ${response.status}: ${await response.text()}`)
    }

    const data = (await response.json()) as { id: string }
    return { provider: 'resend', id: data.id }
  }

  // Modo Cero: se guarda en disco para revisión y pruebas.
  await mkdir(OUTBOX, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeTo = message.to.replace(/[^a-z0-9@.-]/gi, '_')
  const file = join(OUTBOX, `${stamp}__${safeTo}.html`)
  await writeFile(file, `<!-- Para: ${message.to} | Asunto: ${message.subject} -->\n${message.html}`)

  return { provider: 'outbox', file }
}

/* ── Plantillas ────────────────────────────────────────────── */

function shell(title: string, body: string) {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f7f4ef;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0a0a0a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3ded4">
        <tr><td style="padding:28px 28px 0">
          <div style="display:inline-block;border:1.5px solid #0a0a0a;padding:6px 12px;letter-spacing:.3em;font-size:11px;font-weight:700">CHILLOUT</div>
          <div style="margin-top:6px;font-size:9px;letter-spacing:.3em;color:#8a8378;text-transform:uppercase">Mitos · Prendas tejidas</div>
        </td></tr>
        <tr><td style="padding:24px 28px 28px">${body}</td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e3ded4;font-size:11px;color:#8a8378">
          CHILLOUT · Bogotá, Colombia · Precios en COP con IVA incluido.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function orderConfirmationEmail(input: {
  code: string
  customerName: string
  items: { name: string; colorName: string; size: string; qty: number; lineTotalCop: number }[]
  subtotalCop: number
  shippingCop: number
  totalCop: number
  orderUrl: string
}): EmailMessage {
  const rows = input.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0ece4;font-size:13px">
          ${item.name}<br><span style="font-size:11px;color:#8a8378">${item.colorName} · Talla ${item.size} · ${item.qty} u.</span>
        </td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #f0ece4;font-size:13px;white-space:nowrap">${formatCop(item.lineTotalCop)}</td>
      </tr>`,
    )
    .join('')

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:400">Recibimos tu pedido</h1>
    <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#5c574f">
      Hola ${input.customerName}, tu pedido <strong>${input.code}</strong> quedó registrado.
      Te escribimos para confirmar el pago y el envío.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">
      <tr><td style="font-size:12px;color:#8a8378">Subtotal</td><td align="right" style="font-size:12px">${formatCop(input.subtotalCop)}</td></tr>
      <tr><td style="font-size:12px;color:#8a8378">Envío</td><td align="right" style="font-size:12px">${input.shippingCop === 0 ? 'Gratis' : formatCop(input.shippingCop)}</td></tr>
      <tr><td style="padding-top:8px;font-size:11px;letter-spacing:.15em;color:#8a8378;text-transform:uppercase">Total</td><td align="right" style="padding-top:8px;font-size:15px">${formatCop(input.totalCop)}</td></tr>
    </table>
    <a href="${input.orderUrl}" style="display:inline-block;margin-top:22px;background:#0a0a0a;color:#f7f4ef;text-decoration:none;padding:13px 22px;font-size:11px;letter-spacing:.2em;text-transform:uppercase">Ver mi pedido</a>
  `

  return {
    to: '',
    subject: `Pedido ${input.code} recibido · CHILLOUT`,
    html: shell(`Pedido ${input.code}`, body),
    text: `Pedido ${input.code}: ${input.items.map((i) => `${i.name} x${i.qty}`).join(', ')}. Total ${formatCop(input.totalCop)}.`,
  }
}

export function orderStatusEmail(input: {
  code: string
  statusLabel: string
  message?: string | null
  orderUrl: string
}): Omit<EmailMessage, 'to'> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:400">Tu pedido avanzó</h1>
    <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#5c574f">
      El pedido <strong>${input.code}</strong> cambió a: <strong>${input.statusLabel}</strong>.
    </p>
    ${input.message ? `<p style="margin:0;font-size:12px;color:#8a8378">${input.message}</p>` : ''}
    <a href="${input.orderUrl}" style="display:inline-block;margin-top:22px;background:#0a0a0a;color:#f7f4ef;text-decoration:none;padding:13px 22px;font-size:11px;letter-spacing:.2em;text-transform:uppercase">Seguir mi pedido</a>
  `

  return {
    subject: `Pedido ${input.code}: ${input.statusLabel} · CHILLOUT`,
    html: shell(`Pedido ${input.code}`, body),
    text: `Tu pedido ${input.code} está en estado ${input.statusLabel}.`,
  }
}
