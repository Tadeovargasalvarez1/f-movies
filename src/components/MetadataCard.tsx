import { Clock, Film, HardDrive, ImageOff, ShieldCheck, Sparkles } from 'lucide-react'
import type { SourceMetadata } from '../types'
import { containerLabel, formatBytes, formatDuration } from '../utils/format'
import { safeUrl } from '../utils/url'

interface MetadataCardProps {
  metadata: SourceMetadata
}

export function MetadataCard({ metadata }: MetadataCardProps) {
  const thumb = safeUrl(metadata.thumbnailUrl)
  const duration = formatDuration(metadata.durationSeconds)
  const size = formatBytes(metadata.contentLengthBytes)
  const resolutions = Array.from(
    new Set(
      metadata.formats
        .map((f) => f.resolution)
        .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    ),
  )
  const containers = Array.from(new Set(metadata.formats.map((f) => containerLabel(f.container))))

  return (
    <div className="fm-meta">
      <div className="fm-meta__head">
        {thumb ? (
          <img className="fm-meta__thumb" src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="fm-meta__thumb fm-meta__thumb--empty" aria-hidden="true">
            <ImageOff size={22} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h2 className="fm-meta__title">{metadata.title ?? metadata.domain}</h2>
          <p className="fm-meta__domain">{metadata.domain}</p>
        </div>
      </div>

      <div className="fm-meta__facts">
        <div className="fm-fact">
          <span className="fm-fact__label">
            <ShieldCheck size={13} aria-hidden="true" /> Fuente
          </span>
          <span className="fm-fact__value">{metadata.providerName}</span>
        </div>
        {duration && (
          <div className="fm-fact">
            <span className="fm-fact__label">
              <Clock size={13} aria-hidden="true" /> Duracion
            </span>
            <span className="fm-fact__value">{duration}</span>
          </div>
        )}
        <div className="fm-fact">
          <span className="fm-fact__label">
            <Film size={13} aria-hidden="true" /> Formatos
          </span>
          <span className="fm-fact__value">{containers.join(', ') || 'No disponible'}</span>
        </div>
        {resolutions.length > 0 && (
          <div className="fm-fact">
            <span className="fm-fact__label">
              <Sparkles size={13} aria-hidden="true" /> Calidad
            </span>
            <span className="fm-fact__value">{resolutions.join(' · ')}</span>
          </div>
        )}
        <div className="fm-fact">
          <span className="fm-fact__label">
            <HardDrive size={13} aria-hidden="true" /> Tamano
          </span>
          <span className="fm-fact__value">{size ?? 'Desconocido'}</span>
        </div>
      </div>

      {metadata.notice && <p className="fm-notice">{metadata.notice}</p>}
    </div>
  )
}
