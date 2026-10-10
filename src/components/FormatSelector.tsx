import { Film, Music } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Container, MediaFormatOption, MediaType, VideoResolution } from '../types'
import { containerLabel } from '../utils/format'

interface FormatSelectorProps {
  videoFormats: MediaFormatOption[]
  audioFormats: MediaFormatOption[]
  selectedFormat: MediaFormatOption | null
  onSelect: (id: string) => void
  disabled?: boolean
}

const RESOLUTION_ORDER: VideoResolution[] = [
  '144p',
  '240p',
  '360p',
  '480p',
  '720p',
  '1080p',
  '1440p',
  '2160p',
  'original',
]

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

export function FormatSelector({
  videoFormats,
  audioFormats,
  selectedFormat,
  onSelect,
  disabled,
}: FormatSelectorProps) {
  const availableModes: MediaType[] = []
  if (videoFormats.length > 0) availableModes.push('video')
  if (audioFormats.length > 0) availableModes.push('audio')

  const [mode, setMode] = useState<MediaType>(selectedFormat?.mediaType ?? availableModes[0] ?? 'video')

  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.includes(mode)) {
      setMode(availableModes[0])
    }
  }, [availableModes, mode])

  const list = mode === 'video' ? videoFormats : audioFormats

  const containers = useMemo(() => unique(list.map((f) => f.container)), [list])
  const [container, setContainer] = useState<Container | null>(null)

  useEffect(() => {
    setContainer(list[0]?.container ?? null)
  }, [list, mode])

  const containerFormats = useMemo(
    () => list.filter((f) => f.container === (container ?? list[0]?.container)),
    [list, container],
  )

  const resolutions = useMemo(
    () =>
      unique(
        containerFormats
          .map((f) => f.resolution)
          .filter((r): r is VideoResolution => Boolean(r)),
      ).sort((a, b) => RESOLUTION_ORDER.indexOf(a) - RESOLUTION_ORDER.indexOf(b)),
    [containerFormats],
  )

  const [resolution, setResolution] = useState<VideoResolution | null>(null)

  useEffect(() => {
    setResolution(resolutions[0] ?? null)
  }, [resolutions])

  const switchMode = (next: MediaType) => {
    setMode(next)
    const first = next === 'video' ? videoFormats[0] : audioFormats[0]
    if (first) onSelect(first.id)
  }

  const pick = (nextContainer: Container, nextResolution: VideoResolution | null) => {
    const match =
      containerFormats.find(
        (f) => f.container === nextContainer && (mode === 'audio' || f.resolution === nextResolution),
      ) ?? list.find((f) => f.container === nextContainer)
    if (match) onSelect(match.id)
  }

  if (list.length === 0) {
    return (
      <div className="fm-options-empty">
        No hay opciones de {mode === 'video' ? 'video' : 'audio'} disponibles para esta fuente.
      </div>
    )
  }

  return (
    <div>
      <div className="fm-segmented" role="group" aria-label="Tipo de medio">
        {availableModes.map((item) => (
          <button
            key={item}
            type="button"
            className="fm-segmented__btn"
            aria-pressed={mode === item}
            onClick={() => switchMode(item)}
            disabled={disabled}
          >
            {item === 'video' ? <Film size={16} aria-hidden="true" /> : <Music size={16} aria-hidden="true" />}
            {item === 'video' ? 'Video' : 'Audio'}
          </button>
        ))}
      </div>

      <div className="fm-selectors">
        <div className="fm-field">
          <label className="fm-label" htmlFor="fm-container">
            Formato
          </label>
          <select
            id="fm-container"
            className="fm-select"
            value={container ?? ''}
            disabled={disabled || containers.length <= 1}
            onChange={(e) => {
              const next = e.target.value as Container
              setContainer(next)
              pick(next, resolution)
            }}
          >
            {containers.map((c) => (
              <option key={c} value={c}>
                {containerLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {mode === 'video' && resolutions.length > 0 && (
          <div className="fm-field">
            <label className="fm-label" htmlFor="fm-resolution">
              Resolucion
            </label>
            <select
              id="fm-resolution"
              className="fm-select"
              value={resolution ?? ''}
              disabled={disabled || resolutions.length <= 1}
              onChange={(e) => {
                const next = e.target.value as VideoResolution
                setResolution(next)
                pick(container ?? list[0].container, next)
              }}
            >
              {resolutions.map((r) => (
                <option key={r} value={r}>
                  {r === 'original' ? 'Original' : r}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedFormat && (
        <p className="fm-search__hint" style={{ marginTop: 12 }}>
          Seleccionado: {selectedFormat.label}
          {selectedFormat.estimatedSizeBytes
            ? ` · ${Math.round(selectedFormat.estimatedSizeBytes / 1024 / 1024)} MB aprox.`
            : ''}
        </p>
      )}
    </div>
  )
}
