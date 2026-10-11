// =========================================================================
// F Movies — Servicio de Cobalt API
// Implementa el protocolo estándar de Cobalt (usado por cobalt-api y cobalt.tools).
// Permite descargar contenido multimedia (YouTube, TikTok, Twitter/X, etc.)
// directamente desde el navegador en GitHub Pages sin necesidad de backend local.
// =========================================================================

import { fetchWithTimeout } from '../utils/http'

export interface CobaltRequestOptions {
  url: string
  videoQuality?: 'max' | '4320' | '2160' | '1440' | '1080' | '720' | '480' | '360' | '240' | '144'
  audioFormat?: 'best' | 'mp3' | 'ogg' | 'wav' | 'opus'
  audioBitrate?: '320' | '256' | '128' | '96' | '64' | '8'
  downloadMode?: 'auto' | 'audio' | 'mute'
  filenameStyle?: 'classic' | 'pretty' | 'basic' | 'nerdy'
}

export interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error' | 'rate-limit'
  url?: string
  filename?: string
  picker?: Array<{
    type?: string
    url: string
    thumb?: string
  }>
  error?: {
    code: string
    context?: Record<string, unknown>
  }
  text?: string
}

const STORAGE_KEY_URL = 'fm_cobalt_url'
const STORAGE_KEY_API_KEY = 'fm_cobalt_key'

/** Determina si Cobalt está configurado activamente por el usuario o por entorno. */
export function isCobaltConfigured(): boolean {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_URL)
    if (custom && custom.trim()) return true
  } catch {
    //
  }

  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  if (env?.VITE_COBALT_API_URL && env.VITE_COBALT_API_URL.trim()) return true

  return false
}

/** URL de instancia de Cobalt por defecto o guardada por el usuario. */
export function getCobaltApiUrl(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_URL)
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '')
  } catch {
    // Si localStorage no está disponible
  }

  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  if (env?.VITE_COBALT_API_URL) return env.VITE_COBALT_API_URL.replace(/\/+$/, '')

  return 'https://api.cobalt.tools'
}

/** Guarda la URL de la instancia de Cobalt en el navegador. */
export function setCobaltApiUrl(url: string): void {
  try {
    if (url.trim()) {
      localStorage.setItem(STORAGE_KEY_URL, url.trim().replace(/\/+$/, ''))
    } else {
      localStorage.removeItem(STORAGE_KEY_URL)
    }
  } catch {
    // Error silencioso en almacenamiento privado
  }
}

/** Clave de API opcional para instancias que la requieran. */
export function getCobaltApiKey(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_API_KEY)
    if (custom && custom.trim()) return custom.trim()
  } catch {
    //
  }

  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return env?.VITE_COBALT_API_KEY || ''
}

/** Guarda la clave de API de Cobalt. */
export function setCobaltApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, key.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY)
    }
  } catch {
    //
  }
}

/**
 * Realiza una petición a la API de Cobalt para resolver la URL de descarga directa.
 */
export async function requestCobaltDownload(
  options: CobaltRequestOptions,
  signal?: AbortSignal,
): Promise<{ downloadUrl: string; filename?: string }> {
  const baseUrl = getCobaltApiUrl()
  const apiKey = getCobaltApiKey()

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers.Authorization = apiKey.startsWith('Bearer ') || apiKey.startsWith('Api-Key ')
      ? apiKey
      : `Api-Key ${apiKey}`
  }

  const body = {
    url: options.url,
    videoQuality: options.videoQuality ?? '1080',
    audioFormat: options.audioFormat ?? 'mp3',
    downloadMode: options.downloadMode ?? 'auto',
    filenameStyle: options.filenameStyle ?? 'basic',
  }

  const endpoint = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
    timeoutMs: 30000,
  })

  if (!res.ok) {
    let errCode = `HTTP ${res.status}`
    try {
      const errJson = (await res.json()) as CobaltResponse
      if (errJson.error?.code) errCode = errJson.error.code
      else if (errJson.text) errCode = errJson.text
    } catch {
      // Ignora error al parsear JSON
    }
    throw new Error(`Cobalt API: ${errCode}`)
  }

  const data = (await res.json()) as CobaltResponse

  if (data.status === 'tunnel' || data.status === 'redirect') {
    if (!data.url) throw new Error('Cobalt no devolvió enlace de descarga.')
    return { downloadUrl: data.url, filename: data.filename }
  }

  if (data.status === 'picker' && data.picker && data.picker.length > 0) {
    return { downloadUrl: data.picker[0].url }
  }

  if (data.status === 'error') {
    throw new Error(data.error?.code || data.text || 'Error en Cobalt API')
  }

  throw new Error(`Respuesta desconocida de Cobalt: ${data.status}`)
}
