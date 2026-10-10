// =========================================================================
// F Movies — Servicio de descargas
// Solo descarga recursos reales y accesibles. Nunca simula resultados.
// =========================================================================

import { API_BASE_URL, ENDPOINTS } from '../config'
import type { Container, MediaFormatOption, ProgressInfo, SourceMetadata } from '../types'
import { fetchWithTimeout } from '../utils/http'

const EXT_BY_CONTAINER: Record<Container, string> = {
  mp4: 'mp4',
  webm: 'webm',
  mp3: 'mp3',
  m4a: 'm4a',
  wav: 'wav',
  opus: 'opus',
  ogg: 'ogg',
  original: '',
}

export interface DownloadOutcome {
  saved: boolean
  /** true si se recurrio a la descarga directa del navegador (sin leer el cuerpo). */
  usedFallback: boolean
  fileName: string
}

/** Sufijo de extension derivado del contenedor solicitado. */
export function extensionFor(container: Container): string {
  return EXT_BY_CONTAINER[container] ?? ''
}

/** Construye un nombre de archivo seguro y descriptivo. */
export function buildFileName(meta: SourceMetadata, format: MediaFormatOption): string {
  const base =
    (meta.title ?? 'fmovies')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[\\/:*?"<>|©®™]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'fmovies'
  const quality = format.resolution && format.resolution !== 'original' ? `-${format.resolution}` : ''
  const ext = extensionFor(format.container)
  return `${base}${quality}${ext ? `.${ext}` : ''}`
}

/** Lee el cuerpo de una respuesta por streaming, informando progreso real. */
export async function streamResponseToBlob(
  response: Response,
  onProgress?: (p: ProgressInfo) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const mime = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream'
  const lengthHeader = response.headers.get('content-length')
  const totalBytes = lengthHeader && Number.isFinite(Number(lengthHeader)) ? Number(lengthHeader) : undefined

  if (!response.body) {
    const blob = await response.blob()
    onProgress?.({ ratio: 1, phase: 'Descarga completada', loadedBytes: blob.size, totalBytes: blob.size })
    return blob
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  try {
    for (;;) {
      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        loaded += value.byteLength
        onProgress?.({
          ratio: totalBytes ? Math.min(loaded / totalBytes, 0.999) : null,
          phase: 'Descargando',
          loadedBytes: loaded,
          totalBytes,
        })
      }
    }
  } finally {
    reader.releaseLock()
  }

  onProgress?.({ ratio: 1, phase: 'Descarga completada', loadedBytes: loaded, totalBytes: totalBytes ?? loaded })
  return new Blob(chunks as BlobPart[], { type: mime })
}

/** Guarda un Blob en disco usando un enlace temporal. */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Fuerza la descarga/navegacion directa del navegador (cuando CORS impide leer). */
export function triggerNavigationalDownload(url: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export interface DirectDownloadParams {
  url: string
  fileName: string
  signal?: AbortSignal
  onProgress?: (p: ProgressInfo) => void
}

/**
 * Descarga directa de un recurso accesible.
 * 1. Intenta leer el cuerpo (permite medir progreso y guardar con nombre).
 * 2. Si el navegador no puede leerlo (CORS), recurre a la descarga directa.
 */
export async function downloadDirect(params: DirectDownloadParams): Promise<DownloadOutcome> {
  const { url, fileName, signal, onProgress } = params
  try {
    const response = await fetch(url, { signal, redirect: 'follow' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await streamResponseToBlob(response, onProgress, signal)
    saveBlobAsFile(blob, fileName)
    return { saved: true, usedFallback: false, fileName }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    // Fallback honesto: el navegador intenta descargar sin leer el cuerpo.
    triggerNavigationalDownload(url, fileName)
    return { saved: true, usedFallback: true, fileName }
  }
}

export interface BackendDownloadResult {
  downloadUrl?: string
  blob?: Blob
  fileName: string
}

/**
 * Descarga a traves del backend externo autorizado.
 * Espera JSON con `downloadUrl` o una respuesta binaria.
 */
export async function downloadViaBackend(
  meta: SourceMetadata,
  format: MediaFormatOption,
  onProgress?: (p: ProgressInfo) => void,
  signal?: AbortSignal,
): Promise<BackendDownloadResult> {
  if (!API_BASE_URL) {
    throw new Error('BACKEND_NOT_CONFIGURED')
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.download}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: meta.url, formatId: format.id }),
    signal,
    timeoutMs: 300000,
  })

  if (!res.ok) throw new Error(`El servicio externo respondio ${res.status}.`)

  const contentType = res.headers.get('content-type') ?? ''
  const fileName = buildFileName(meta, format)

  if (contentType.includes('application/json')) {
    const data = (await res.json()) as { downloadUrl?: string }
    if (!data.downloadUrl) throw new Error('El servicio externo no devolvio un enlace valido.')
    return { downloadUrl: data.downloadUrl, fileName }
  }

  const blob = await streamResponseToBlob(res, onProgress, signal)
  return { blob, fileName }
}

/** Obtiene un recurso como Blob (necesario para la conversion local). */
export async function fetchAsBlob(
  url: string,
  onProgress?: (p: ProgressInfo) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(url, { signal, redirect: 'follow' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return streamResponseToBlob(response, onProgress, signal)
}

/** Orquesta la descarga segun el origen de la opcion seleccionada. */
export async function performDownload(params: {
  meta: SourceMetadata
  format: MediaFormatOption
  signal?: AbortSignal
  onProgress?: (p: ProgressInfo) => void
}): Promise<DownloadOutcome> {
  const { meta, format, signal, onProgress } = params
  const fileName = buildFileName(meta, format)

  if (format.source === 'backend') {
    const result = await downloadViaBackend(meta, format, onProgress, signal)
    if (result.blob) {
      saveBlobAsFile(result.blob, fileName)
    } else if (result.downloadUrl) {
      await downloadDirect({ url: result.downloadUrl, fileName, signal, onProgress })
    }
    return { saved: true, usedFallback: false, fileName }
  }

  return downloadDirect({ url: meta.url, fileName, signal, onProgress })
}
