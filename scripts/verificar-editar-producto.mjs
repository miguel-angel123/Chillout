/** Verifica la edición de un producto: cambiar precio y stock, y guardar. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const SLUG = process.argv[3] ?? 'hoodie-rib'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1100 } })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))

const login = await page.request.post(`${BASE}/api/admin/login`, { data: { password: PASSWORD } })
const cookies = login
  .headersArray()
  .filter((h) => h.name.toLowerCase() === 'set-cookie')
  .map((h) => {
    const [par] = h.value.split(';')
    const i = par.indexOf('=')
    return { name: par.slice(0, i), value: par.slice(i + 1), url: BASE }
  })
await page.context().addCookies(cookies)
console.log('login:', login.status())

await page.goto(`${BASE}/admin/productos/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('form', { timeout: 45_000 })
await page.waitForTimeout(1500)

const antes = await page.evaluate(() => {
  const precio = document.querySelector('input[type="number"][step="1000"]')
  return precio ? precio.value : null
})
console.log('precio actual   :', antes)

await page.screenshot({ path: 'docs/screenshots/admin-editar-producto.png' })
console.log('✓ admin-editar-producto.png')

// Cambiar el precio a uno de prueba y guardar
const precioInput = page.locator('input[type="number"][step="1000"]').first()
await precioInput.fill('333000')

// Subir el stock de la primera talla
const stockInput = page.locator('input[type="number"][max="999"]').first()
await stockInput.fill('7')

await page.getByRole('button', { name: /guardar cambios/i }).click()
await page.waitForTimeout(3500)

const texto = await page.evaluate(() => document.body.innerText)
console.log('guardado        :', texto.includes('CAMBIOS GUARDADOS') || texto.toLowerCase().includes('cambios guardados'))

await page.screenshot({ path: 'docs/screenshots/admin-producto-editado.png' })
console.log('✓ admin-producto-editado.png')

// Comprobar en la ficha pública
await page.goto(`${BASE}/producto/${SLUG}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const ficha = await page.evaluate(() => document.body.innerText)
console.log('ficha muestra $333.000:', ficha.includes('333.000'))

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
