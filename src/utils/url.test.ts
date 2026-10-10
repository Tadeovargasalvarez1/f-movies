import { describe, expect, it } from 'vitest'
import {
  classifyUrl,
  getPathExtension,
  isPrivateHost,
  safeUrl,
  suggestFileName,
  validateUrl,
} from './url'

describe('validateUrl', () => {
  it('acepta un enlace https valido', () => {
    const result = validateUrl('https://example.com/video.mp4')
    expect(result.ok).toBe(true)
    expect(result.url?.hostname).toBe('example.com')
  })

  it('rechaza una URL malformada', () => {
    const result = validateUrl('esto no es una url')
    expect(result.ok).toBe(false)
    expect(result.code).toBe('malformed')
  })

  it('rechaza cadenas vacias', () => {
    expect(validateUrl('   ').code).toBe('empty')
  })

  it('rechaza protocolos no permitidos', () => {
    const result = validateUrl('ftp://example.com/file.mp4')
    expect(result.ok).toBe(false)
    expect(result.code).toBe('protocol')
  })

  it('rechaza credenciales embebidas', () => {
    const result = validateUrl('https://user:pass@example.com/video.mp4')
    expect(result.code).toBe('credentials')
  })

  it('rechaza hosts privados o locales', () => {
    expect(validateUrl('http://localhost:3000/video.mp4').code).toBe('private-host')
    expect(validateUrl('http://192.168.0.10/file.mp4').code).toBe('private-host')
    expect(validateUrl('http://10.0.0.5/file.mp4').code).toBe('private-host')
  })

  it('permite hosts privados si se solicita explicitamente', () => {
    expect(validateUrl('http://localhost/video.mp4', { allowPrivateHosts: true }).ok).toBe(true)
  })
})

describe('isPrivateHost', () => {
  it('detecta rangos privados', () => {
    expect(isPrivateHost('127.0.0.1')).toBe(true)
    expect(isPrivateHost('172.16.5.4')).toBe(true)
    expect(isPrivateHost('172.32.5.4')).toBe(false)
    expect(isPrivateHost('example.com')).toBe(false)
  })
})

describe('classifyUrl', () => {
  it('identifica un archivo multimedia directo', () => {
    expect(classifyUrl(new URL('https://cdn.example.com/movie.mp4')).kind).toBe('direct-media')
    expect(classifyUrl(new URL('https://cdn.example.com/song.mp3')).container).toBe('mp3')
    expect(classifyUrl(new URL('https://cdn.example.com/clip.webm')).kind).toBe('direct-media')
  })

  it('identifica una pagina de plataforma', () => {
    expect(classifyUrl(new URL('https://example.com/watch?v=123')).kind).toBe('platform-page')
  })
})

describe('getPathExtension', () => {
  it('extrae la extension en minusculas', () => {
    expect(getPathExtension(new URL('https://x.com/A/B/Clip.MP4'))).toBe('mp4')
    expect(getPathExtension(new URL('https://x.com/watch?v=1'))).toBe('')
  })
})

describe('suggestFileName', () => {
  it('deduce un nombre desde la URL', () => {
    expect(suggestFileName(new URL('https://x.com/a/my%20movie.mp4'))).toBe('my movie.mp4')
  })

  it('usa el valor por defecto si no hay nombre', () => {
    expect(suggestFileName(new URL('https://x.com/'))).toBe('fmovies-archivo')
  })
})

describe('safeUrl', () => {
  it('permite http/https', () => {
    expect(safeUrl('https://x.com/a.png')).toContain('https://x.com/a.png')
  })

  it('bloquea esquemas peligrosos', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl(undefined)).toBeUndefined()
  })
})
