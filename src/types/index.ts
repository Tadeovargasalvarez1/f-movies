// =========================================================================
// F Movies — Modelos de datos compartidos
// =========================================================================

/** Clase de recurso detectada a partir de la URL. */
export type ResourceKind = 'direct-media' | 'platform-page' | 'unknown'

/** Tipo de medio de una opcion de salida. */
export type MediaType = 'video' | 'audio'

/** Contenedores contemplados (solo se muestran cuando el proveedor los puede producir). */
export type Container = 'mp4' | 'webm' | 'mp3' | 'm4a' | 'wav' | 'opus' | 'ogg' | 'original'

/** Resoluciones de video contempladas. */
export type VideoResolution =
  | '144p'
  | '240p'
  | '360p'
  | '480p'
  | '720p'
  | '1080p'
  | '1440p'
  | '2160p'
  | 'original'

/** Origen de una opcion de salida. */
export type FormatSource = 'direct' | 'converted' | 'backend'

/**
 * Una opcion de salida concreta y verificable. Nunca debe inventarse:
 * se rellena solo con datos que la fuente o el proveedor hayan devuelto.
 */
export interface MediaFormatOption {
  /** Identificador estable y unico dentro de la fuente. */
  id: string
  mediaType: MediaType
  container: Container
  /** Etiqueta legible para el usuario (p. ej. "MP4 · 1080p"). */
  label: string
  resolution?: VideoResolution
  /** Tasa de bits de audio en kbps, solo cuando se conoce de forma fiable. */
  audioBitrateKbps?: number
  /** Tamano estimado en bytes, solo cuando se conoce. */
  estimatedSizeBytes?: number
  source: FormatSource
  /** Indica si esta opcion requiere un motor externo para producirse. */
  requiresBackend?: boolean
}

/** Capacidades reales que un proveedor declara para una fuente. */
export interface ProviderCapabilities {
  canAnalyze: boolean
  canDownloadDirect: boolean
  canConvertLocal: boolean
  canConvertServer: boolean
  requiresBackend: boolean
  /** Mensaje explicativo opcional (por que falta algo). */
  message?: string
}

/** Metadatos reunidos sobre una fuente. Todos los campos son opcionales salvo los basicos. */
export interface SourceMetadata {
  /** URL normalizada analizada. */
  url: string
  /** Dominio de la fuente. */
  domain: string
  kind: ResourceKind
  title?: string
  thumbnailUrl?: string
  durationSeconds?: number
  mimeType?: string
  /** Tamano del recurso si la fuente lo declara. */
  contentLengthBytes?: number
  formats: MediaFormatOption[]
  capabilities: ProviderCapabilities
  /** Identificador del proveedor que resolvio el analisis. */
  providerId: string
  /** Nombre legible del proveedor. */
  providerName: string
  /** Aviso opcional para el usuario. */
  notice?: string
}

/** Estados diferenciados de la interfaz de analisis. */
export type AnalyzerStatus =
  | 'idle'
  | 'invalid-url'
  | 'validating'
  | 'analyzing'
  | 'ready'
  | 'preparing'
  | 'processing'
  | 'download-ready'
  | 'unsupported'
  | 'backend-not-configured'
  | 'network-error'
  | 'cancelled'
  | 'format-unavailable'

/** Resultado normalizado del analizador. */
export interface AnalysisResult {
  status: AnalyzerStatus
  metadata?: SourceMetadata
  message: string
  /** Accion sugerida para continuar. */
  actionHint?: string
}

/** Progreso real de una operacion medible. */
export interface ProgressInfo {
  /** 0..1 cuando se conoce, o null si no es medible. */
  ratio: number | null
  /** Etiqueta de la fase actual. */
  phase: string
  /** Bytes procesados/descargados si se conocen. */
  loadedBytes?: number
  totalBytes?: number
}

/** Entrada de historial local (desactivado por defecto). */
export interface HistoryEntry {
  url: string
  title: string
  domain: string
  at: number
  formatLabel?: string
}

/** Tema visual. */
export type ThemeName = 'dark' | 'light'
