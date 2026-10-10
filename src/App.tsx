import { useCallback, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { RefractionDefs } from './components/RefractionDefs'
import { ToastViewport } from './components/ToastViewport'
import { useAnalyzer } from './hooks/useAnalyzer'
import { useHashRoute } from './hooks/useHashRoute'
import { useTheme } from './hooks/useTheme'
import { useToast } from './hooks/useToast'
import { Help } from './pages/Help'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'

export default function App() {
  const { theme, toggle } = useTheme()
  const [route, navigate] = useHashRoute()
  const { toasts, push, dismiss } = useToast()
  const [url, setUrl] = useState('')
  const analyzer = useAnalyzer({ onNotice: push })

  const loadFromHistory = useCallback(
    (value: string) => {
      setUrl(value)
      navigate('home')
      void analyzer.analyze(value)
    },
    [analyzer, navigate],
  )

  return (
    <>
      <div className="fm-background" aria-hidden="true" />
      <RefractionDefs />
      <a className="fm-skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <div className="fm-app">
        <Header route={route} onNavigate={navigate} theme={theme} onToggleTheme={toggle} />

        <div className="fm-view" key={route}>
          {route === 'home' && (
            <Home
              url={url}
              onUrlChange={setUrl}
              analyzer={analyzer}
              onNotice={push}
              onNavigate={navigate}
            />
          )}
          {route === 'help' && <Help />}
          {route === 'settings' && (
            <Settings
              analyzer={analyzer}
              theme={theme}
              onToggleTheme={toggle}
              onLoadUrl={loadFromHistory}
            />
          )}
        </div>

        <Footer onNavigate={navigate} />
      </div>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
