import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Box, CalendarClock, LayoutDashboard, LogOut, Package, Receipt, Ticket } from 'lucide-react'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

export const metadata = { title: 'Panel CHILLOUT', robots: { index: false, follow: false } }

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies()
  if (!verifyAdminToken(store.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-ink/10 bg-ink text-paper">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <span className="brand-frame text-[11px] tracking-[0.28em]">Chillout</span>
          <span className="hidden text-[10px] tracking-[0.24em] text-paper/40 uppercase sm:inline">
            Panel del gerente
          </span>

          <nav className="ml-auto flex items-center gap-5">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-paper/70 uppercase hover:text-paper"
            >
              <LayoutDashboard className="size-4" strokeWidth={1.5} />
              Resumen
            </Link>
            <Link
              href="/admin/productos"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-paper/70 uppercase hover:text-paper"
            >
              <Package className="size-4" strokeWidth={1.5} />
              Productos
            </Link>
            <Link
              href="/admin/3d-studio"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-paper/70 uppercase hover:text-paper"
            >
              <Box className="size-4" strokeWidth={1.5} />
              3D Studio
            </Link>
            <Link
              href="/admin/drops"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-paper/70 uppercase hover:text-paper"
            >
              <CalendarClock className="size-4" strokeWidth={1.5} />
              Drops
            </Link>
            <Link
              href="/admin/cupones"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-paper/70 uppercase hover:text-paper"
            >
              <Ticket className="size-4" strokeWidth={1.5} />
              Cupones
            </Link>
            <Link
              href="/admin/pedidos"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-paper/70 uppercase hover:text-paper"
            >
              <Receipt className="size-4" strokeWidth={1.5} />
              Pedidos
            </Link>
            <Link
              href="/"
              className="text-[11px] tracking-[0.16em] text-paper/70 uppercase hover:text-paper"
            >
              Ver tienda
            </Link>
            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] text-paper/50 uppercase hover:text-copper-bright"
              >
                <LogOut className="size-3.5" strokeWidth={1.6} />
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
