/** Diagnóstico: drops con imágenes y el botón de añadir al carrito. */
import { neon } from '@neondatabase/serverless'
import { chromium } from 'playwright'

process.loadEnvFile('.env.local')
const sql = neon(process.env.DATABASE_URL)
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

const drops = await sql`SELECT slug, title, image_url, active FROM drops ORDER BY created_at`
console.log('drops en base:')
for (const d of drops) console.log(`  ${d.slug} · ${d.image_url ?? '(sin imagen)'} · activo=${d.active}`)

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
page.on('pageerror', (e) => console.log('ERROR JS:', e.message.slice(0, 160)))

await page.goto(`${BASE}/producto/hoodie-rib`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

// Estado de la ficha antes de tocar nada
const estado = await page.evaluate(() => {
  const botones = [...document.querySelectorAll('button')]
  const tallas = botones.filter((b) => /^(S|M|L|XL)$/.test((b.textContent ?? '').trim()))
  return {
    tallas: tallas.map((b) => ({ texto: b.textContent?.trim(), deshabilitado: b.disabled })),
    botones: botones.map((b) => (b.textContent ?? '').trim()).filter(Boolean).slice(0, 12),
  }
})
console.log('\ntallas en la ficha:', JSON.stringify(estado.tallas))
console.log('botones visibles:', JSON.stringify(estado.botones))

// Pulsar S y añadir
const tallaS = page.getByRole('button', { name: 'S', exact: true }).first()
if (await tallaS.count()) {
  await tallaS.click()
  await page.waitForTimeout(400)
}

const anadir = page.getByRole('button', { name: /añadir al carrito/i }).first()
console.log('botón añadir encontrado:', (await anadir.count()) > 0)
if (await anadir.count()) {
  console.log('  deshabilitado:', await anadir.isDisabled())
  await anadir.click()
  await page.waitForTimeout(1500)
}

const carrito = await page.evaluate(() => {
  const crudo = localStorage.getItem('chillout-cart')
  const items = crudo ? (JSON.parse(crudo)?.state?.items ?? []) : []
  return items.map((i) => `${i.slug}/${i.size}×${i.qty}`)
})
console.log('carrito tras añadir:', carrito.join(', ') || 'VACÍO')

await browser.close()
