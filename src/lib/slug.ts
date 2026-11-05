/**
 * Convierte un nombre en slug para la URL.
 *
 *   "Hoodie Acanalado Carbón" → "hoodie-acanalado-carbon"
 *
 * Vive aparte del pipeline 3D a propósito: las rutas del panel solo necesitan
 * esta función y así no cargan (ni declaran) las dependencias del modelado.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
