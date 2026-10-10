import { ShieldCheck } from 'lucide-react'
import type { Route } from '../hooks/useHashRoute'

interface FooterProps {
  onNavigate: (route: Route) => void
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="fm-footer">
      <div className="fm-container fm-footer__inner">
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={15} aria-hidden="true" />
          F Movies no elude DRM, autenticacion ni restricciones de acceso. Usa la herramienta solo con
          contenido que tengas derecho a descargar.
        </p>
        <div className="fm-row">
          <a
            href="#/ayuda"
            onClick={(e) => {
              e.preventDefault()
              onNavigate('help')
            }}
          >
            Ayuda
          </a>
          <a
            href="#/configuracion"
            onClick={(e) => {
              e.preventDefault()
              onNavigate('settings')
            }}
          >
            Ajustes
          </a>
        </div>
      </div>
    </footer>
  )
}
