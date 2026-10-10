// =========================================================================
// F Movies — BackendDownloadProvider
// Integracion OPCIONAL con un backend externo autorizado (p. ej. yt-dlp +
// FFmpeg en un servicio propio). No se incluye ninguna URL ficticia: si no
// hay backend configurado, este proveedor no interviene.
//
// Contrato documentado:
//   POST <API_BASE_URL>/analyze  { "url": "<url>" }
//     -> { title, thumbnailUrl, durationSeconds, mimeType, contentLengthBytes,
//          formats: [{ id, mediaType, container, label, resolution,
//                      audioBitrateKbps, estimatedSizeBytes }] }
//   POST <API_BASE_URL>/download { "url", "formatId" }
//     -> 200 { "downloadUrl": "<url firmada>" }  |  200 (binario)
// =========================================================================

import { API_BASE_URL, ENDPOINTS } from '../config'
import type { MediaFormatOption, SourceMetadata } from '../types'
import { containerLabel } from '../utils/format'
import { HttpError, fetchWithTimeout } from '../utils/http'
import type { AnalysisContext, BackendAnalyzeResponse, Provider } from './types'

function normalizeFormats(raw: BackendAnalyzeResponse['formats']): MediaFormatOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((f, index) => ({
    id: String(f.id ?? `backend-${index}`),
    mediaType: f.mediaType === 'audio' ? 'audio' : 'video',
    container: f.container ?? 'original',
    label: f.label ?? `${containerLabel(f.container ?? 'original')}${f.resolution ? ` · ${f.resolution}` : ''}`,
    resolution: f.resolution,
    audioBitrateKbps: f.audioBitrateKbps,
    estimatedSizeBytes: f.estimatedSizeBytes,
    source: 'backend' as const,
    requiresBackend: true,
  }))
}

export const backendDownloadProvider: Provider = {
  id: 'backend',
  name: 'Servicio externo',
  priority: 50,

  capabilities: {
    canAnalyze: true,
    canDownloadDirect: false,
    canConvertLocal: false,
    canConvertServer: true,
    requiresBackend: true,
  },

  canHandle() {
    // Solo interviene cuando hay un backend configurado.
    return API_BASE_URL.length > 0
  },

  async analyze(ctx: AnalysisContext): Promise<SourceMetadata | null> {
    const base = ctx.apiBaseUrl ?? API_BASE_URL
    if (!base) return null

    const res = await fetchWithTimeout(`${base}${ENDPOINTS.analyze}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: ctx.url.toString() }),
      signal: ctx.signal,
      timeoutMs: 25000,
    })

    if (!res.ok) {
      throw new HttpError(`El servicio externo respondio ${res.status}.`, res.status)
    }

    const data = (await res.json()) as BackendAnalyzeResponse
    const formats = normalizeFormats(data.formats)

    if (formats.length === 0) {
      // El proveedor respondio pero sin opciones utilizables.
      return null
    }

    return {
      url: ctx.url.toString(),
      domain: ctx.url.hostname,
      kind: 'platform-page',
      title: data.title,
      thumbnailUrl: data.thumbnailUrl,
      durationSeconds: data.durationSeconds,
      mimeType: data.mimeType,
      contentLengthBytes: data.contentLengthBytes,
      formats,
      capabilities: {
        canAnalyze: true,
        canDownloadDirect: false,
        canConvertLocal: false,
        canConvertServer: true,
        requiresBackend: true,
      },
      providerId: 'backend',
      providerName: 'Servicio externo',
    }
  },
}
