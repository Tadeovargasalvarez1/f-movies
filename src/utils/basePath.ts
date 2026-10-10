// =========================================================================
// F Movies — Resolucion de la ruta base para GitHub Pages
// Logica pura para poder probarla de forma aislada.
// =========================================================================

export interface BaseOptions {
  /** Modo de Vite ("development" | "production"). */
  mode?: string
  /** Nombre del repositorio (se usa como carpeta en GitHub Pages). */
  repo?: string
  /** Valor explicito (VITE_BASE) que tiene prioridad. */
  override?: string
}

function normalize(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '' ) return ''
  if (trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}/`
}

/**
 * Deduce la ruta base:
 * - Override explicito tiene prioridad (se normaliza a `/algo/`).
 * - En produccion se usa `/<repo>/` (nunca la raiz del dominio).
 * - En desarrollo se usa `/`.
 */
export function resolveBase(options: BaseOptions = {}): string {
  const { mode = 'development', repo = 'f-movies', override } = options
  if (override != null && override.trim() !== '') return normalize(override)
  return mode === 'production' ? normalize(repo) : '/'
}
