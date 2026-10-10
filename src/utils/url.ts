// =========================================================================
// F Movies — Utilidades de URL
// Validacion estricta, clasificacion y normalizacion de enlaces.
// =========================================================================

import type { Container, ResourceKind } from '../types'

/** Protocolos permitidos. Todo lo demas se rechaza. */
export const ALLOWED_PROTOCOLS = ['http:', 'https:'] as const

export interface UrlValidation {
  ok: boolean
  url?: URL
  /** Codigo de error estable, util para pruebas. */
  code?:
    | 'empty'
    | 'malformed'
    | 'protocol'
    | 'no-host'
    | 'credentials'
    | 'private-host'
  message?: string
}

/**
 * Valida y normaliza una URL introducida por el usuario.
 * - Exige http o https.
 * - Rechaza credenciales embebidas.
 * - Por defecto rechaza hosts locales/privados (proteccion pensada tambien
 *   para cuando se conecte un backend, frente a SSRF).
 */
export function validateUrl(input: string, options: { allowPrivateHosts?: boolean } = {}): UrlValidation {
  const raw = (input ?? '').trim()
  if (!raw) {
    return { ok: false, code: 'empty', message: 'Introduce un enlace para analizar.' }
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, code: 'malformed', message: 'El enlace no es valido. Revisa que este completo.' }
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol as (typeof ALLOWED_PROTOCOLS)[number])) {
    return {
      ok: false,
      code: 'protocol',
      message: 'Solo se admiten enlaces http o https.',
    }
  }

  if (!url.hostname) {
    return { ok: false, code: 'no-host', message: 'El enlace no tiene un dominio valido.' }
  }

  if (url.username || url.password) {
    return {
      ok: false,
      code: 'credentials',
      message: 'El enlace incluye credenciales. Eliminalas antes de continuar.',
    }
  }

  if (!options.allowPrivateHosts && isPrivateHost(url.hostname)) {
    return {
      ok: false,
      code: 'private-host',
      message: 'Los enlaces a redes locales o privadas no estan permitidos.',
    }
  }

  return { ok: true, url }
}

/** Detecta hosts locales, loopback o rangos privados (solo por nombre literal). */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  if (host === '::1' || host === '0.0.0.0') return true
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 10) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
  }
  return false
}

/** Extensiones de video/audio consideradas como archivo multimedia directo. */
export const DIRECT_MEDIA_EXTENSIONS: Record<string, Container> = {
  mp4: 'mp4',
  m4v: 'mp4',
  mov: 'mp4',
  webm: 'webm',
  mkv: 'original',
  mp3: 'mp3',
  m4a: 'm4a',
  aac: 'm4a',
  wav: 'wav',
  opus: 'opus',
  ogg: 'ogg',
  oga: 'ogg',
}

/** Devuelve la extension (sin punto, en minusculas) de la ruta de la URL. */
export function getPathExtension(url: URL): string {
  const match = /\.([a-z0-9]+)$/i.exec(url.pathname)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Clasifica una URL como archivo directo, pagina de plataforma o desconocida.
 * No realiza peticiones de red: es una clasificacion sintactica honesta.
 */
export function classifyUrl(url: URL): { kind: ResourceKind; container?: Container } {
  const ext = getPathExtension(url)
  if (ext && DIRECT_MEDIA_EXTENSIONS[ext]) {
    return { kind: 'direct-media', container: DIRECT_MEDIA_EXTENSIONS[ext] }
  }
  return { kind: 'platform-page' }
}

/** Deduce un nombre de archivo razonable a partir de la URL. */
export function suggestFileName(url: URL, fallback = 'fmovies-archivo'): string {
  const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')
  const clean = last.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120)
  return clean || fallback
}

/** Solo acepta URLs http/https seguras para usar en atributos (img, href). */
export function safeUrl(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  try {
    const u = new URL(value, 'https://invalid.local')
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined
    return u.toString()
  } catch {
    return undefined
  }
}
