// =========================================================================
// F Movies — Registro de proveedores
// Ordenados por prioridad. El analizador los recorre en orden.
// =========================================================================

import { backendDownloadProvider } from './backendDownloadProvider'
import { directMediaProvider } from './directMediaProvider'
import { unsupportedSourceProvider } from './unsupportedSourceProvider'
import { youtubeProvider } from './youtubeProvider'
import type { Provider } from './types'

export const providers: Provider[] = [
  directMediaProvider,
  youtubeProvider,
  backendDownloadProvider,
  unsupportedSourceProvider,
].sort((a, b) => a.priority - b.priority)

/** Devuelve el primer proveedor que puede manejar la URL. */
export function findProvider(url: URL): Provider | undefined {
  return providers.find((p) => p.canHandle(url))
}
