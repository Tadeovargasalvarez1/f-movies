// =========================================================================
// F Movies — Construccion de argumentos de FFmpeg (logica pura y testeable)
// =========================================================================

import type { Container, MediaFormatOption } from '../types'

export interface ConversionTarget {
  mediaType: MediaFormatOption['mediaType']
  container: Container
  /** Tasa de bits de audio en kbps. Si se omite, se usa la del encoder. */
  audioBitrateKbps?: number
}

const EXTENSION_BY_CONTAINER: Record<Container, string> = {
  mp4: 'mp4',
  webm: 'webm',
  mp3: 'mp3',
  m4a: 'm4a',
  wav: 'wav',
  opus: 'opus',
  ogg: 'ogg',
  original: 'bin',
}

const MIME_BY_CONTAINER: Record<Container, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  opus: 'audio/ogg',
  ogg: 'audio/ogg',
  original: 'application/octet-stream',
}

export function outputExtension(container: Container): string {
  return EXTENSION_BY_CONTAINER[container] ?? 'bin'
}

export function mimeForContainer(container: Container): string {
  return MIME_BY_CONTAINER[container] ?? 'application/octet-stream'
}

/**
 * Genera los argumentos de FFmpeg para convertir `inputName` a `outputName`.
 * Solo se emiten opciones para formatos que el motor puede producir.
 */
export function buildFfmpegArgs(
  inputName: string,
  outputName: string,
  target: ConversionTarget,
): string[] {
  const { container, mediaType, audioBitrateKbps } = target
  const bitrate = audioBitrateKbps ? ['-b:a', `${audioBitrateKbps}k`] : []

  // Extraccion o conversion de audio.
  if (mediaType === 'audio') {
    switch (container) {
      case 'mp3':
        return ['-i', inputName, '-vn', '-c:a', 'libmp3lame', ...bitrate, outputName]
      case 'wav':
        return ['-i', inputName, '-vn', '-c:a', 'pcm_s16le', outputName]
      case 'opus':
      case 'ogg':
        return ['-i', inputName, '-vn', '-c:a', 'libopus', ...bitrate, outputName]
      case 'm4a':
        return ['-i', inputName, '-vn', '-c:a', 'aac', ...bitrate, outputName]
      default:
        return ['-i', inputName, '-vn', outputName]
    }
  }

  // Video con audio.
  switch (container) {
    case 'webm':
      return [
        '-i',
        inputName,
        '-c:v',
        'libvpx-vp9',
        '-b:v',
        '0',
        '-crf',
        '32',
        '-c:a',
        'libopus',
        ...bitrate,
        outputName,
      ]
    case 'mp4':
    default:
      return [
        '-i',
        inputName,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        ...bitrate,
        '-movflags',
        '+faststart',
        outputName,
      ]
  }
}
