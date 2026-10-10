import { useEffect, useRef } from 'react'
import { FormatsSection } from '../components/FormatsSection'
import { Hero } from '../components/Hero'
import { ResultPanel } from '../components/ResultPanel'
import type { Route } from '../hooks/useHashRoute'
import type { ToastKind } from '../hooks/useToast'
import type { useAnalyzer } from '../hooks/useAnalyzer'
import type { AnalyzerStatus } from '../types'

interface HomeProps {
  url: string
  onUrlChange: (value: string) => void
  analyzer: ReturnType<typeof useAnalyzer>
  onNotice: (kind: ToastKind, message: string) => void
  onNavigate: (route: Route) => void
}

const SCROLL_STATUSES: AnalyzerStatus[] = [
  'ready',
  'backend-not-configured',
  'unsupported',
  'network-error',
  'download-ready',
  'format-unavailable',
]

export function Home({ url, onUrlChange, analyzer, onNotice, onNavigate }: HomeProps) {
  const analyzing = analyzer.status === 'validating' || analyzer.status === 'analyzing'
  const error = analyzer.status === 'invalid-url' ? analyzer.message : null
  const resultRef = useRef<HTMLDivElement | null>(null)

  // Al terminar el analisis, lleva el resultado a la vista y da feedback.
  useEffect(() => {
    if (!SCROLL_STATUSES.includes(analyzer.status)) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })

    if (analyzer.status === 'ready') {
      onNotice('success', 'Enlace analizado correctamente.')
    } else if (analyzer.status === 'backend-not-configured') {
      onNotice('info', 'Enlace analizado. Esta fuente necesita un servicio externo para descargar.')
    } else if (analyzer.status === 'unsupported') {
      onNotice('warning', 'No se pudieron obtener formatos descargables de esta fuente.')
    } else if (analyzer.status === 'network-error') {
      onNotice('error', 'No se pudo contactar con la fuente.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzer.status])

  const handleSubmit = () => {
    const trimmed = url.trim()
    if (!trimmed) {
      onNotice('warning', 'Introduce o pega un enlace para analizar.')
      return
    }
    void analyzer.analyze(trimmed)
  }

  return (
    <main className="fm-main" id="contenido">
      <Hero
        value={url}
        onChange={onUrlChange}
        onSubmit={handleSubmit}
        analyzing={analyzing}
        error={error}
        onNotice={onNotice}
      />

      <div ref={resultRef} style={{ scrollMarginTop: '90px' }}>
        <ResultPanel
          status={analyzer.status}
          metadata={analyzer.metadata}
          message={analyzer.message}
          actionHint={analyzer.actionHint}
          progress={analyzer.progress}
          videoFormats={analyzer.videoFormats}
          audioFormats={analyzer.audioFormats}
          selectedFormat={analyzer.selectedFormat}
          onSelectFormat={analyzer.selectFormat}
          onStart={() => void analyzer.start()}
          onCancel={analyzer.cancel}
          onOpenSettings={() => onNavigate('settings')}
        />
      </div>

      <FormatsSection />
    </main>
  )
}
