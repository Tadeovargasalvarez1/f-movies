import { Cpu, Database, History, Moon, Server, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { API_BASE_URL, HAS_BACKEND, LOCAL_CONVERSION_LIMITS } from '../config'
import { getCobaltApiKey, getCobaltApiUrl, setCobaltApiKey, setCobaltApiUrl } from '../services/cobalt'
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
  const [cobaltUrl, setCobaltUrlState] = useState(() => getCobaltApiUrl())
  const [cobaltKey, setCobaltKeyState] = useState(() => getCobaltApiKey())

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

          <h2>Motores y APIs</h2>
          <div className="fm-stack">
            {/* Cobalt API */}
            <div className="liquid-glass lg-subtle" style={{ borderRadius: 'var(--radius-control)', padding: '16px 20px' }}>
              <div className="fm-row" style={{ gap: 10, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Server size={18} aria-hidden="true" style={{ color: 'var(--fm-violet)' }} />
                  <strong>Cobalt API (Descargas en GitHub Pages)</strong>
                </div>
                <span className="fm-badge" style={{ color: 'var(--fm-green)' }}>Activo en navegador</span>
              </div>
              <p className="fm-muted" style={{ margin: '8px 0 14px', fontSize: '0.86rem' }}>
                Permite descargar videos de YouTube y plataformas en GitHub Pages directamente desde el navegador,
                sin necesidad de instalar Python ni abrir terminales.
              </p>

              <div className="fm-stack" style={{ gap: 12 }}>
                <div className="fm-field">
                  <label className="fm-label" htmlFor="cobalt-url">URL de Instancia de Cobalt</label>
                  <input
                    id="cobalt-url"
                    type="url"
                    className="fm-search__input liquid-glass lg-subtle"
                    style={{ padding: '0 14px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-control)', height: 42 }}
                    placeholder="https://api.cobalt.tools"
                    value={cobaltUrl}
                    onChange={(e) => {
                      setCobaltUrlState(e.target.value)
                      setCobaltApiUrl(e.target.value)
                    }}
                  />
                </div>

                <div className="fm-field">
                  <label className="fm-label" htmlFor="cobalt-key">Clave de API (Opcional, para instancias privadas)</label>
                  <input
                    id="cobalt-key"
                    type="password"
                    className="fm-search__input liquid-glass lg-subtle"
                    style={{ padding: '0 14px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-control)', height: 42 }}
                    placeholder="Dejar vacío para instancias públicas"
                    value={cobaltKey}
                    onChange={(e) => {
                      setCobaltKeyState(e.target.value)
                      setCobaltApiKey(e.target.value)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Servicio backend opcional */}
            <div className="liquid-glass lg-subtle" style={{ borderRadius: 'var(--radius-control)', padding: '14px 18px' }}>
              <div className="fm-row" style={{ gap: 10 }}>
                <Server size={18} aria-hidden="true" />
                <strong>Backend propio (yt-dlp)</strong>
                <span className="fm-badge">{HAS_BACKEND ? 'Conectado' : 'Opcional'}</span>
              </div>
              <p className="fm-muted" style={{ margin: '8px 0 0', fontSize: '0.86rem' }}>
                {HAS_BACKEND
                  ? `Conectado a ${API_BASE_URL}. Si está activo, tiene prioridad para extracciones avanzadas.`
                  : 'Opcional. Si despliegas un backend propio con FastAPI + yt-dlp en Render o Railway, puedes conectarlo con VITE_API_BASE_URL.'}
              </p>
            </div>

            {/* FFmpeg.wasm */}
            <div className="liquid-glass lg-subtle" style={{ borderRadius: 'var(--radius-control)', padding: '14px 18px' }}>
              <div className="fm-row" style={{ gap: 10 }}>
                <Cpu size={18} aria-hidden="true" />
                <strong>Conversión local (FFmpeg.wasm)</strong>
                <span className="fm-badge">{localSupported ? 'Disponible' : 'No disponible'}</span>
              </div>
              <p className="fm-muted" style={{ margin: '8px 0 0', fontSize: '0.86rem' }}>
                Se ejecuta dentro de tu navegador. Límite de tamaño: {formatBytes(LOCAL_CONVERSION_LIMITS.maxBytes)}.
                No requiere ningún servidor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
