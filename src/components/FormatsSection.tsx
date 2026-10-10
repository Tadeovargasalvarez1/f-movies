import { FileAudio, FileVideo, Gauge, Sparkles } from 'lucide-react'

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

export function FormatsSection() {
  return (
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
  )
}
