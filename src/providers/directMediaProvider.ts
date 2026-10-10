// =========================================================================
// F Movies — DirectMediaProvider
// Archivos multimedia accesibles directamente por URL.
//
// Honestidad: solo ofrece la calidad original del archivo y, cuando el
// servidor permite leer el contenido (CORS), opciones de conversion local.
// No inventa resoluciones ni tamanos: si no se pueden obtener, no se muestran.
// =========================================================================

import type { Container, MediaFormatOption, MediaType } from '../types'
import { containerLabel } from '../utils/format'
import { classifyUrl, getPathExtension } from '../utils/url'
import type { AnalysisContext, Provider } from './types'

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'opus', 'ogg', 'oga'])

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  opus: 'audio/ogg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
}

function mediaTypeForExtension(ext: string): MediaType {
  return AUDIO_EXTENSIONS.has(ext) ? 'audio' : 'video'
}

/** Opciones de conversion local que se ofrecen para un archivo legible. */
function localConversionFormats(mediaType: MediaType): MediaFormatOption[] {
  if (mediaType === 'audio') {
    return [
      { id: 'conv-mp3', mediaType: 'audio', container: 'mp3', label: 'MP3 (convertido)', source: 'converted', requiresBackend: false },
      { id: 'conv-wav', mediaType: 'audio', container: 'wav', label: 'WAV (convertido)', source: 'converted', requiresBackend: false },
    ]
  }
  return [
    { id: 'conv-mp4', mediaType: 'video', container: 'mp4', label: 'MP4 (convertido)', resolution: 'original', source: 'converted', requiresBackend: false },
    { id: 'conv-webm', mediaType: 'video', container: 'webm', label: 'WebM (convertido)', resolution: 'original', source: 'converted', requiresBackend: false },
    { id: 'conv-mp3', mediaType: 'audio', container: 'mp3', label: 'Solo audio · MP3 (convertido)', source: 'converted', requiresBackend: false },
  ]
}

export const directMediaProvider: Provider = {
  id: 'direct-media',
  name: 'Archivo directo',
  priority: 10,

  capabilities: {
    canAnalyze: true,
    canDownloadDirect: true,
    canConvertLocal: true,
    canConvertServer: false,
    requiresBackend: false,
  },

  canHandle(url) {
    return classifyUrl(url).kind === 'direct-media'
  },

  async analyze(ctx: AnalysisContext) {
    const ext = getPathExtension(ctx.url)
    const classified = classifyUrl(ctx.url)
    const container: Container = classified.container ?? 'original'
    const mediaType = mediaTypeForExtension(ext)

    let contentLengthBytes: number | undefined
    let serverMime: string | undefined
    let corsReadable = false
    let networkError = false

    // Intento honesto de obtener cabeceras. Muchos servidores bloquean CORS:
    // en ese caso seguimos adelante sin tamano y sin conversion local.
    try {
      const res = await fetch(ctx.url.toString(), {
        method: 'HEAD',
        signal: ctx.signal,
        redirect: 'follow',
      })
      if (res.ok) {
        corsReadable = true
        const len = res.headers.get('content-length')
        if (len && Number.isFinite(Number(len))) contentLengthBytes = Number(len)
        serverMime = res.headers.get('content-type')?.split(';')[0]?.trim() || undefined
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      networkError = true
    }

    const originalOption: MediaFormatOption = {
      id: `direct-${container}`,
      mediaType,
      container,
      label: `${containerLabel(container)} · Original`,
      resolution: mediaType === 'video' ? 'original' : undefined,
      estimatedSizeBytes: contentLengthBytes,
      source: 'direct',
    }

    const formats: MediaFormatOption[] = [originalOption]
    // Conversion local solo si el navegador puede leer el archivo (CORS).
    if (corsReadable) formats.push(...localConversionFormats(mediaType))

    const notices: string[] = []
    if (networkError) {
      notices.push('No se pudieron comprobar las cabeceras del archivo (posible bloqueo CORS).')
    }
    if (!corsReadable) {
      notices.push(
        'Este servidor no permite leer el archivo desde el navegador. Puedes descargarlo con un enlace directo; la conversion local no esta disponible.',
      )
    }

    return {
      url: ctx.url.toString(),
      domain: ctx.url.hostname,
      kind: 'direct-media',
      title: decodeURIComponent(ctx.url.pathname.split('/').filter(Boolean).pop() ?? ctx.url.hostname),
      thumbnailUrl: undefined,
      mimeType: serverMime ?? MIME_BY_EXT[ext],
      contentLengthBytes,
      durationSeconds: undefined,
      formats,
      capabilities: {
        canAnalyze: true,
        canDownloadDirect: true,
        canConvertLocal: corsReadable,
        canConvertServer: false,
        requiresBackend: false,
        message: corsReadable
          ? undefined
          : 'Conversion local no disponible para esta fuente (CORS).',
      },
      providerId: 'direct-media',
      providerName: 'Archivo directo',
      notice: notices.join(' ') || undefined,
    }
  },
}
