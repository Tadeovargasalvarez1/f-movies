// =========================================================================
// F Movies — YouTubeProvider
//
// Honestidad técnica y funcionamiento estático en GitHub Pages:
// 1. METADATOS: obtenidos de la API pública oEmbed de YouTube (CORS abierto).
// 2. DESCARGA SIN SERVIDOR LOCAL (GitHub Pages):
//    - Integra el protocolo de Cobalt API (compatible con instancias Cobalt públicas y privadas).
//    - Respaldo automático mediante instancias públicas Invidious.
// 3. BACKEND OPCIONAL: Si el usuario configura un backend propio con yt-dlp,
//    se priorizan sus formatos avanzados.
// =========================================================================

import { API_BASE_URL } from '../config'
import { isCobaltConfigured } from '../services/cobalt'
import { fetchInvidiousVideo } from '../services/invidious'
import type { MediaFormatOption, SourceMetadata } from '../types'
import { fetchWithTimeout } from '../utils/http'
import { backendDownloadProvider } from './backendDownloadProvider'
import type { AnalysisContext, Provider } from './types'

/** Extrae el ID de un video de YouTube a partir de las formas de URL habituales. */
export function getYouTubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id && /^[\w-]{6,}$/.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtubeeducation.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v')
    }
    const match = /^\/(?:shorts|embed|live|v)\/([^/?#]+)/.exec(url.pathname)
    if (match) return match[1]
  }

  return null
}

export const youtubeProvider: Provider = {
  id: 'youtube',
  name: 'YouTube',
  priority: 40,

  capabilities: {
    canAnalyze: true,
    canDownloadDirect: true,
    canConvertLocal: false,
    canConvertServer: true,
    requiresBackend: false,
  },

  canHandle(url) {
    return getYouTubeId(url) !== null
  },

  async analyze(ctx: AnalysisContext): Promise<SourceMetadata | null> {
    const id = getYouTubeId(ctx.url)
    if (!id) return null

    const watch = `https://www.youtube.com/watch?v=${id}`

    // 1. Metadatos reales vía oEmbed (CORS habilitado, sin autenticación)
    let title: string | undefined
    let thumbnailUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    let author: string | undefined

    try {
      const res = await fetchWithTimeout(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`,
        { signal: ctx.signal, timeoutMs: 12000 },
      )
      if (res.ok) {
        const data = (await res.json()) as {
          title?: string
          thumbnail_url?: string
          author_name?: string
        }
        title = data.title
        thumbnailUrl = data.thumbnail_url ?? thumbnailUrl
        author = data.author_name
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
    }

    let formats: MediaFormatOption[] = []
    let durationSeconds: number | undefined

    // 2. Si hay backend propio de Python configurado, consultarlo
    const base = ctx.apiBaseUrl ?? (API_BASE_URL || undefined)
    if (base) {
      try {
        const backendMeta = await backendDownloadProvider.analyze({ ...ctx, apiBaseUrl: base })
        if (backendMeta && backendMeta.formats.length > 0) {
          formats = backendMeta.formats
          durationSeconds = backendMeta.durationSeconds
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err
      }
    }

    // 3. Si no hay backend de Python: verificar si Cobalt está configurado para GitHub Pages
    if (formats.length === 0 && isCobaltConfigured()) {
      // Intentar obtener streams directos de Invidious
      try {
        const invData = await fetchInvidiousVideo(id, ctx.signal)
        if (invData && invData.formats.length > 0) {
          formats = invData.formats
          if (invData.title && !title) title = invData.title
          if (invData.durationSeconds) durationSeconds = invData.durationSeconds
          if (invData.thumbnailUrl) thumbnailUrl = invData.thumbnailUrl
        }
      } catch {
        // Fallback a Cobalt
      }

      // Opciones soportadas por Cobalt API
      const cobaltFormats: MediaFormatOption[] = [
        {
          id: 'cobalt-1080',
          mediaType: 'video',
          container: 'mp4',
          label: '1080p · MP4 · con audio (Cobalt API)',
          resolution: '1080p',
          source: 'cobalt',
          cobaltQuality: '1080',
        },
        {
          id: 'cobalt-720',
          mediaType: 'video',
          container: 'mp4',
          label: '720p · MP4 · con audio (Cobalt API)',
          resolution: '720p',
          source: 'cobalt',
          cobaltQuality: '720',
        },
        {
          id: 'cobalt-480',
          mediaType: 'video',
          container: 'mp4',
          label: '480p · MP4 · con audio (Cobalt API)',
          resolution: '480p',
          source: 'cobalt',
          cobaltQuality: '480',
        },
        {
          id: 'cobalt-360',
          mediaType: 'video',
          container: 'mp4',
          label: '360p · MP4 · con audio (Cobalt API)',
          resolution: '360p',
          source: 'cobalt',
          cobaltQuality: '360',
        },
        {
          id: 'cobalt-audio-mp3',
          mediaType: 'audio',
          container: 'mp3',
          label: 'Audio MP3 · Alta calidad (Cobalt API)',
          audioBitrateKbps: 128,
          source: 'cobalt',
        },
        {
          id: 'cobalt-audio-opus',
          mediaType: 'audio',
          container: 'opus',
          label: 'Audio OPUS (Cobalt API)',
          audioBitrateKbps: 128,
          source: 'cobalt',
        },
      ]

      const existingIds = new Set(formats.map((f) => f.id))
      for (const cf of cobaltFormats) {
        if (!existingIds.has(cf.id)) {
          formats.push(cf)
        }
      }
    }

    const hasFormats = formats.length > 0

    return {
      url: ctx.url.toString(),
      domain: ctx.url.hostname,
      kind: 'platform-page',
      title: title ?? (author ? `${author} · YouTube` : `YouTube · ${id}`),
      thumbnailUrl,
      durationSeconds,
      formats,
      capabilities: {
        canAnalyze: true,
        canDownloadDirect: hasFormats,
        canConvertLocal: false,
        canConvertServer: Boolean(base),
        requiresBackend: !hasFormats,
      },
      providerId: 'youtube',
      providerName: 'YouTube',
      notice: hasFormats
        ? undefined
        : 'Se muestran los metadatos de YouTube (via oEmbed). Para obtener los formatos y descargar el video hace falta un motor de extraccion externo autorizado (Backend propio o Cobalt API en Ajustes).',
    }
  },
}
