import { ClipboardPaste, Link2, Loader2, Search, X } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useCallback } from 'react'
import { readClipboard } from '../services/clipboard'
import type { ToastKind } from '../hooks/useToast'

interface UrlInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  analyzing: boolean
  error?: string | null
  onNotice?: (kind: ToastKind, message: string) => void
}

export function UrlInput({ value, onChange, onSubmit, analyzing, error, onNotice }: UrlInputProps) {
  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      onSubmit()
    },
    [onSubmit],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        onSubmit()
      }
    },
    [onSubmit],
  )

  const handlePaste = useCallback(async () => {
    const result = await readClipboard()
    if (result.ok && result.text) {
      onChange(result.text.trim())
    } else if (result.message) {
      onNotice?.('warning', result.message)
    }
  }, [onChange, onNotice])

  const handleClear = useCallback(() => {
    onChange('')
  }, [onChange])

  return (
    <form className="fm-search liquid-glass lg-clear lg-refract" onSubmit={handleSubmit}>
      <div className="fm-search__row">
        <span className="fm-search__icon" aria-hidden="true">
          <Link2 size={20} />
        </span>
        <label className="fm-sr-only" htmlFor="fm-url">
          Enlace de video o audio
        </label>
        <input
          id="fm-url"
          className="fm-search__input"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="Pega un enlace: https://ejemplo.com/video.mp4"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={analyzing}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'fm-url-error' : undefined}
        />
        <div className="fm-search__tools">
          <button
            type="button"
            className="fm-btn fm-btn--ghost fm-btn--icon"
            onClick={handlePaste}
            disabled={analyzing}
            aria-label="Pegar desde el portapapeles"
            title="Pegar desde el portapapeles"
          >
            <ClipboardPaste size={18} aria-hidden="true" />
          </button>
          {value && (
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-btn--icon"
              onClick={handleClear}
              disabled={analyzing}
              aria-label="Limpiar campo"
              title="Limpiar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="fm-search__actions">
        <span className="fm-search__hint">
          Archivos directos (.mp4, .webm, .mp3, .m4a...) y fuentes compatibles.
        </span>
        <button type="submit" className="fm-btn fm-btn--primary" disabled={analyzing || !value.trim()}>
          {analyzing ? (
            <Loader2 size={18} className="fm-spin" aria-hidden="true" />
          ) : (
            <Search size={18} aria-hidden="true" />
          )}
          {analyzing ? 'Analizando...' : 'Analizar enlace'}
        </button>
      </div>

      {error && (
        <p className="fm-error" id="fm-url-error" role="alert">
          <X size={15} aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  )
}
