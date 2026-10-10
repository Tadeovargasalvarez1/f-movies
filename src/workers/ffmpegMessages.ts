// Mensajes compartidos entre el servicio de conversion y el Web Worker.

export interface WorkerRunMessage {
  type: 'run'
  id: number
  data: ArrayBuffer
  inputName: string
  outputName: string
  args: string[]
  mime: string
}

export interface WorkerLoadMessage {
  type: 'load'
}

export type WorkerRequest = WorkerRunMessage | WorkerLoadMessage | { type: 'cancel' }

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; ratio: number | null; time?: number }
  | { type: 'log'; message: string }
  | { type: 'done'; id: number; data: ArrayBuffer; mime: string }
  | { type: 'error'; id?: number; message: string }
  | { type: 'cancelled' }
