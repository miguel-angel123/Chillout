/**
 * Límite de intentos para el acceso al panel.
 *
 * Se guarda en memoria del proceso: frena el ataque de fuerza bruta contra una
 * contraseña única, pero no sobrevive a un reinicio ni se comparte entre
 * instancias. Cuando el panel tenga usuarios reales (Better Auth), esta capa se
 * sustituye por el límite del proveedor o por uno con almacenamiento compartido.
 */

type Entrada = { intentos: number; hasta: number }

const VENTANA_MS = 15 * 60 * 1000
const MAX_INTENTOS = 5
const MAX_CLAVES = 5000

const registro = new Map<string, Entrada>()

function podar(ahora: number): void {
  if (registro.size <= MAX_CLAVES) return
  for (const [clave, entrada] of registro) {
    if (ahora > entrada.hasta) registro.delete(clave)
  }
}

/** Identifica al cliente por la IP que ve el proxy (o el propio socket). */
export function claveCliente(request: Request): string {
  const reenviada = request.headers.get('x-forwarded-for')
  if (reenviada) return reenviada.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'local'
}

export type ResultadoLimite =
  | { permitido: true; restantes: number }
  | { permitido: false; esperarMs: number }

/** Cuenta un intento fallido y decide si se permite seguir probando. */
export function registrarIntentoFallido(clave: string): ResultadoLimite {
  const ahora = Date.now()
  podar(ahora)

  const actual = registro.get(clave)
  if (!actual || ahora > actual.hasta) {
    registro.set(clave, { intentos: 1, hasta: ahora + VENTANA_MS })
    return { permitido: true, restantes: MAX_INTENTOS - 1 }
  }

  actual.intentos += 1
  if (actual.intentos > MAX_INTENTOS) {
    return { permitido: false, esperarMs: actual.hasta - ahora }
  }

  return { permitido: true, restantes: Math.max(0, MAX_INTENTOS - actual.intentos) }
}

/** ¿Está bloqueada la clave ahora mismo? Se consulta antes de comprobar. */
export function estaBloqueado(clave: string): { bloqueado: boolean; esperarMs: number } {
  const ahora = Date.now()
  const actual = registro.get(clave)
  if (!actual) return { bloqueado: false, esperarMs: 0 }
  if (ahora > actual.hasta) {
    registro.delete(clave)
    return { bloqueado: false, esperarMs: 0 }
  }
  if (actual.intentos > MAX_INTENTOS) {
    return { bloqueado: true, esperarMs: actual.hasta - ahora }
  }
  return { bloqueado: false, esperarMs: 0 }
}

/** Se llama tras un acceso correcto: borra el historial de esa IP. */
export function limpiarIntentos(clave: string): void {
  registro.delete(clave)
}
