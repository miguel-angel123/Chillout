import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'

/**
 * Chrome de la tienda: barra de anuncios, navegación y pie.
 * Vive en un grupo de rutas para que el panel de administración y las rutas de
 * API no hereden la navegación pública.
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  )
}
