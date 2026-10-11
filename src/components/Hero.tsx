import { Sparkles } from 'lucide-react'
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

export function Hero({ value, onChange, onSubmit, analyzing, error, onNotice }: HeroProps) {
  return (
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
        <span className="fm-examples__label">Ejemplos de prueba:</span>
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
  )
}
