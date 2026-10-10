// =========================================================================
// F Movies — Formato de valores legibles
// =========================================================================

import type { Container, MediaType } from '../types'

/** Formatea bytes a una unidad legible. Devuelve null si no hay dato. */
export function formatBytes(bytes: number | undefined | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  const decimals = value >= 100 || i === 0 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[i]}`
}

/** Formatea una duracion en segundos a "H:MM:SS" o "M:SS". Null si no hay dato. */
export function formatDuration(seconds: number | undefined | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

const CONTAINER_LABELS: Record<Container, string> = {
  mp4: 'MP4',
  webm: 'WebM',
  mp3: 'MP3',
  m4a: 'M4A / AAC',
  wav: 'WAV',
  opus: 'Opus',
  ogg: 'OGG',
  original: 'Original',
}

export function containerLabel(container: Container): string {
  return CONTAINER_LABELS[container] ?? container.toUpperCase()
}

export function mediaTypeLabel(type: MediaType): string {
  return type === 'video' ? 'Video' : 'Audio'
}

/** Formatea una tasa de bits de audio. */
export function formatAudioBitrate(kbps: number | undefined): string | null {
  if (kbps == null || !Number.isFinite(kbps)) return null
  return `${kbps} kbps`
}
