import { describe, expect, it } from 'vitest'
import { buildFfmpegArgs, mimeForContainer, outputExtension } from './ffmpegArgs'

describe('buildFfmpegArgs', () => {
  it('genera argumentos para MP3 (extraccion de audio)', () => {
    const args = buildFfmpegArgs('in.mp4', 'out.mp3', { mediaType: 'audio', container: 'mp3' })
    expect(args).toContain('libmp3lame')
    expect(args).toContain('-vn')
    expect(args.at(-1)).toBe('out.mp3')
  })

  it('respeta la tasa de bits de audio cuando se indica', () => {
    const args = buildFfmpegArgs('in.mp4', 'out.mp3', {
      mediaType: 'audio',
      container: 'mp3',
      audioBitrateKbps: 192,
    })
    expect(args.join(' ')).toContain('-b:a 192k')
  })

  it('no añade tasa de bits si no se especifica', () => {
    const args = buildFfmpegArgs('in.mp4', 'out.mp3', { mediaType: 'audio', container: 'mp3' })
    expect(args).not.toContain('-b:a')
  })

  it('genera argumentos para MP4 (libx264)', () => {
    const args = buildFfmpegArgs('in.webm', 'out.mp4', { mediaType: 'video', container: 'mp4' })
    expect(args).toContain('libx264')
    expect(args).toContain('+faststart')
  })

  it('genera argumentos para WebM (vp9/opus)', () => {
    const args = buildFfmpegArgs('in.mp4', 'out.webm', { mediaType: 'video', container: 'webm' })
    expect(args).toContain('libvpx-vp9')
    expect(args).toContain('libopus')
  })

  it('genera argumentos para WAV', () => {
    const args = buildFfmpegArgs('in.mp3', 'out.wav', { mediaType: 'audio', container: 'wav' })
    expect(args).toContain('pcm_s16le')
  })
})

describe('outputExtension / mimeForContainer', () => {
  it('mapea contenedores conocidos', () => {
    expect(outputExtension('mp3')).toBe('mp3')
    expect(outputExtension('webm')).toBe('webm')
    expect(mimeForContainer('mp4')).toBe('video/mp4')
    expect(mimeForContainer('ogg')).toBe('audio/ogg')
  })
})
