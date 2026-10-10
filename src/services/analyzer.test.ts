import { afterEach, describe, expect, it, vi } from 'vitest'
import { unsupportedSourceProvider } from '../providers/unsupportedSourceProvider'
import type { Provider } from '../providers/types'
import type { SourceMetadata } from '../types'
import { analyzeUrl } from './analyzer'

function capabilities() {
  return {
    canAnalyze: true,
    canDownloadDirect: false,
    canConvertLocal: false,
    canConvertServer: true,
    requiresBackend: true,
  }
}

function fakeMetadata(url: URL, formats: SourceMetadata['formats']): SourceMetadata {
  return {
    url: url.toString(),
    domain: url.hostname,
    kind: 'platform-page',
    title: 'Contenido de prueba',
    formats,
    capabilities: capabilities(),
    providerId: 'fake-backend',
    providerName: 'Backend de prueba',
  }
}

const readyProvider: Provider = {
  id: 'fake-backend',
  name: 'Backend de prueba',
  priority: 1,
  canHandle: () => true,
  capabilities: capabilities(),
  analyze: async (ctx) =>
    fakeMetadata(ctx.url, [
      {
        id: 'v720',
        mediaType: 'video',
        container: 'mp4',
        label: 'MP4 · 720p',
        resolution: '720p',
        source: 'backend',
        requiresBackend: true,
      },
    ]),
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('analyzeUrl', () => {
  it('rechaza una URL malformada', async () => {
    const result = await analyzeUrl('no-es-una-url')
    expect(result.status).toBe('invalid-url')
    expect(result.metadata).toBeUndefined()
  })

  it('analiza un archivo multimedia directo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'video/mp4', 'content-length': '2048' }),
      })),
    )
    const result = await analyzeUrl('https://cdn.example.com/clip.mp4')
    expect(result.status).toBe('ready')
    expect(result.metadata?.kind).toBe('direct-media')
    expect(result.metadata?.formats.length).toBeGreaterThan(0)
  })

  it('informa que una pagina de plataforma requiere un backend no configurado', async () => {
    const result = await analyzeUrl('https://www.youtube.com/watch?v=abc123', { hasBackend: false })
    expect(result.status).toBe('backend-not-configured')
    expect(result.message).toContain('motor de procesamiento externo')
  })

  it('usa el proveedor externo cuando esta configurado', async () => {
    const result = await analyzeUrl('https://www.youtube.com/watch?v=abc123', {
      providers: [readyProvider],
      hasBackend: true,
    })
    expect(result.status).toBe('ready')
    expect(result.metadata?.providerId).toBe('fake-backend')
    expect(result.metadata?.formats[0].resolution).toBe('720p')
  })

  it('trata un fallo de red como error y no como exito', async () => {
    const failing: Provider = {
      ...readyProvider,
      analyze: async () => {
        throw new TypeError('Failed to fetch')
      },
    }
    const result = await analyzeUrl('https://www.youtube.com/watch?v=abc123', {
      providers: [failing],
      hasBackend: true,
    })
    expect(result.status).toBe('network-error')
    expect(result.metadata).toBeUndefined()
  })

  it('trata una respuesta incompleta del proveedor como fuente no compatible', async () => {
    const empty: Provider = { ...readyProvider, analyze: async () => null }
    const result = await analyzeUrl('https://www.youtube.com/watch?v=abc123', {
      providers: [empty],
      hasBackend: true,
    })
    expect(result.status).toBe('unsupported')
    expect(result.metadata).toBeUndefined()
  })

  it('marca la operacion como cancelada', async () => {
    const cancelling: Provider = {
      ...readyProvider,
      analyze: async () => {
        const err = new Error('abort')
        err.name = 'AbortError'
        throw err
      },
    }
    const result = await analyzeUrl('https://www.youtube.com/watch?v=abc123', {
      providers: [cancelling],
      hasBackend: true,
    })
    expect(result.status).toBe('cancelled')
  })

  it('usa el proveedor no compatible como ultimo recurso', async () => {
    const result = await analyzeUrl('https://example.com/articulo', {
      providers: [unsupportedSourceProvider],
      hasBackend: true,
    })
    expect(result.status).toBe('unsupported')
  })

  it('analiza un enlace de YouTube y solicita backend para los formatos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ title: 'Video de YouTube', author_name: 'Canal' }),
      })),
    )
    const result = await analyzeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { hasBackend: false })
    expect(result.status).toBe('backend-not-configured')
    expect(result.metadata?.title).toBe('Video de YouTube')
    expect(result.metadata?.providerId).toBe('youtube')
  })
})
