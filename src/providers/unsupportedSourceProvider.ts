// =========================================================================
// F Movies — UnsupportedSourceProvider
// Explica cuando una fuente no puede analizarse desde el navegador.
// Es el proveedor de ultimo recurso (mayor prioridad numerica).
// =========================================================================

import type { AnalysisContext, Provider } from './types'

export const unsupportedSourceProvider: Provider = {
  id: 'unsupported',
  name: 'Fuente no compatible',
  priority: 999,

  capabilities: {
    canAnalyze: false,
    canDownloadDirect: false,
    canConvertLocal: false,
    canConvertServer: false,
    requiresBackend: false,
  },

  canHandle() {
    return true
  },

  async analyze(ctx: AnalysisContext) {
    return {
      url: ctx.url.toString(),
      domain: ctx.url.hostname,
      kind: 'platform-page',
      title: ctx.url.hostname,
      formats: [],
      capabilities: {
        canAnalyze: false,
        canDownloadDirect: false,
        canConvertLocal: false,
        canConvertServer: false,
        requiresBackend: false,
        message:
          'Esta pagina no puede analizarse desde el navegador. Las plataformas de streaming suelen bloquear el acceso por CORS, exigir autenticacion o requerir un motor de extraccion externo.',
      },
      providerId: 'unsupported',
      providerName: 'Fuente no compatible',
    }
  },
}
