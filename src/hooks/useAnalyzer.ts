import { useCallback, useMemo, useRef, useState } from 'react'
import { analyzeUrl } from '../services/analyzer'
import { ConversionTooLargeError, convert } from '../services/converter'
import { fetchAsBlob, performDownload, saveBlobAsFile } from '../services/downloader'
import {
  addHistory,
  clearHistory,
  isHistoryEnabled,
  loadHistory,
  setHistoryEnabled,
} from '../services/history'
import type { AnalyzerStatus, HistoryEntry, MediaFormatOption, ProgressInfo, SourceMetadata } from '../types'
import type { ToastKind } from './useToast'

interface AnalyzerState {
  status: AnalyzerStatus
  metadata?: SourceMetadata
  message: string
  actionHint?: string
  selectedId: string | null
  progress: ProgressInfo | null
}

const INITIAL: AnalyzerState = {
  status: 'idle',
  message: 'Pega un enlace para empezar.',
  selectedId: null,
  progress: null,
}

export interface UseAnalyzerOptions {
  onNotice?: (kind: ToastKind, message: string) => void
}

export function useAnalyzer(options: UseAnalyzerOptions = {}) {
  const { onNotice } = options
  const [state, setState] = useState<AnalyzerState>(INITIAL)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [historyEnabled, setHistoryEnabledState] = useState<boolean>(() => isHistoryEnabled())
  const abortRef = useRef<AbortController | null>(null)

  const videoFormats = useMemo(
    () => state.metadata?.formats.filter((f) => f.mediaType === 'video') ?? [],
    [state.metadata],
  )
  const audioFormats = useMemo(
    () => state.metadata?.formats.filter((f) => f.mediaType === 'audio') ?? [],
    [state.metadata],
  )
  const selectedFormat: MediaFormatOption | null = useMemo(
    () => state.metadata?.formats.find((f) => f.id === state.selectedId) ?? null,
    [state.metadata, state.selectedId],
  )

  const setProgress = useCallback((progress: ProgressInfo | null) => {
    setState((s) => ({ ...s, progress }))
  }, [])

  const analyze = useCallback(
    async (input: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({ status: 'validating', message: 'Validando enlace...', selectedId: null, progress: null })

      await Promise.resolve()
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, status: 'analyzing', message: 'Analizando fuente...' }))

      const result = await analyzeUrl(input, { signal: controller.signal })
      if (controller.signal.aborted) return

      const metadata = result.metadata
      let selectedId: string | null = null
      if (metadata && metadata.formats.length > 0) {
        const first = metadata.formats.find((f) => f.mediaType === 'video') ?? metadata.formats[0]
        selectedId = first.id
      }

      setState({
        status: result.status,
        metadata,
        message: result.message,
        actionHint: result.actionHint,
        selectedId,
        progress: null,
      })

      if (result.status === 'ready' && metadata && isHistoryEnabled()) {
        setHistory(
          addHistory({
            url: metadata.url,
            title: metadata.title ?? metadata.domain,
            domain: metadata.domain,
            at: Date.now(),
          }),
        )
      }
    },
    [],
  )

  const selectFormat = useCallback((id: string) => {
    setState((s) => ({ ...s, selectedId: id }))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setState(INITIAL)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setState((s) => ({ ...s, status: 'cancelled', message: 'Operacion cancelada.', progress: null }))
  }, [])

  const start = useCallback(async () => {
    const { metadata, selectedId } = state
    if (!metadata) return
    const format = metadata.formats.find((f) => f.id === selectedId)
    if (!format) {
      setState((s) => ({ ...s, status: 'format-unavailable', message: 'Selecciona un formato valido.' }))
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (format.source === 'converted') {
        setState((s) => ({
          ...s,
          status: 'processing',
          message: 'Preparando conversion local...',
          progress: { ratio: null, phase: 'Descargando recurso' },
        }))
        const sourceBlob = await fetchAsBlob(
          metadata.url,
          (p) => setProgress({ ...p, phase: 'Descargando recurso' }),
          controller.signal,
        )
        const { blob, fileName } = await convert({
          file: sourceBlob,
          fileName: metadata.title ? `${metadata.title}.src` : 'fmovies-entrada.src',
          target: {
            mediaType: format.mediaType,
            container: format.container,
            audioBitrateKbps: format.audioBitrateKbps,
          },
          onProgress: (p) => setProgress(p),
          signal: controller.signal,
        })
        saveBlobAsFile(blob, fileName)
      } else {
        setState((s) => ({
          ...s,
          status: 'preparing',
          message: 'Preparando descarga...',
          progress: { ratio: null, phase: 'Preparando' },
        }))
        const outcome = await performDownload({
          meta: metadata,
          format,
          signal: controller.signal,
          onProgress: (p) => setProgress(p),
        })
        if (outcome.usedFallback) {
          onNotice?.(
            'info',
            'El servidor bloqueo la lectura directa (CORS). El navegador gestionara la descarga directamente.',
          )
        }
      }

      setState((s) => ({ ...s, status: 'download-ready', message: 'Operacion completada.', progress: null }))
      onNotice?.('success', 'Descarga iniciada correctamente.')
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setState((s) => ({ ...s, status: 'cancelled', message: 'Operacion cancelada.', progress: null }))
        return
      }
      if (err instanceof ConversionTooLargeError) {
        setState((s) => ({
          ...s,
          status: 'format-unavailable',
          message: 'El archivo es demasiado grande para convertirlo en el navegador.',
          actionHint: 'Descarga el archivo original o usa un motor externo compatible.',
          progress: null,
        }))
        return
      }
      if ((err as Error)?.message === 'BACKEND_NOT_CONFIGURED') {
        setState((s) => ({
          ...s,
          status: 'backend-not-configured',
          message:
            'Esta fuente necesita un motor de procesamiento externo. La interfaz esta preparada para conectarlo, pero el servicio todavia no esta configurado.',
          progress: null,
        }))
        return
      }
      setState((s) => ({
        ...s,
        status: 'network-error',
        message: 'No se pudo completar la operacion.',
        actionHint: 'Comprueba tu conexion, los permisos CORS de la fuente o intentalo de nuevo.',
        progress: null,
      }))
    }
  }, [state, onNotice, setProgress])

  const toggleHistory = useCallback((enabled: boolean) => {
    setHistoryEnabled(enabled)
    setHistoryEnabledState(enabled)
    setHistory(enabled ? loadHistory() : [])
  }, [])

  const clearHistoryAll = useCallback(() => {
    clearHistory()
    setHistory([])
  }, [])

  return {
    state,
    status: state.status,
    metadata: state.metadata,
    message: state.message,
    actionHint: state.actionHint,
    progress: state.progress,
    selectedFormat,
    videoFormats,
    audioFormats,
    history,
    historyEnabled,
    analyze,
    selectFormat,
    start,
    cancel,
    reset,
    toggleHistory,
    clearHistoryAll,
  }
}
