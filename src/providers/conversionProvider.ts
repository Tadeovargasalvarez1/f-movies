// =========================================================================
// F Movies — ConversionProvider local (FFmpeg.wasm)
// Declara que formatos puede producir el motor local y su limite de tamano.
// La carga real del motor es perezosa (ver src/services/converter.ts).
// =========================================================================

import { LOCAL_CONVERSION_LIMITS } from '../config'
import type { ConversionProvider } from './types'

export const localFfmpegConversionProvider: ConversionProvider = {
  id: 'local-ffmpeg',
  name: 'Conversion local (FFmpeg.wasm)',
  outputs: ['mp4', 'webm', 'mp3', 'wav', 'm4a', 'opus', 'ogg'],
  maxBytes: LOCAL_CONVERSION_LIMITS.maxBytes,
  canProcess(bytes: number) {
    return bytes > 0 && bytes <= LOCAL_CONVERSION_LIMITS.maxBytes
  },
}
