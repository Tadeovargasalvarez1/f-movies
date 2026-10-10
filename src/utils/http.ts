// =========================================================================
// F Movies — Utilidades HTTP
// =========================================================================

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/**
 * fetch con timeout y combinacion de senales de cancelacion.
 * No envia credenciales por defecto.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 20000, signal, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs)

  const onAbort = () => controller.abort(signal?.reason)
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal, credentials: 'omit' })
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}
