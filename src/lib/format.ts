/** Formato de dinero en pesos colombianos (sin decimales). */
const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

export function formatCop(value: number): string {
  // es-CO produce "$ 329.000"; normalizamos el espacio fino.
  return cop.format(value).replace(/\u00a0/g, ' ')
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
