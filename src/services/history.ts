// =========================================================================
// F Movies — Historial local (opcional, desactivado por defecto)
// Solo guarda en el navegador del usuario. Nunca se envia a terceros.
// =========================================================================

import type { HistoryEntry } from '../types'

const ENABLED_KEY = 'fmovies.history.enabled'
const ENTRIES_KEY = 'fmovies.history.entries'
const MAX_ENTRIES = 20

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const probe = '__fmovies_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    return null
  }
}

export function isHistoryEnabled(): boolean {
  const storage = safeStorage()
  if (!storage) return false
  return storage.getItem(ENABLED_KEY) === 'true'
}

export function setHistoryEnabled(enabled: boolean): void {
  const storage = safeStorage()
  if (!storage) return
  storage.setItem(ENABLED_KEY, String(enabled))
  if (!enabled) clearHistory()
}

export function loadHistory(): HistoryEntry[] {
  const storage = safeStorage()
  if (!storage || !isHistoryEnabled()) return []
  try {
    const raw = storage.getItem(ENTRIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : []
  } catch {
    return []
  }
}

export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  const storage = safeStorage()
  if (!storage || !isHistoryEnabled()) return []
  const entries = [entry, ...loadHistory().filter((e) => e.url !== entry.url)].slice(0, MAX_ENTRIES)
  storage.setItem(ENTRIES_KEY, JSON.stringify(entries))
  return entries
}

export function clearHistory(): void {
  const storage = safeStorage()
  storage?.removeItem(ENTRIES_KEY)
}
