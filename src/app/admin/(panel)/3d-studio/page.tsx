import { permanentRedirect } from 'next/navigation'

/**
 * El 3D Studio se retiró: el modelo se genera fuera (Meshy) y se sube desde el
 * alta de producto. La ruta se conserva como redirección para no romper enlaces
 * guardados del panel.
 */
export default function StudioPage() {
  permanentRedirect('/admin/productos/nuevo')
}
