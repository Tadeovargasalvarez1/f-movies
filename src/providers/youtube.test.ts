import { afterEach, describe, expect, it, vi } from 'vitest'
import { getYouTubeId, youtubeProvider } from './youtubeProvider'

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getYouTubeId', () => {
  it('reconoce las formas de URL habituales', () => {
    expect(getYouTubeId(new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))).toBe('dQw4w9WgXcQ')
    expect(getYouTubeId(new URL('https://youtu.be/dQw4w9WgXcQ'))).toBe('dQw4w9WgXcQ')
    expect(getYouTubeId(new URL('https://m.youtube.com/watch?v=abc123XYZ'))).toBe('abc123XYZ')
    expect(getYouTubeId(new URL('https://www.youtube.com/shorts/abc123XYZ'))).toBe('abc123XYZ')
    expect(getYouTubeId(new URL('https://www.youtube.com/embed/abc123XYZ'))).toBe('abc123XYZ')
    expect(getYouTubeId(new URL('https://music.youtube.com/watch?v=abc123XYZ'))).toBe('abc123XYZ')
  })

  it('rechaza enlaces que no son de YouTube', () => {
    expect(getYouTubeId(new URL('https://example.com/watch?v=x'))).toBeNull()
    expect(getYouTubeId(new URL('https://vimeo.com/12345'))).toBeNull()
  })
})

describe('YouTubeProvider', () => {
  it('reconoce enlaces de YouTube y rechaza otros', () => {
    expect(youtubeProvider.canHandle(new URL('https://www.youtube.com/watch?v=abc'))).toBe(true)
    expect(youtubeProvider.canHandle(new URL('https://example.com/video.mp4'))).toBe(false)
  })

  it('obtiene metadatos reales via oEmbed (sin backend)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toContain('oembed')
        return jsonResponse({
          title: 'Video de prueba',
          thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
          author_name: 'Canal de prueba',
        })
      }),
    )

    const metadata = await youtubeProvider.analyze({
      url: new URL('https://www.youtube.com/watch?v=abc123XYZ'),
    })

    expect(metadata?.title).toBe('Video de prueba')
    expect(metadata?.thumbnailUrl).toContain('ytimg')
    expect(metadata?.providerId).toBe('youtube')
    // Sin backend no se inventan formatos.
    expect(metadata?.formats).toHaveLength(0)
    expect(metadata?.capabilities.requiresBackend).toBe(true)
    expect(metadata?.notice).toBeTruthy()
  })

  it('obtiene formatos reales cuando hay backend configurado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('oembed')) {
          return jsonResponse({ title: 'Con backend', thumbnail_url: 'https://i.ytimg.com/vi/abc/hq.jpg' })
        }
        if (url.includes('/analyze')) {
          return jsonResponse({
            title: 'Con backend',
            formats: [
              { id: 'v1080', mediaType: 'video', container: 'mp4', resolution: '1080p' },
              { id: 'a128', mediaType: 'audio', container: 'mp3', audioBitrateKbps: 128 },
            ],
          })
        }
        return jsonResponse({}, 404)
      }),
    )

    const metadata = await youtubeProvider.analyze({
      url: new URL('https://youtu.be/abc123XYZ'),
      apiBaseUrl: 'https://backend.example.test',
    })

    expect(metadata?.formats).toHaveLength(2)
    expect(metadata?.formats[0].source).toBe('backend')
    expect(metadata?.capabilities.canConvertServer).toBe(true)
    expect(metadata?.notice).toBeUndefined()
  })

  it('conserva los metadatos si el backend falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('oembed')) return jsonResponse({ title: 'Titulo' })
        return jsonResponse({ error: 'boom' }, 500)
      }),
    )

    const metadata = await youtubeProvider.analyze({
      url: new URL('https://www.youtube.com/watch?v=abc123XYZ'),
      apiBaseUrl: 'https://backend.example.test',
    })
    expect(metadata?.title).toBe('Titulo')
    expect(metadata?.formats).toHaveLength(0)
  })
})
