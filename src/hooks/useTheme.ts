import { useCallback, useEffect, useState } from 'react'
import { applyTheme, getStoredTheme, persistTheme } from '../services/theme'
import type { ThemeName } from '../types'

/** Gestiona el tema visual (oscuro por defecto) y lo persiste. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
    persistTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggle }
}
