/** Verifica revelado al hacer scroll y hover de producto. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))

await page.goto(`${BASE}/coleccion`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('article.group', { timeout: 45_000 })
await page.waitForTimeout(2000)

// Estado inicial: cuántos bloques ya se revelaron
const antes = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.scroll-reveal')]
  return { total: els.length, visibles: els.filter((e) => e.dataset.visible === 'true').length }
})
console.log('reveal al cargar  :', JSON.stringify(antes))

// Desplazar para disparar el revelado
await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }))
await page.waitForTimeout(1400)

const despues = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.scroll-reveal')]
  return { total: els.length, visibles: els.filter((e) => e.dataset.visible === 'true').length }
})
console.log('reveal tras scroll:', JSON.stringify(despues))

await page.screenshot({ path: 'docs/screenshots/coleccion-reveal.png' })
console.log('✓ coleccion-reveal.png')

// Hover sobre la primera tarjeta
const tarjeta = page.locator('article.group').first()
await tarjeta.scrollIntoViewIfNeeded()
await page.waitForTimeout(600)
await tarjeta.hover()
await page.waitForTimeout(1200)

const hover = await page.evaluate(() => {
  const card = document.querySelector('article.group')
  if (!card) return null
  const imgs = [...card.querySelectorAll('img')]
  const titulo = card.querySelector('.card-title')
  return {
    imagenes: imgs.map((i) => ({
      opacidad: getComputedStyle(i).opacity,
      escala: getComputedStyle(i).transform,
    })),
    subrayado: titulo ? getComputedStyle(titulo).backgroundSize : null,
  }
})
console.log('hover            :', JSON.stringify(hover))

await page.screenshot({ path: 'docs/screenshots/producto-hover.png' })
console.log('✓ producto-hover.png')

await browser.close()
console.log(errores.length ? `errores: ${errores.slice(0, 2).join(' | ')}` : 'sin errores de consola')
