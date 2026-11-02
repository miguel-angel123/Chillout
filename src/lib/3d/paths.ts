/**
 * Rutas de los recortes con transparencia que alimentan el visor 3D.
 *
 *   /media/products/hoodie-rib-orange-01.jpg
 *   → /media/cutouts/hoodie-rib-orange-01.png
 *
 * Mientras el pipeline de subida no persista su propio cutout, esta convención
 * mantiene sincronizados fotografía y modelo.
 */
export function cutoutUrl(photoUrl: string): string | null {
  if (!photoUrl.startsWith('/media/products/')) return null
  return photoUrl.replace('/media/products/', '/media/cutouts/').replace(/\.jpe?g$/i, '.png')
}
