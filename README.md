# F Movies

Plataforma web **estática** para analizar enlaces de video y audio, ver formatos reales disponibles y descargar directamente cuando la fuente y los permisos lo permiten.

**Principio rector: honestidad técnica** — no se simulan descargas, no se inventan capacidades ni formatos.

## Demo

🌐 **[https://tadeovargasalvarez1.github.io/f-movies/](https://tadeovargasalvarez1.github.io/f-movies/)**

## Stack

- **React 19 + TypeScript + Vite** (sitio estático, publicable en GitHub Pages)
- **CSS Liquid Glass** con tokens (sin framework CSS externo)
- **FFmpeg.wasm** — conversión local de formatos en el navegador
- **Vitest** — pruebas
- **Backend opcional**: Python (FastAPI + pytubefix) para YouTube

## Funcionalidades

- Campo de URL con botón de pegar desde portapapeles
- Validación estricta de URLs (solo http/https, sin hosts privados)
- Clasificación automática: archivo directo vs página de plataforma
- Panel de resultados: miniatura, título, dominio, duración, formatos y calidad
- Descarga de archivos directos con barra de progreso real y cancelación
- Conversión local (MP4 / WebM / MP3 / WAV / M4A / Opus / OGG) vía FFmpeg.wasm
- YouTube: metadatos reales vía oEmbed; formatos descargables si hay backend
- Historial local (desactivado por defecto), tema claro/oscuro, accesibilidad

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # 52 pruebas Vitest
npm run build      # producción → dist/
```

## Backend (opcional, para YouTube)

Sin backend, el sitio funciona con archivos directos y conversión local.
Con backend, añade soporte de descarga para YouTube.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Endpoints:
- `POST /analyze` → formatos reales del video
- `POST /download` → descarga binaria

### Configurar backend para producción

1. Despliega el backend en Render, Railway o similar (obtendrás una URL HTTPS)
2. Configura `ALLOWED_ORIGINS` en el servidor con tu origen de Pages
3. En GitHub: **Settings → Secrets → Actions** → añade `VITE_API_BASE_URL` con la URL del backend
4. Haz push a `main` para desplegar

## Aviso legal

Este software es para uso educativo y personal. Respeta los términos de servicio de cada plataforma y las leyes de derechos de autor aplicables.
