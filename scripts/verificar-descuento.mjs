/** Verifica el control de descuento en el admin (interfaz + persistencia). */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const SLUG = 'quarterzip-stripe'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1100 } })

const login = await page.request.post(`${BASE}/api/admin/login`, { data: { password: PASSWORD } })
await page.context().addCookies(
  login
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => {
      const [par] = h.value.split(';')
      const i = par.indexOf('=')
      return { name: par.slice(0, i), value: par.slice(i + 1), url: BASE }
    }),
)

// 1. La interfaz tiene el bloque de descuento
await page.goto(`${BASE}/admin/productos/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('form', { timeout: 45_000 })
await page.waitForTimeout(1500)

const bloque = await page.evaluate(() => {
  const texto = document.body.innerText
  return {
    tieneDescuento: /DESCUENTO/i.test(texto),
    tienePresets: ['−10%', '−15%', '−20%', '−30%', 'SIN DESCUENTO'].filter((p) =>
      texto.toUpperCase().includes(p.toUpperCase()),
    ),
  }
})
console.log('bloque descuento:', JSON.stringify(bloque))

// 2. Pulsar −20% y leer el resultado
await page.getByRole('button', { name: '−20%', exact: true }).click()
await page.waitForTimeout(600)
const tras20 = await page.evaluate(() => {
  const numeros = [...document.querySelectorAll('input[type="number"][step="1000"]')].map(
    (i) => i.value,
  )
  const resumen = [...document.querySelectorAll('p')]
    .map((p) => p.textContent?.trim() ?? '')
    .find((t) => t.includes('Se mostrará como'))
  return { precios: numeros, resumen }
})
console.log('tras pulsar −20%:', JSON.stringify(tras20))

await page.screenshot({ path: 'docs/screenshots/admin-descuento.png' })
console.log('✓ admin-descuento.png')

// 3. Guardar y comprobar en la tienda
await page.getByRole('button', { name: /guardar cambios/i }).click()
await page.waitForTimeout(3000)

await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const tienda = await page.evaluate(() => document.body.innerText)
const tieneRebaja = /−20%/.test(tienda) || tienda.includes('−20')
console.log('tienda muestra −20%:', tieneRebaja)

// 4. Limpiar: quitar el descuento
await page.goto(`${BASE}/admin/productos/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
await page.getByRole('button', { name: /sin descuento/i }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /guardar cambios/i }).click()
await page.waitForTimeout(2500)

const tras = await page.evaluate(() => document.body.innerText.includes('CAMBIOS GUARDADOS'))
console.log('descuento retirado:', tras)

await browser.close()
