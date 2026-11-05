import { permanentRedirect } from 'next/navigation'

/**
 * Los conjuntos viven ahora dentro del lookbook: se retira esta ruta para no
 * tener dos puertas al mismo sitio, pero se redirige de forma permanente para
 * no romper enlaces ya compartidos.
 */
export default function MixAndMatchPage() {
  permanentRedirect('/lookbook#conjuntos')
}
