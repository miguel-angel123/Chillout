import { asc } from 'drizzle-orm'
import { StudioUploader } from '@/components/admin/studio-uploader'
import { getDb, schema } from '@/db/client'

export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  let colors: { slug: string; name: string; hex: string }[] = []
  let dbError: string | null = null

  try {
    const db = getDb()
    const rows = await db
      .select({ slug: schema.colors.slug, name: schema.colors.name, hex: schema.colors.hex })
      .from(schema.colors)
      .orderBy(asc(schema.colors.sortOrder))
    colors = rows
  } catch (error) {
    dbError = (error as Error).message
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[10px] tracking-[0.3em] text-stone uppercase">3D Studio</p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] text-ink">
          De una foto a una prenda en 3D
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-dark">
          Sube la fotografía y el pipeline elimina el fondo, estima la profundidad con IA local y
          arma el volumen. Al terminar, la prenda queda publicada y visible en la página principal
          con su visor 3D.
        </p>
      </div>

      {dbError ? (
        <p className="mt-6 border border-copper/40 bg-copper/5 px-4 py-3 text-[12px] text-copper-deep">
          Sin conexión a la base de datos: {dbError}. Las prendas nuevas no se podrán guardar.
        </p>
      ) : null}

      <div className="mt-12">
        <StudioUploader colors={colors} />
      </div>
    </div>
  )
}
