import { AlertTriangle, Ban, CheckCircle2, Info, Loader2, WifiOff, X, Zap } from 'lucide-react'
import type { AnalyzerStatus, ProgressInfo } from '../types'
import { formatBytes } from '../utils/format'

interface StatusZoneProps {
  status: AnalyzerStatus
  message: string
  actionHint?: string
  progress: ProgressInfo | null
  busy: boolean
  onCancel: () => void
}

type Tone = 'info' | 'success' | 'warn' | 'error'

interface Descriptor {
  tone: Tone
  Icon: typeof Info
}

const DESCRIPTORS: Partial<Record<AnalyzerStatus, Descriptor>> = {
  idle: { tone: 'info', Icon: Info },
  'invalid-url': { tone: 'error', Icon: AlertTriangle },
  validating: { tone: 'info', Icon: Loader2 },
  analyzing: { tone: 'info', Icon: Loader2 },
  ready: { tone: 'success', Icon: CheckCircle2 },
  preparing: { tone: 'info', Icon: Loader2 },
  processing: { tone: 'info', Icon: Zap },
  'download-ready': { tone: 'success', Icon: CheckCircle2 },
  unsupported: { tone: 'warn', Icon: Ban },
  'backend-not-configured': { tone: 'warn', Icon: Info },
  'network-error': { tone: 'error', Icon: WifiOff },
  cancelled: { tone: 'warn', Icon: X },
  'format-unavailable': { tone: 'warn', Icon: AlertTriangle },
}

export function StatusZone({ status, message, actionHint, progress, busy, onCancel }: StatusZoneProps) {
  const descriptor = DESCRIPTORS[status] ?? { tone: 'info' as Tone, Icon: Info }
  const Icon = descriptor.Icon
  const indeterminate = progress && progress.ratio == null

  return (
    <div className="fm-status" aria-live="polite">
      <div className={`fm-status__row fm-status__row--${descriptor.tone}`}>
        <Icon size={17} className={busy ? 'fm-spin' : undefined} aria-hidden="true" />
        <span>{message}</span>
      </div>

      {actionHint && <p className="fm-search__hint" style={{ margin: 0 }}>{actionHint}</p>}

      {progress && (
        <div>
          <div
            className={`fm-progress${indeterminate ? ' fm-progress--indeterminate' : ''}`}
            role="progressbar"
            aria-label={progress.phase}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.ratio != null ? Math.round(progress.ratio * 100) : undefined}
          >
            <div
              className="fm-progress__bar"
              style={{ width: progress.ratio != null ? `${Math.max(progress.ratio * 100, 2)}%` : '35%' }}
            />
          </div>
          <p className="fm-search__hint" style={{ marginTop: 6 }}>
            {progress.phase}
            {progress.loadedBytes != null && progress.totalBytes != null
              ? ` · ${formatBytes(progress.loadedBytes)} / ${formatBytes(progress.totalBytes)}`
              : ''}
          </p>
        </div>
      )}

      {busy && (
        <div>
          <button type="button" className="fm-btn fm-btn--ghost fm-btn--danger" onClick={onCancel}>
            <X size={16} aria-hidden="true" /> Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
