import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { Toast, ToastKind } from '../hooks/useToast'

interface ToastViewportProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

const ICONS: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fm-toasts" role="region" aria-label="Notificaciones">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind]
        return (
          <div
            key={toast.id}
            className={`fm-toast liquid-glass lg-regular lg-r-control fm-toast--${toast.kind}`}
            role="status"
          >
            <Icon size={17} aria-hidden="true" />
            <span>{toast.message}</span>
            <button
              type="button"
              className="fm-toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificacion"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
