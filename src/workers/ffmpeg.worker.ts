// =========================================================================
// F Movies — Web Worker de conversion local con FFmpeg.wasm
// Se carga bajo demanda. Todo el trabajo pesado permanece en el worker.
// =========================================================================

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import type { WorkerRequest, WorkerResponse } from './ffmpegMessages'

interface WorkerScope {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

const scope = self as unknown as WorkerScope

// El nucleo se descarga bajo demanda desde un CDN publico (no al iniciar la app).
const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

let ffmpeg: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null

function post(message: WorkerResponse, transfer?: Transferable[]): void {
  scope.postMessage(message, transfer)
}

async function ensureLoaded(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg
  if (loading) return loading

  loading = (async () => {
    const instance = new FFmpeg()
    instance.on('progress', ({ progress }) => {
      const ratio = Number.isFinite(progress) ? Math.max(0, Math.min(progress, 1)) : null
      post({ type: 'progress', ratio })
    })
    instance.on('log', ({ message }) => post({ type: 'log', message }))

    await instance.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpeg = instance
    return instance
  })()

  try {
    return await loading
  } finally {
    loading = null
  }
}

async function run(request: WorkerRequest & { type: 'run' }): Promise<void> {
  const { id, data, inputName, outputName, args, mime } = request
  try {
    const instance = await ensureLoaded()
    await instance.writeFile(inputName, new Uint8Array(data))
    await instance.exec(args)
    const output = (await instance.readFile(outputName)) as Uint8Array
    // Copia a un buffer independiente para poder transferirlo.
    const exported = output.slice().buffer
    post({ type: 'done', id, data: exported, mime }, [exported])
    await instance.deleteFile(inputName).catch(() => undefined)
    await instance.deleteFile(outputName).catch(() => undefined)
  } catch (err) {
    post({ type: 'error', id, message: (err as Error)?.message ?? 'Error de conversion desconocido.' })
  }
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (!message || typeof message !== 'object') return

  if (message.type === 'load') {
    try {
      await ensureLoaded()
      post({ type: 'ready' })
    } catch (err) {
      post({ type: 'error', message: (err as Error)?.message ?? 'No se pudo cargar FFmpeg.' })
    }
    return
  }

  if (message.type === 'cancel') {
    try {
      ffmpeg?.terminate()
    } catch {
      /* ignorar */
    }
    ffmpeg = null
    loading = null
    post({ type: 'cancelled' })
    return
  }

  if (message.type === 'run') {
    await run(message)
  }
}

export {}
