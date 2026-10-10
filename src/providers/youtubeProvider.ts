// =========================================================================
// F Movies — YouTubeProvider
//
// Honestidad tecnica:
// - Los METADATOS (titulo, miniatura, autor) se obtienen de la API publica
//   oEmbed de YouTube, que permite CORS. Es informacion real y estable.
// - Los FORMATOS descargables NO pueden extraerse solo desde el navegador:
//   YouTube aplica CORS, firmas cifradas y medidas anti-automatizacion.
//   Por eso, si hay un backend externo autorizado configurado, se delega en
//   el para obtener las opciones; si no, se explica con claridad.
//
// No se inventa ninguna opcion de descarga.
// =========================================================================

import { API_BASE_URL } from '../config'
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
    canDownloadDirect: false,
    canConvertLocal: false,
    canConvertServer: true,
    requiresBackend: true,
  },

  canHandle(url) {
    return getYouTubeId(url) !== null
  },

  async analyze(ctx: AnalysisContext): Promise<SourceMetadata | null> {
    const id = getYouTubeId(ctx.url)
    if (!id) return null

    const watch = `https://www.youtube.com/watch?v=${id}`

    // 1. Metadatos reales via oEmbed (CORS habilitado, sin autenticacion).
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
      // Si oEmbed falla seguimos con la miniatura construida y sin titulo.
    }

    // 2. Formatos: solo si hay un backend externo autorizado.
    const base = ctx.apiBaseUrl ?? (API_BASE_URL || undefined)
    let formats: MediaFormatOption[] = []
    if (base) {
      try {
        const backendMeta = await backendDownloadProvider.analyze({ ...ctx, apiBaseUrl: base })
        if (backendMeta && backendMeta.formats.length > 0) formats = backendMeta.formats
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err
        // El backend fallo: conservamos los metadatos y explicamos.
      }
    }

    const hasFormats = formats.length > 0

    return {
      url: ctx.url.toString(),
      domain: ctx.url.hostname,
      kind: 'platform-page',
      title: title ?? (author ? `${author} · YouTube` : `YouTube · ${id}`),
      thumbnailUrl,
      durationSeconds: undefined,
      formats,
      capabilities: {
        canAnalyze: true,
        canDownloadDirect: false,
        canConvertLocal: false,
        canConvertServer: Boolean(base),
        requiresBackend: true,
      },
      providerId: 'youtube',
      providerName: 'YouTube',
      notice: hasFormats
        ? undefined
        : 'Se muestran los metadatos de YouTube (via oEmbed). Para obtener los formatos y descargar el video hace falta un motor de extraccion externo autorizado.',
    }
  },
}
