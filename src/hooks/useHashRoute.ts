import { useCallback, useEffect, useState } from 'react'

export type Route = 'home' | 'help' | 'settings'

const ROUTES: Record<string, Route> = {
  '#/': 'home',
  '#/inicio': 'home',
  '#/ayuda': 'help',
  '#/configuracion': 'settings',
}

function parse(hash: string): Route {
  const key = hash && hash !== '#' ? hash.toLowerCase() : '#/'
  return ROUTES[key] ?? 'home'
}

/**
 * Enrutado por hash: totalmente compatible con hospedaje estatico
 * (GitHub Pages) y sin errores 404 al refrescar o compartir enlaces.
 */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? 'home' : parse(window.location.hash),
  )

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    const hash = next === 'help' ? '#/ayuda' : next === 'settings' ? '#/configuracion' : '#/'
    if (window.location.hash !== hash) window.location.hash = hash
    setRoute(next)
  }, [])

  return [route, navigate]
}
