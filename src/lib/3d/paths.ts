/**
 * Rutas de los recursos que alimentan el visor 3D.
 *
 *   foto      /media/products/hoodie-rib-orange-01.jpg
 *   recorte   /media/cutouts/hoodie-rib-orange-01.png   (con transparencia)
 *   profundidad /media/depth/hoodie-rib-orange-01.png   (mapa de grises)
 *
 * El pipeline de subida persiste los tres; esta convención los mantiene
 * sincronizados con la fotografía original.
 */

export function cutoutUrl(photoUrl: string): string | null {
  if (!photoUrl.startsWith('/media/products/')) return null
  return photoUrl.replace('/media/products/', '/media/cutouts/').replace(/\.jpe?g$/i, '.png')
}

export function depthUrl(photoUrl: string): string | null {
  const cutout = cutoutUrl(photoUrl)
  if (!cutout) return null
  return cutout.replace('/media/cutouts/', '/media/depth/')
}
