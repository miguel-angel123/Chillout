/**
 * Rutas de los recursos que alimentan el visor 3D.
 *
 * Conviven dos prefijos:
 *   · /media/...      activos fijos incluidos en el build (catálogo semilla)
 *   · /api/media/...  activos que el pipeline genera en caliente (3D Studio)
 *
 * Ambos comparten la misma estructura; solo cambia el segmento de carpeta.
 */

const PREFIXES = ['/api/media', '/media'] as const

type Folder = 'products' | 'cutouts' | 'depth'

function resolve(photoUrl: string, target: Folder): string | null {
  for (const prefix of PREFIXES) {
    const source = `${prefix}/products/`
    if (photoUrl.startsWith(source)) {
      return photoUrl.replace(source, `${prefix}/${target}/`).replace(/\.jpe?g$/i, '.png')
    }
  }
  return null
}

/** Recorte con transparencia que usa el visor. */
export function cutoutUrl(photoUrl: string): string | null {
  return resolve(photoUrl, 'cutouts')
}

/** Mapa de profundidad que da volumen al modelo. */
export function depthUrl(photoUrl: string): string | null {
  return resolve(photoUrl, 'depth')
}

/** Recorte de la vista trasera, si el gerente la subió. */
export function backCutoutUrl(photoUrl: string): string | null {
  const front = resolve(photoUrl, 'cutouts')
  if (!front) return null
  return front.replace(/\.png$/i, '-back.png')
}
