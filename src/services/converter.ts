// =========================================================================
// F Movies — Servicio de conversion local (FFmpeg.wasm)
// - Carga perezosa: el motor NO se descarga hasta que el usuario convierte.
// - Ejecuta en un Web Worker propio; si el navegador no permite workers
//   anidados, recurre al modo en hilo principal (FFmpeg usa su propio worker).
// - Respeta cancelacion y libera memoria al terminar.
// =========================================================================

import { LOCAL_CONVERSION_LIMITS } from '../config'
import type { Container, MediaFormatOption, ProgressInfo } from '../types'
import type { WorkerRequest, WorkerResponse } from '../workers/ffmpegMessages'
import { buildFfmpegArgs, mimeForContainer, outputExtension } from './ffmpegArgs'

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

export interface ConvertTarget {
  mediaType: MediaFormatOption['mediaType']
  container: Container
  audioBitrateKbps?: number
}

export interface ConvertRequest {
  file: Blob
  fileName: string
  target: ConvertTarget
  onProgress?: (p: ProgressInfo) => void
  signal?: AbortSignal
}

export interface ConvertResult {
  blob: Blob
  fileName: string
}

export class ConversionTooLargeError extends Error {
  constructor(public sizeBytes: number) {
    super('El archivo es demasiado grande para convertirlo en el navegador.')
    this.name = 'ConversionTooLargeError'
  }
}

export class ConversionUnavailableError extends Error {
  constructor(message = 'La conversion local no esta disponible en este navegador.') {
    super(message)
    this.name = 'ConversionUnavailableError'
  }
}

interface Waiter {
  resolve: (blob: Blob) => void
  reject: (err: Error) => void
  mime: string
  onProgress?: (p: ProgressInfo) => void
}

let worker: Worker | null = null
let workerLoad: Promise<void> | null = null
let workerFailed = false
let requestId = 0
const waiters = new Map<number, Waiter>()
let currentProgress: ((p: ProgressInfo) => void) | undefined

function abortError(): DOMException {
  return new DOMException('Conversion cancelada', 'AbortError')
}

function rejectAll(err: Error): void {
  for (const waiter of waiters.values()) waiter.reject(err)
  waiters.clear()
}

function handleWorkerMessage(data: WorkerResponse): void {
  switch (data.type) {
    case 'ready':
      // La promesa de carga se resuelve aparte mediante workerLoad.
      break
    case 'progress':
      currentProgress?.({
        ratio: data.ratio,
        phase: 'Convirtiendo',
      })
      break
    case 'done': {
      const waiter = waiters.get(data.id)
      if (waiter) {
        waiter.resolve(new Blob([data.data], { type: waiter.mime }))
        waiters.delete(data.id)
      }
      break
    }
    case 'error': {
      if (data.id != null) {
        const waiter = waiters.get(data.id)
        if (waiter) {
          waiter.reject(new Error(data.message))
          waiters.delete(data.id)
        }
      } else {
        workerFailed = true
        rejectAll(new Error(data.message))
      }
      break
    }
    case 'cancelled':
      rejectAll(abortError())
      break
    default:
      break
  }
}

function getWorker(): Worker {
  if (worker) return worker
  const instance = new Worker(new URL('../workers/ffmpeg.worker.ts', import.meta.url), {
    type: 'module',
  })
  instance.onmessage = (event: MessageEvent<WorkerResponse>) => handleWorkerMessage(event.data)
  instance.onerror = () => {
    workerFailed = true
    rejectAll(new Error('El worker de conversion fallo.'))
  }
  worker = instance
  return instance
}

function ensureWorkerLoaded(): Promise<void> {
  if (workerFailed) return Promise.reject(new ConversionUnavailableError())
  if (workerLoad) return workerLoad
  const instance = getWorker()
  workerLoad = new Promise<void>((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === 'ready') {
        instance.removeEventListener('message', onMessage)
        resolve()
      } else if (event.data.type === 'error') {
        instance.removeEventListener('message', onMessage)
        workerFailed = true
        reject(new ConversionUnavailableError(event.data.message))
      }
    }
    instance.addEventListener('message', onMessage)
    const message: WorkerRequest = { type: 'load' }
    instance.postMessage(message)
  })
  return workerLoad
}

async function convertInWorker(request: ConvertRequest, args: string[], inputName: string, outputName: string, mime: string): Promise<Blob> {
  await ensureWorkerLoaded()
  const instance = getWorker()
  const buffer = await request.file.arrayBuffer()
  const id = ++requestId
  currentProgress = request.onProgress

  return new Promise<Blob>((resolve, reject) => {
    waiters.set(id, { resolve, reject, mime, onProgress: request.onProgress })

    const onAbort = () => {
      const cancel: WorkerRequest = { type: 'cancel' }
      instance.postMessage(cancel)
    }
    if (request.signal) {
      if (request.signal.aborted) {
        waiters.delete(id)
        reject(abortError())
        return
      }
      request.signal.addEventListener('abort', onAbort, { once: true })
    }

    const message: WorkerRequest = { type: 'run', id, data: buffer, inputName, outputName, args, mime }
    instance.postMessage(message, [buffer])
  })
}

async function convertInMainThread(
  request: ConvertRequest,
  args: string[],
  inputName: string,
  outputName: string,
  mime: string,
): Promise<Blob> {
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ])
  const ffmpeg = new FFmpeg()
  ffmpeg.on('progress', ({ progress }) => {
    const ratio = Number.isFinite(progress) ? Math.max(0, Math.min(progress, 1)) : null
    request.onProgress?.({ ratio, phase: 'Convirtiendo' })
  })

  const onAbort = () => ffmpeg.terminate()
  request.signal?.addEventListener('abort', onAbort, { once: true })

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    if (request.signal?.aborted) throw abortError()
    await ffmpeg.writeFile(inputName, new Uint8Array(await request.file.arrayBuffer()))
    await ffmpeg.exec(args)
    const output = (await ffmpeg.readFile(outputName)) as Uint8Array
    return new Blob([output.slice()], { type: mime })
  } finally {
    request.signal?.removeEventListener('abort', onAbort)
    try {
      ffmpeg.terminate()
    } catch {
      /* ignorar */
    }
  }
}

/** Indica si el entorno puede ejecutar WebAssembly y Workers. */
export function isLocalConversionSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined'
}

/**
 * Convierte un archivo local al formato objetivo.
 * Lanza ConversionTooLargeError si supera el limite de memoria admisible.
 */
export async function convert(request: ConvertRequest): Promise<ConvertResult> {
  if (!isLocalConversionSupported()) {
    throw new ConversionUnavailableError()
  }
  if (request.file.size > LOCAL_CONVERSION_LIMITS.maxBytes) {
    throw new ConversionTooLargeError(request.file.size)
  }

  const sourceExt = /\.([a-z0-9]{1,5})$/i.exec(request.fileName)?.[1] ?? 'bin'
  const inputName = `input.${sourceExt}`
  const outExt = outputExtension(request.target.container)
  const outputName = `output.${outExt}`
  const mime = mimeForContainer(request.target.container)
  const args = buildFfmpegArgs(inputName, outputName, request.target)

  let blob: Blob
  try {
    blob = await convertInWorker(request, args, inputName, outputName, mime)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    if (err instanceof ConversionTooLargeError) throw err
    // Fallback: modo en hilo principal con el worker interno de FFmpeg.
    blob = await convertInMainThread(request, args, inputName, outputName, mime)
  }

  const base = request.fileName.replace(/\.[a-z0-9]{1,5}$/i, '') || 'fmovies-convertido'
  return { blob, fileName: `${base}.${outExt}` }
}
