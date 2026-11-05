import { CartDrawer } from '@/components/cart/cart-drawer'
import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'

/**
 * Chrome de la tienda: barra de anuncios, navegación, pie y carrito lateral.
 * Vive en un grupo de rutas para que el panel de administración y las rutas de
 * API no hereden la navegación pública.
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Sin JavaScript no hay revelado al hacer scroll: se muestra todo. */}
      <noscript>
        <style>{`.scroll-reveal{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  )
}
