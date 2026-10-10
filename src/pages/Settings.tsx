import { Cpu, Database, History, Moon, Server, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { API_BASE_URL, HAS_BACKEND, LOCAL_CONVERSION_LIMITS } from '../config'
import { isLocalConversionSupported } from '../services/converter'
import { formatBytes } from '../utils/format'
import type { ThemeName } from '../types'
import type { useAnalyzer } from '../hooks/useAnalyzer'

interface SettingsProps {
  analyzer: ReturnType<typeof useAnalyzer>
  theme: ThemeName
  onToggleTheme: () => void
  onLoadUrl: (url: string) => void
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className="fm-switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  )
}

export function Settings({ analyzer, theme, onToggleTheme, onLoadUrl }: SettingsProps) {
  const [localSupported] = useState(() => isLocalConversionSupported())

  return (
    <main className="fm-main" id="contenido">
      <div className="fm-container">
        <div className="fm-page liquid-glass lg-regular" style={{ marginTop: 8 }}>
          <h1>Configuracion</h1>
          <p className="fm-muted">Preferencias guardadas solo en tu navegador.</p>

          <h2>Aspecto</h2>
          <div className="liquid-glass lg-subtle" style={{ borderRadius: 'var(--radius-control)' }}>
            <div className="fm-toggle-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {theme === 'dark' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
                Tema {theme === 'dark' ? 'oscuro' : 'claro'}
              </span>
              <Switch checked={theme === 'dark'} onChange={onToggleTheme} label="Cambiar tema" />
            </div>
          </div>

          <h2>Historial local</h2>
          <p className="fm-muted">
            Desactivado por defecto. Si lo activas, los enlaces analizados se guardan unicamente en este
            navegador y puedes borrarlos en cualquier momento.
          </p>
          <div className="liquid-glass lg-subtle" style={{ borderRadius: 'var(--radius-control)' }}>
            <div className="fm-toggle-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={18} aria-hidden="true" /> Guardar historial
              </span>
              <Switch
                checked={analyzer.historyEnabled}
                onChange={analyzer.toggleHistory}
                label="Activar historial local"
              />
            </div>
          </div>

          {analyzer.historyEnabled && (
            <>
              <div className="fm-row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                <span className="fm-search__hint">{analyzer.history.length} entradas</span>
                {analyzer.history.length > 0 && (
                  <button type="button" className="fm-btn fm-btn--ghost fm-btn--danger" onClick={analyzer.clearHistoryAll}>
                    <Trash2 size={16} aria-hidden="true" /> Limpiar historial
                  </button>
                )}
              </div>
              <div className="fm-history">
                {analyzer.history.map((entry) => (
                  <button
                    key={`${entry.url}-${entry.at}`}
                    type="button"
                    className="fm-history__item liquid-glass lg-subtle lg-r-control liquid-glass-interactive"
                    onClick={() => onLoadUrl(entry.url)}
                  >
                    <Database size={15} aria-hidden="true" />
                    <span>{entry.title || entry.domain}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <h2>Motores</h2>
          <div className="fm-stack">
            <div className="liquid-glass lg-subtle" style={{ borderRadius: 'var(--radius-control)', padding: '14px 18px' }}>
              <div className="fm-row" style={{ gap: 10 }}>
                <Server size={18} aria-hidden="true" />
                <strong>Servicio externo</strong>
                <span className="fm-badge">{HAS_BACKEND ? 'Configurado' : 'No configurado'}</span>
              </div>
              <p className="fm-muted" style={{ margin: '8px 0 0', fontSize: '0.86rem' }}>
                {HAS_BACKEND
                  ? `Conectado a ${API_BASE_URL}. Las fuentes que requieren extraccion en servidor se procesaran ahi.`
                  : 'Define VITE_API_BASE_URL para habilitar la extraccion desde plataformas. Sin el, F Movies opera en modo estatico y solo admite archivos directos.'}
              </p>
            </div>

            <div className="liquid-glass lg-subtle" style={{ borderRadius: 'var(--radius-control)', padding: '14px 18px' }}>
              <div className="fm-row" style={{ gap: 10 }}>
                <Cpu size={18} aria-hidden="true" />
                <strong>Conversion local (FFmpeg.wasm)</strong>
                <span className="fm-badge">{localSupported ? 'Disponible' : 'No disponible'}</span>
              </div>
              <p className="fm-muted" style={{ margin: '8px 0 0', fontSize: '0.86rem' }}>
                Se carga bajo demanda. Limite de tamano por archivo: {formatBytes(LOCAL_CONVERSION_LIMITS.maxBytes)}.
                El nucleo de FFmpeg se descarga desde un CDN publico solo al usarlo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
