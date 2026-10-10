import { ShieldAlert } from 'lucide-react'

export function Help() {
  return (
    <main className="fm-main" id="contenido">
      <div className="fm-container">
        <div className="fm-page liquid-glass lg-regular" style={{ marginTop: 8 }}>
          <h1>Ayuda</h1>
          <p className="fm-muted">
            F Movies analiza enlaces en tu navegador y descarga contenido solo cuando la fuente y los permisos
            lo permiten.
          </p>

          <h2>Como usarlo</h2>
          <ol className="fm-muted" style={{ paddingLeft: 20 }}>
            <li>Pega un enlace y pulsa <strong>Analizar enlace</strong>.</li>
            <li>Revisa los datos disponibles: titulo, duracion, formatos y calidad real.</li>
            <li>Elige video o audio y el formato o resolucion que exista de verdad.</li>
            <li>Pulsa <strong>Descargar</strong> (o <strong>Convertir y descargar</strong> si usa el motor local).</li>
          </ol>

          <h2>Que funciona directamente</h2>
          <ul>
            <li>Archivos multimedia directos (.mp4, .webm, .mp3, .m4a, .wav, .opus, .ogg).</li>
            <li>Deteccion de metadatos disponibles mediante cabeceras HTTP, cuando el servidor lo permite.</li>
            <li>Conversion local con FFmpeg.wasm para archivos que el navegador puede leer.</li>
          </ul>

          <h2>Que depende de un servicio externo</h2>
          <ul>
            <li>Extraccion desde plataformas de streaming, que requieren un backend autorizado.</li>
            <li>Combinar pistas de video y audio separadas.</li>
            <li>Recursos protegidos por CORS, autenticacion o DRM.</li>
          </ul>

          <h2>Limitaciones</h2>
          <ul>
            <li><strong>CORS:</strong> muchos servidores impiden leer un archivo desde otra web. En ese caso se ofrece la descarga directa, sin conversion.</li>
            <li><strong>FFmpeg.wasm:</strong> depende de la memoria del dispositivo, la disponibilidad de WebAssembly y el soporte de Web Workers. Archivos grandes pueden no procesarse.</li>
            <li><strong>Plataformas:</strong> no se afirma compatibilidad universal con YouTube, TikTok, Instagram, Facebook o Vimeo. La compatibilidad debe comprobarse y respetar sus terminos.</li>
          </ul>

          <div className="fm-notice-box liquid-glass lg-subtle" style={{ marginTop: 24 }}>
            <ShieldAlert size={20} aria-hidden="true" />
            <div>
              <strong>Derechos de autor y seguridad</strong>
              <p style={{ margin: '6px 0 0' }}>
                Debes disponer de los derechos o permisos necesarios sobre el contenido. F Movies no intenta
                eludir DRM, controles de acceso, autenticacion ni restricciones tecnicas, y nunca solicita
                credenciales de cuentas de terceros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
