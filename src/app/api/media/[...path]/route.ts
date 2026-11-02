import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'

/**
 * Sirve los activos de `/public/media` desde el sistema de archivos.
 *
 * Necesario porque en producción Next resuelve `public/` al momento del build:
 * los archivos que el pipeline genera después no se sirven solos. Con esta ruta
 * una foto subida desde el 3D Studio queda disponible de inmediato, sin
 * recompilar y sin depender de un servicio externo.
 *
 * Cuando se conecte el almacenamiento de objetos (R2 o Neon Storage), esta ruta
 * pasa a redirigir a la URL firmada y el resto del sistema no cambia.
 */

const MEDIA_ROOT = join(process.cwd(), 'public', 'media')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.usdz': 'model/vnd.usdz+zip',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params

  // Defensa contra path traversal: se normaliza y se exige que siga dentro de MEDIA_ROOT.
  const relative = normalize(path.join('/')).replace(/^([/\\])+/, '')
  const absolute = normalize(join(MEDIA_ROOT, relative))

  if (!absolute.startsWith(MEDIA_ROOT + sep) && absolute !== MEDIA_ROOT) {
    return new NextResponse('Ruta inválida', { status: 400 })
  }

  try {
    const info = await stat(absolute)
    if (!info.isFile()) return new NextResponse('No encontrado', { status: 404 })

    const extension = relative.slice(relative.lastIndexOf('.')).toLowerCase()
    const contentType = MIME[extension]

    const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream

    return new NextResponse(stream, {
      headers: {
        'content-type': contentType ?? 'application/octet-stream',
        'content-length': String(info.size),
        // Los activos son inmutables: el slug identifica la versión.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('No encontrado', { status: 404 })
  }
}
