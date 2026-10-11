// =========================================================================
// F Movies — Servicio Invidious (Fallback público para YouTube)
// Permite obtener streams reales de YouTube con CORS desde instancias públicas
// sin requerir credenciales ni backend local.
// =========================================================================

import type { MediaFormatOption } from '../types'
import { fetchWithTimeout } from '../utils/http'

export const INVIDIOUS_INSTANCES = [
  'https://invidious.flokinet.to',
  'https://invidious.projectsegfau.lt',
  'https://yt.artemislena.eu',
  'https://invidious.drgns.space',
]

interface InvidiousStream {
  url: string
  itag?: string
  type?: string
  quality?: string
  container?: string
  encoding?: string
  resolution?: string
  size?: string
}

interface InvidiousVideoResponse {
  title?: string
  author?: string
  lengthSeconds?: number
  videoThumbnails?: Array<{ url: string; quality: string }>
  formatStreams?: InvidiousStream[]
  adaptiveFormats?: InvidiousStream[]
}

export async function fetchInvidiousVideo(
  videoId: string,
  signal?: AbortSignal,
): Promise<{
  title?: string
  author?: string
  durationSeconds?: number
  thumbnailUrl?: string
  formats: MediaFormatOption[]
} | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetchWithTimeout(`${instance}/api/v1/videos/${videoId}`, {
        signal,
        timeoutMs: 12000,
      })

      if (!res.ok) continue

      const data = (await res.json()) as InvidiousVideoResponse
      const formats: MediaFormatOption[] = []

      // Formatos de video con audio combinados
      if (Array.isArray(data.formatStreams)) {
        for (const stream of data.formatStreams) {
          const rawRes = stream.resolution || stream.quality || '360p'
          const res = (['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'].includes(rawRes)
            ? rawRes
            : 'original') as import('../types').VideoResolution
          const container = (stream.container || 'mp4').toLowerCase() === 'webm' ? 'webm' : 'mp4'
          formats.push({
            id: `invidious-${stream.itag || rawRes}`,
            mediaType: 'video',
            container,
            label: `${rawRes} · ${container.toUpperCase()} · con audio`,
            resolution: res,
            source: 'direct',
            directUrl: stream.url,
          })
        }
      }

      // Formatos de audio sueltos
      if (Array.isArray(data.adaptiveFormats)) {
        const audioStreams = data.adaptiveFormats.filter((s) => s.type?.startsWith('audio/'))
        for (const aStream of audioStreams) {
          const isOpus = aStream.type?.includes('opus') || aStream.container === 'webm'
          const isM4a = aStream.type?.includes('mp4') || aStream.container === 'm4a'
          const container = isOpus ? 'opus' : isM4a ? 'm4a' : 'mp3'
          formats.push({
            id: `invidious-audio-${aStream.itag || container}`,
            mediaType: 'audio',
            container,
            label: `Audio ${container.toUpperCase()}`,
            source: 'direct',
            directUrl: aStream.url,
          })
        }
      }

      if (formats.length > 0) {
        let bestThumb: string | undefined
        if (data.videoThumbnails && data.videoThumbnails.length > 0) {
          bestThumb = data.videoThumbnails[data.videoThumbnails.length - 1].url
        }

        return {
          title: data.title,
          author: data.author,
          durationSeconds: data.lengthSeconds,
          thumbnailUrl: bestThumb,
          formats,
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      // Continuar con la siguiente instancia
    }
  }

  return null
}
