/** Confirma el sello de rebaja con captura y patrón de SSR. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chillout#Studio-9f4c1a'
const SLUG = 'quarterzip-stripe'

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')

async function parche(precio, antes) {
  const cuerpo = new FormData()
  cuerpo.set('name', 'Suéter Polo Franjas')
  cuerpo.set('priceCop', precio)
  cuerpo.set('compareAtCop', antes)
  await fetch(`${BASE}/api/admin/productos/${SLUG}`, {
    method: 'PATCH',
    body: cuerpo,
    headers: { cookie },
  })
}

await parche('247200', '309000')

const html = await fetch(`${BASE}/coleccion`).then((r) => r.text())
console.log('patrón con comentarios SSR:', /<!-- -->20<!-- -->%/.test(html))

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })
await page.goto(`${BASE}/coleccion`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('article.group', { timeout: 45_000 })
await page.waitForTimeout(2000)

const sellos = await page.evaluate(() =>
  [...document.querySelectorAll('article.group span')]
    .map((s) => s.textContent?.trim() ?? '')
    .filter((t) => t.includes('%')),
)
console.log('sellos visibles:', JSON.stringify(sellos))

await page.screenshot({ path: 'docs/screenshots/catalogo-descuento.png' })
await browser.close()

await parche('309000', '')
console.log('restaurado (precio 309.000, sin descuento)')
