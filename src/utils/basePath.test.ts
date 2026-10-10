import { describe, expect, it } from 'vitest'
import { resolveBase } from './basePath'

describe('resolveBase (configuracion de GitHub Pages)', () => {
  it('usa la raiz en desarrollo', () => {
    expect(resolveBase({ mode: 'development', repo: 'f-movies' })).toBe('/')
  })

  it('usa /<repo>/ en produccion', () => {
    expect(resolveBase({ mode: 'production', repo: 'f-movies' })).toBe('/f-movies/')
  })

  it('no asume la raiz del dominio', () => {
    expect(resolveBase({ mode: 'production', repo: 'mi-repo' })).toBe('/mi-repo/')
  })

  it('el override tiene prioridad', () => {
    expect(resolveBase({ mode: 'development', repo: 'f-movies', override: 'custom-repo' })).toBe(
      '/custom-repo/',
    )
  })

  it('normaliza el override con barras', () => {
    expect(resolveBase({ mode: 'production', repo: 'x', override: '/otro/' })).toBe('/otro/')
    expect(resolveBase({ mode: 'production', repo: 'x', override: 'otro' })).toBe('/otro/')
  })
})
