import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ComingSoon({
  eyebrow,
  title,
  description,
  phase,
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  phase: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:py-24', className)}>
      <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
        <div>
          <p className="text-[10px] tracking-[0.32em] text-stone uppercase">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.02] text-ink">
            {title}
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-stone-dark">{description}</p>

          <div className="mt-9 inline-flex items-center gap-2 border border-ink/15 px-3 py-2">
            <span className="size-1.5 rounded-full bg-copper" aria-hidden />
            <span className="text-[10px] tracking-[0.2em] text-stone-dark uppercase">{phase}</span>
          </div>

          {children}

          <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-ink/10 pt-8">
            <Link
              href="/coleccion"
              className="group inline-flex items-center gap-3 bg-ink px-6 py-3.5 text-[11px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper"
            >
              Ir a la colección
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
            <Link
              href="/"
              className="text-[11px] tracking-[0.22em] text-stone-dark uppercase underline-offset-8 hover:text-ink hover:underline"
            >
              Volver al inicio
            </Link>
          </div>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden border border-ink/10 bg-paper-dim">
          <div className="absolute inset-0 grid place-items-center">
            <p className="brand-frame text-[13px] tracking-[0.3em] text-stone">Chillout</p>
          </div>
        </div>
      </div>
    </div>
  )
}
