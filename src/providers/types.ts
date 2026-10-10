// =========================================================================
// F Movies — Contratos de proveedores
// =========================================================================

import type { MediaFormatOption, SourceMetadata } from '../types'

export interface AnalysisContext {
  url: URL
  signal?: AbortSignal
  /** URL base del backend externo autorizado, si esta configurado. */
  apiBaseUrl?: string
}

/**
 * Contrato base de un proveedor de analisis.
 * Cada proveedor declara que URLs puede manejar y devuelve metadatos
 * verificables, o `null` si no puede resolver la fuente.
 */
export interface Provider {
  id: string
  name: string
  /** Menor numero = se intenta antes. */
  priority: number
  canHandle(url: URL): boolean
  analyze(ctx: AnalysisContext): Promise<SourceMetadata | null>
  /** Capacidades genericas del proveedor (no dependen de una fuente concreta). */
  capabilities: SourceMetadata['capabilities']
}

/**
 * Contrato de una operacion de conversion local (FFmpeg.wasm u otro motor).
 * La conversion siempre parte de un recurso que el navegador puede obtener
 * o que el usuario carga explicitamente.
 */
export interface ConversionProvider {
  id: string
  name: string
  /** Formatos de salida que el motor puede producir. */
  outputs: MediaFormatOption['container'][]
  /** Estima si puede procesar un archivo de `bytes` de tamano. */
  canProcess(bytes: number): boolean
  /** Limite de tamano en bytes que acepta el motor local. */
  maxBytes: number
}

/** Resultado del analisis de un backend externo. Formato publico documentado. */
export interface BackendAnalyzeResponse {
  title?: string
  thumbnailUrl?: string
  durationSeconds?: number
  mimeType?: string
  contentLengthBytes?: number
  formats?: Array<{
    id: string
    mediaType: 'video' | 'audio'
    container: MediaFormatOption['container']
    label?: string
    resolution?: MediaFormatOption['resolution']
    audioBitrateKbps?: number
    estimatedSizeBytes?: number
  }>
}
