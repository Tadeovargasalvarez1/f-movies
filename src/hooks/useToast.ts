import { useCallback, useRef, useState } from 'react'

export type ToastKind = 'info' | 'success' | 'error' | 'warning'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

/** Notificaciones discretas y no bloqueantes. */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string, ttl = 4200) => {
      const id = ++counter.current
      setToasts((current) => [...current.slice(-3), { id, kind, message }])
      if (ttl > 0) window.setTimeout(() => dismiss(id), ttl)
      return id
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}
