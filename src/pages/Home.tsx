import { Hero } from '../components/Hero'
import { ResultPanel } from '../components/ResultPanel'
import type { Route } from '../hooks/useHashRoute'
import type { ToastKind } from '../hooks/useToast'
import type { useAnalyzer } from '../hooks/useAnalyzer'

interface HomeProps {
  url: string
  onUrlChange: (value: string) => void
  analyzer: ReturnType<typeof useAnalyzer>
  onNotice: (kind: ToastKind, message: string) => void
  onNavigate: (route: Route) => void
}

export function Home({ url, onUrlChange, analyzer, onNotice, onNavigate }: HomeProps) {
  const analyzing = analyzer.status === 'validating' || analyzer.status === 'analyzing'
  const error = analyzer.status === 'invalid-url' ? analyzer.message : null

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
    </main>
  )
}
