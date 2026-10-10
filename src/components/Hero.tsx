import { FileAudio, FileVideo, Gauge, Sparkles } from 'lucide-react'
import type { ToastKind } from '../hooks/useToast'
import { UrlInput } from './UrlInput'

interface HeroProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  analyzing: boolean
  error?: string | null
  onNotice?: (kind: ToastKind, message: string) => void
}

const EXAMPLES = [
  { label: 'Video MP4 (MDN, CC0)', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
  { label: 'Video WebM (MDN, CC0)', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm' },
  { label: 'Audio MP3 (MDN, CC0)', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
]

const FORMATS = [
  {
    icon: FileVideo,
    title: 'Video',
    text: 'MP4 y WebM. Resoluciones de 144p a 2160p y calidad original, solo si la fuente las ofrece.',
  },
  {
    icon: FileAudio,
    title: 'Audio',
    text: 'MP3, M4A/AAC, WAV, Opus y OGG, cuando el motor o la fuente pueden generarlos.',
  },
  {
    icon: Gauge,
    title: 'Calidad real',
    text: 'Sin inventar datos: mostramos unicamente resoluciones, tamanos y formatos verificables.',
  },
  {
    icon: Sparkles,
    title: 'Conversion local',
    text: 'FFmpeg.wasm opcional para convertir en el navegador archivos compatibles y de tamano moderado.',
  },
]

export function Hero({ value, onChange, onSubmit, analyzing, error, onNotice }: HeroProps) {
  return (
    <>
      <section className="fm-hero fm-container">
        <span className="fm-hero__eyebrow liquid-glass lg-subtle lg-r-pill">
          <Sparkles size={14} aria-hidden="true" /> Analiza, elige y descarga
        </span>
        <h1 className="fm-hero__title">
          Tus videos, <span className="fm-gradient-text">a tu manera</span>
        </h1>
        <p className="fm-hero__subtitle">
          Pega un enlace, revisa que formatos y calidades estan realmente disponibles y descarga cuando la
          fuente y los permisos lo permitan. Sin promesas imposibles y sin servicios ocultos.
        </p>

        <UrlInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          analyzing={analyzing}
          error={error}
          onNotice={onNotice}
        />

        <div className="fm-examples">
          <span className="fm-examples__label">Ejemplos de prueba (contenido CC0 de MDN):</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.url}
              type="button"
              className="fm-chip"
              onClick={() => onChange(example.url)}
              disabled={analyzing}
            >
              {example.label}
            </button>
          ))}
        </div>
      </section>

      <section className="fm-formats fm-container" aria-labelledby="fm-formats-title">
        <h2 id="fm-formats-title">Formatos disponibles</h2>
        <p className="fm-muted" style={{ maxWidth: 640 }}>
          La disponibilidad depende de cada fuente. F Movies muestra solo lo que puede comprobar; el resto se
          explica con claridad.
        </p>
        <div className="fm-formats__grid">
          {FORMATS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="fm-format-card liquid-glass lg-subtle">
              <span className="fm-format-card__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
