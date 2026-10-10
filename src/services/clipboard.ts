// =========================================================================
// F Movies — Acceso al portapapeles (con manejo de permisos)
// =========================================================================

export interface ClipboardResult {
  ok: boolean
  text?: string
  message?: string
}

/** Lee texto del portapapeles si el navegador concede permiso. */
export async function readClipboard(): Promise<ClipboardResult> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
    return { ok: false, message: 'Tu navegador no permite pegar desde el portapapeles. Pega el enlace con Ctrl+V.' }
  }
  try {
    const text = await navigator.clipboard.readText()
    if (!text) return { ok: false, message: 'El portapapeles esta vacio.' }
    return { ok: true, text }
  } catch {
    return {
      ok: false,
      message: 'No se concedio permiso para leer el portapapeles. Pega el enlace manualmente.',
    }
  }
}
