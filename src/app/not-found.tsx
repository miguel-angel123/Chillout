import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60svh] max-w-[1600px] flex-col items-start justify-center px-4 py-24 sm:px-6">
      <p className="text-[10px] tracking-[0.32em] text-stone uppercase">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(2rem,6vw,4rem)] leading-tight text-ink">
        Esta página se deshilachó
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-dark">
        No encontramos lo que buscabas. Puede que la prenda haya salido de colección.
      </p>
      <Link
        href="/coleccion"
        className="mt-8 inline-flex items-center gap-3 bg-ink px-7 py-4 text-[11px] tracking-[0.24em] text-paper uppercase transition-colors hover:bg-copper"
      >
        Volver a la colección
      </Link>
    </div>
  )
}
