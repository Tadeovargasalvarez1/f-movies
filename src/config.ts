// =========================================================================
// F Movies — Configuracion publica del frontend
// Las variables VITE_* son publicas (no son secretos).
// =========================================================================

function readEnv(key: string, fallback = ''): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  const value = env?.[key]
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '') : fallback
}

/** URL base del backend externo autorizado. Vacia => modo estatico. */
export const API_BASE_URL = readEnv('VITE_API_BASE_URL')

/** Indica si hay un backend externo configurado. */
export const HAS_BACKEND = API_BASE_URL.length > 0

/** Endpoints publicos documentados del backend opcional. */
export const ENDPOINTS = {
  analyze: '/analyze',
  download: '/download',
} as const

/** Limites de procesamiento local (proteccion de memoria). */
export const LOCAL_CONVERSION_LIMITS = {
  /** Tamano maximo (bytes) que se intentara procesar con FFmpeg.wasm. */
  maxBytes: 400 * 1024 * 1024,
  /** Duracion maxima estimada (segundos) recomendada para conversion local. */
  maxDurationSeconds: 45 * 60,
} as const

/** Mensaje estandar cuando una operacion necesita un backend no configurado. */
export const BACKEND_NOT_CONFIGURED_MESSAGE =
  'Esta fuente necesita un motor de procesamiento externo. La interfaz esta preparada para conectarlo, pero el servicio todavia no esta configurado.'
