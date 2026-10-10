import { Clapperboard, CircleHelp, Film, Moon, Settings, Sun } from 'lucide-react'
import type { Route } from '../hooks/useHashRoute'
import type { ThemeName } from '../types'

interface HeaderProps {
  route: Route
  onNavigate: (route: Route) => void
  theme: ThemeName
  onToggleTheme: () => void
}

const LINKS: Array<{ route: Route; label: string; icon: typeof Film }> = [
  { route: 'home', label: 'Inicio', icon: Film },
  { route: 'help', label: 'Ayuda', icon: CircleHelp },
  { route: 'settings', label: 'Ajustes', icon: Settings },
]

export function Header({ route, onNavigate, theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="fm-header">
      <div className="fm-container">
        <div className="fm-header__bar liquid-glass lg-clear lg-r-bar">
          <a
            className="fm-logo"
            href="#/"
            onClick={(e) => {
              e.preventDefault()
              onNavigate('home')
            }}
            aria-label="F Movies, ir al inicio"
          >
            <span className="fm-logo__mark" aria-hidden="true">
              <Clapperboard size={19} />
            </span>
            <span className="fm-logo__word">
              F<b>Movies</b>
            </span>
          </a>

          <nav className="fm-nav" aria-label="Navegacion principal">
            {LINKS.map(({ route: target, label, icon: Icon }) => (
              <a
                key={target}
                className="fm-nav__link"
                href={target === 'help' ? '#/ayuda' : target === 'settings' ? '#/configuracion' : '#/'}
                aria-current={route === target ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate(target)
                }}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="fm-nav__label">{label}</span>
              </a>
            ))}
          </nav>

          <div className="fm-header__controls">
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-btn--icon"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
