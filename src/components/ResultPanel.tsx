import { Download, Info, Loader2, Settings2 } from 'lucide-react'
import type { AnalyzerStatus, MediaFormatOption, ProgressInfo, SourceMetadata } from '../types'
import { FormatSelector } from './FormatSelector'
import { MetadataCard } from './MetadataCard'
import { StatusZone } from './StatusZone'

interface ResultPanelProps {
  status: AnalyzerStatus
  metadata?: SourceMetadata
  message: string
  actionHint?: string
  progress: ProgressInfo | null
  videoFormats: MediaFormatOption[]
  audioFormats: MediaFormatOption[]
  selectedFormat: MediaFormatOption | null
  onSelectFormat: (id: string) => void
  onStart: () => void
  onCancel: () => void
  onOpenSettings: () => void
}

const BUSY_STATUSES: AnalyzerStatus[] = ['validating', 'analyzing', 'preparing', 'processing']

export function ResultPanel(props: ResultPanelProps) {
  const {
    status,
    metadata,
    message,
    actionHint,
    progress,
    videoFormats,
    audioFormats,
    selectedFormat,
    onSelectFormat,
    onStart,
    onCancel,
    onOpenSettings,
  } = props

  const busy = BUSY_STATUSES.includes(status)
  const hasFormats = videoFormats.length > 0 || audioFormats.length > 0
  const needsBackend = status === 'backend-not-configured'

  // Fuente no compatible o backend sin configurar (sin metadatos): aviso util.
  if (!metadata && (status === 'backend-not-configured' || status === 'unsupported')) {
    return (
      <section className="fm-container" aria-label="Resultado del analisis">
        <div className="fm-notice-box liquid-glass lg-subtle" role="status">
          <Info size={20} aria-hidden="true" />
          <div>
            <strong>
              {needsBackend ? 'Servicio externo no configurado' : 'Fuente no compatible'}
            </strong>
            <p style={{ margin: '6px 0 0' }}>{message}</p>
            {actionHint && <p style={{ margin: '6px 0 0' }}>{actionHint}</p>}
            {needsBackend && (
              <button
                type="button"
                className="fm-btn fm-btn--ghost"
                style={{ marginTop: 12 }}
                onClick={onOpenSettings}
              >
                <Settings2 size={16} aria-hidden="true" /> Ver configuracion
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (!metadata) return null

  const startLabel = selectedFormat?.source === 'converted' ? 'Convertir y descargar' : 'Descargar'

  return (
    <section className="fm-container" aria-label="Resultado del analisis">
      <div className="fm-result liquid-glass lg-regular">
        <MetadataCard metadata={metadata} />

        <div>
          {hasFormats ? (
            <>
              <FormatSelector
                videoFormats={videoFormats}
                audioFormats={audioFormats}
                selectedFormat={selectedFormat}
                onSelect={onSelectFormat}
                disabled={busy}
              />

              <div style={{ marginTop: 18 }}>
                <button
                  type="button"
                  className="fm-btn fm-btn--primary"
                  onClick={onStart}
                  disabled={busy || !selectedFormat}
                >
                  {busy ? (
                    <Loader2 size={18} className="fm-spin" aria-hidden="true" />
                  ) : (
                    <Download size={18} aria-hidden="true" />
                  )}
                  {startLabel}
                </button>
              </div>

              <StatusZone
                status={status}
                message={message}
                actionHint={actionHint}
                progress={progress}
                busy={busy}
                onCancel={onCancel}
              />
            </>
          ) : (
            <div className="fm-notice-box liquid-glass lg-subtle" role="status">
              <Info size={20} aria-hidden="true" />
              <div>
                <strong>{needsBackend ? 'Servicio externo no configurado' : 'Sin opciones descargables'}</strong>
                <p style={{ margin: '6px 0 0' }}>{message}</p>
                {actionHint && <p style={{ margin: '6px 0 0' }}>{actionHint}</p>}
                {needsBackend && (
                  <button
                    type="button"
                    className="fm-btn fm-btn--ghost"
                    style={{ marginTop: 12 }}
                    onClick={onOpenSettings}
                  >
                    <Settings2 size={16} aria-hidden="true" /> Ver configuracion
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
