import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { MediaFormatOption, ProgressInfo, SourceMetadata } from '../types'
import {
  buildFileName,
  downloadViaBackend,
  extensionFor,
  fetchAsBlob,
  streamResponseToBlob,
} from './downloader'

const PAYLOAD = Buffer.from('FMovies-test-payload-0123456789')

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/media.mp4') {
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': String(PAYLOAD.length),
      })
      res.end(PAYLOAD)
    } else {
      res.writeHead(404)
      res.end('not found')
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('fetchAsBlob — descarga real de un recurso accesible', () => {
  it('descarga el contenido completo desde un servidor HTTP real', async () => {
    const progress: ProgressInfo[] = []
    const blob = await fetchAsBlob(`${baseUrl}/media.mp4`, (p) => progress.push(p))
    expect(blob.size).toBe(PAYLOAD.length)
    expect(blob.type).toBe('video/mp4')
    expect(progress.length).toBeGreaterThan(0)
    expect(progress.at(-1)?.ratio).toBe(1)
  })

  it('falla de forma explicita ante un recurso inexistente', async () => {
    await expect(fetchAsBlob(`${baseUrl}/no-existe.mp4`)).rejects.toThrow('HTTP 404')
  })
})

describe('streamResponseToBlob', () => {
  it('ensambla correctamente los fragmentos de un stream', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('hola '))
        controller.enqueue(encoder.encode('mundo'))
        controller.close()
      },
    })
    const response = new Response(stream, { headers: { 'Content-Type': 'text/plain' } })
    const blob = await streamResponseToBlob(response)
    expect(await blob.text()).toBe('hola mundo')
  })
})

describe('utilidades de nombre de archivo', () => {
  const meta: SourceMetadata = {
    url: 'https://x.com/movie.mp4',
    domain: 'x.com',
    kind: 'direct-media',
    title: 'Mi Pelicula',
    formats: [],
    capabilities: {
      canAnalyze: true,
      canDownloadDirect: true,
      canConvertLocal: false,
      canConvertServer: false,
      requiresBackend: false,
    },
    providerId: 'direct-media',
    providerName: 'Archivo directo',
  }

  const format: MediaFormatOption = {
    id: 'f',
    mediaType: 'video',
    container: 'mp4',
    label: 'MP4 · 1080p',
    resolution: '1080p',
    source: 'direct',
  }

  it('extensionFor mapea contenedores', () => {
    expect(extensionFor('mp4')).toBe('mp4')
    expect(extensionFor('m4a')).toBe('m4a')
  })

  it('buildFileName incluye titulo y resolucion', () => {
    expect(buildFileName(meta, format)).toBe('Mi Pelicula-1080p.mp4')
  })
})

describe('backend no configurado', () => {
  it('lanza BACKEND_NOT_CONFIGURED si no hay URL base', async () => {
    const meta: SourceMetadata = {
      url: 'https://x.com/v',
      domain: 'x.com',
      kind: 'platform-page',
      formats: [],
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
    const format: MediaFormatOption = {
      id: 'f',
      mediaType: 'video',
      container: 'mp4',
      label: 'MP4',
      source: 'backend',
      requiresBackend: true,
    }
    await expect(downloadViaBackend(meta, format, undefined, undefined, '')).rejects.toThrow('BACKEND_NOT_CONFIGURED')
  })
})
