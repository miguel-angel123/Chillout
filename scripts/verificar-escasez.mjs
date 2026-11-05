/** Comprueba el aviso de escasez al elegir una talla con pocas unidades. */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

for (const slug of ['acanalado-elegante-y-punto-grueso', 'hoodie-acanalado-carbon']) {
  await page.goto(`${BASE}/producto/${slug}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Elegir la talla S (los botones de talla llevan texto; los de color no)
  const talla = page.getByRole('button', { name: /^(S|M|L|XL)$/ }).first()
  let elegida = null
  if (await talla.count()) {
    elegida = (await talla.textContent())?.trim() ?? null
    if (await talla.isEnabled()) await talla.click()
  }
  await page.waitForTimeout(500)

  const aviso = await page.evaluate(() => {
    const textos = [...document.querySelectorAll('p')].map((p) => p.textContent?.trim() ?? '')
    return textos.find((t) => /quedan? \d+ unidades? en talla/i.test(t)) ?? null
  })

  console.log(`${slug.padEnd(34)} talla ${String(elegida).padEnd(3)} → ${aviso ?? '(sin aviso)'}`)
}

await browser.close()
