import { afterEach, describe, expect, it, vi } from 'vitest'
import { directMediaProvider } from './directMediaProvider'

function headResponse(headers: Record<string, string>) {
  return { ok: true, headers: new Headers(headers) } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DirectMediaProvider', () => {
  it('reconoce archivos multimedia directos', () => {
    const url = new URL('https://cdn.example.com/movie.mp4')
    expect(directMediaProvider.canHandle(url)).toBe(true)
    expect(directMediaProvider.canHandle(new URL('https://example.com/watch?v=1'))).toBe(false)
  })

  it('ofrece la calidad original y datos de cabecera cuando CORS lo permite', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => headResponse({ 'content-type': 'video/mp4', 'content-length': '1048576' })),
    )

    const metadata = await directMediaProvider.analyze({ url: new URL('https://cdn.example.com/movie.mp4') })
    expect(metadata).not.toBeNull()
    expect(metadata?.formats[0].container).toBe('mp4')
    expect(metadata?.contentLengthBytes).toBe(1048576)
    expect(metadata?.capabilities.canConvertLocal).toBe(true)
    // Incluye la original + opciones de conversion local.
    expect(metadata?.formats.some((f) => f.source === 'converted')).toBe(true)
  })

  it('degrada con elegancia cuando el servidor bloquea CORS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    const metadata = await directMediaProvider.analyze({ url: new URL('https://cdn.example.com/audio.mp3') })
    expect(metadata).not.toBeNull()
    expect(metadata?.formats).toHaveLength(1)
    expect(metadata?.capabilities.canConvertLocal).toBe(false)
    expect(metadata?.notice).toBeTruthy()
  })

  it('identifica audio y video segun la extension', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => headResponse({ 'content-type': 'audio/mpeg' })))
    const audio = await directMediaProvider.analyze({ url: new URL('https://cdn.example.com/song.mp3') })
    expect(audio?.formats[0].mediaType).toBe('audio')

    const video = await directMediaProvider.analyze({ url: new URL('https://cdn.example.com/movie.mp4') })
    expect(video?.formats[0].mediaType).toBe('video')
  })
})
