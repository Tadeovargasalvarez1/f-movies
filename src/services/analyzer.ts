// =========================================================================
// F Movies — Servicio de analisis
// Valida la URL, elige proveedor y normaliza el resultado.
// Nunca presenta un fallo como exito.
// =========================================================================

import { API_BASE_URL, BACKEND_NOT_CONFIGURED_MESSAGE, HAS_BACKEND } from '../config'
import { providers as defaultProviders } from '../providers/registry'
import type { Provider } from '../providers/types'
import type { AnalysisResult } from '../types'
import { HttpError } from '../utils/http'
import { classifyUrl, validateUrl } from '../utils/url'

export interface AnalyzeOptions {
  signal?: AbortSignal
  /** Permite inyectar proveedores en pruebas. */
  providers?: Provider[]
  /** Sobrescribe la URL base del backend (pruebas). */
  apiBaseUrl?: string
  /** Sobrescribe la deteccion de backend (pruebas). */
  hasBackend?: boolean
}

function isAbortError(err: unknown): boolean {
  return (err as { name?: string })?.name === 'AbortError'
}

export async function analyzeUrl(input: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const providerList = options.providers ?? defaultProviders
  const apiBaseUrl = options.apiBaseUrl ?? (API_BASE_URL || undefined)
  const hasBackend = options.hasBackend ?? HAS_BACKEND

  // 1. Validacion sintactica.
  const validation = validateUrl(input)
  if (!validation.ok || !validation.url) {
    return {
      status: 'invalid-url',
      message: validation.message ?? 'El enlace no es valido.',
      actionHint: 'Revisa el enlace e intentalo de nuevo. Solo se admiten http o https.',
    }
  }

  const url = validation.url
  const kind = classifyUrl(url).kind

  // 2. Seleccion de proveedor.
  const provider = providerList.find((p) => p.canHandle(url))

  if (!provider) {
    return {
      status: 'unsupported',
      message: 'No hay ningun proveedor capaz de analizar este enlace.',
    }
  }

  // 3. Sin backend: las paginas de plataforma no pueden analizarse aqui.
  if (provider.id === 'unsupported') {
    if (kind === 'platform-page' && !hasBackend) {
      return {
        status: 'backend-not-configured',
        message: BACKEND_NOT_CONFIGURED_MESSAGE,
        actionHint: 'Configura VITE_API_BASE_URL con un servicio externo autorizado.',
      }
    }
    return {
      status: 'unsupported',
      message:
        provider.capabilities.message ??
        'Esta fuente no puede analizarse desde el navegador.',
      actionHint: 'Prueba con un enlace directo a un archivo .mp4, .webm, .mp3, etc.',
    }
  }

  // 4. Ejecucion del proveedor.
  try {
    const metadata = await provider.analyze({ url, signal: options.signal, apiBaseUrl })

    if (!metadata) {
      if (kind === 'platform-page' && !hasBackend) {
        return {
          status: 'backend-not-configured',
          message: BACKEND_NOT_CONFIGURED_MESSAGE,
          actionHint: 'Configura VITE_API_BASE_URL con un servicio externo autorizado.',
        }
      }
      return {
        status: 'unsupported',
        message: 'El proveedor no pudo extraer informacion utilizable de este enlace.',
      }
    }

    if (metadata.formats.length === 0) {
      return {
        status: 'unsupported',
        metadata,
        message: 'No se detectaron formatos disponibles para esta fuente.',
        actionHint: 'Comprueba que la fuente permita el acceso a este recurso.',
      }
    }

    return {
      status: 'ready',
      metadata,
      message: 'Metadatos encontrados.',
    }
  } catch (err) {
    if (isAbortError(err)) {
      return { status: 'cancelled', message: 'Operacion cancelada por el usuario.' }
    }
    if (err instanceof HttpError) {
      return {
        status: 'network-error',
        message: `El servicio externo respondio con un error (${err.status}).`,
        actionHint: 'Comprueba la configuracion del backend o intentalo mas tarde.',
      }
    }
    return {
      status: 'network-error',
      message: 'No se pudo contactar con la fuente. Puede deberse a CORS, red o disponibilidad.',
      actionHint: 'Comprueba tu conexion o el estado de la fuente.',
    }
  }
}
