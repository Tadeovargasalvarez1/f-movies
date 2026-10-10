// =========================================================================
// F Movies — Tema visual (oscuro por defecto)
// =========================================================================

import type { ThemeName } from '../types'

const THEME_KEY = 'fmovies.theme'

export function getStoredTheme(): ThemeName {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    /* almacenamiento no disponible */
  }
  return 'dark'
}

export function applyTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', theme === 'dark' ? '#06070d' : '#eef1f8')
}

export function persistTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* almacenamiento no disponible */
  }
}
