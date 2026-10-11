# F Movies — Backend opcional (YouTube con pytubefix)

Servicio mínimo que implementa el contrato que F Movies ya espera, para poder
**analizar y descargar videos de YouTube** que el navegador no puede extraer por sí solo.

> ⚠️ **Aviso legal:** descargar contenido puede infringir derechos de autor y los términos
> de servicio de YouTube. Úsalo únicamente con contenido sobre el que tengas derechos o
> permisos. Tú eres responsable de cómo despliegues y uses este servicio.

## Endpoints

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/` | — | estado del servicio |
| `POST` | `/analyze` | `{ "url": "<youtube>" }` | `{ title, thumbnailUrl, durationSeconds, formats: [...] }` |
| `POST` | `/download` | `{ "url", "formatId": "<itag>" }` | archivo binario |

## Ejecutar en local

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Comprueba: http://localhost:8000/ → `{"service":"f-movies-backend","status":"ok",...}`

También incluye un descargador por línea de comandos (el script original adaptado):

```bash
python cli_descargador.py "https://www.youtube.com/watch?v=C-Wh8Og-5I4"
```

## Conectar con el frontend

En la raíz del proyecto, crea `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

y ejecuta:

```bash
npm run dev
```

Ahora, al analizar un enlace de YouTube, verás los formatos reales y el botón **Descargar**.

## Desplegar en un servidor (HTTPS obligatorio)

El sitio de GitHub Pages es **HTTPS**; el navegador bloqueará llamadas a un backend `http://`
(mixed content). Para producción, despliega el backend en un host con **HTTPS** y define su URL
en `VITE_API_BASE_URL` **antes de compilar**:

```bash
VITE_API_BASE_URL=https://mi-backend.example.com npm run build
```

Opciones: Render, Railway, Fly.io, un VPS, o Docker:

```bash
docker build -t fmovies-backend backend
docker run -p 8000:8000 -e ALLOWED_ORIGINS=https://TUUSUARIO.github.io fmovies-backend
```

Recuerda añadir el dominio de tu sitio a `ALLOWED_ORIGINS` para habilitar CORS.

## Estado verificado y limitaciones

Probado con `pytubefix 11.2.0` y Python 3.12:

- **`/analyze` funciona**: devuelve título, duración, miniatura y los formatos reales
  (probado: 11 formatos, incluyendo 144p–2160p y audio M4A/Opus).
- **Descarga de streams progresivos (video+audio) funciona**: probado `client="ANDROID"` con el
  stream de 360p (77 MB descargados correctamente).
- **Streams adaptativos (1080p+, video sin audio y audio suelto)** pueden fallar con
  `Invalid SABR refresh`: YouTube aplica *SABR* y exige un **PoToken**. `pytubefix` genera el
  PoToken con Node (`botGuard.js`); en algunos entornos esto falla (por ejemplo, si hay un
  `package.json` con `"type":"module"` en una carpeta superior, Node trata `botGuard.js` como ESM).

Por eso el backend prioriza los streams **progresivos** (con audio) y etiqueta los adaptativos
como *"sin audio (video)"*.

### Recomendaciones

- Elige un **formato "con audio"** en la interfaz para descargar sin problemas.
- Para alta resolución (1080p/1440p/2160p) o para extraer solo audio de forma fiable,
  `pytubefix` tiene limitaciones. La alternativa más robusta es **yt-dlp** (con `ffmpeg` para
  unir video+audio). Si quieres, este backend se puede adaptar para usar yt-dlp.
- Despliega en un entorno **sin** un `package.json` `type: module` por encima (Docker lo cumple),
  y mantén `pytubefix` actualizado, ya que YouTube cambia con frecuencia.

## Seguridad (importante)

- Restringe `ALLOWED_ORIGINS` a tus dominios.
- Añade **límites** (tamaño, duración, concurrencia) y **rate limiting**, y no lo dejes
  abierto al público sin protección: es un endpoint que consume recursos.
- El backend solo acepta enlaces de YouTube (validación anti‑SSRF incluida), pero un host
  público necesita además autenticación o un token si no quieres que lo use cualquiera.
- No incluye ninguna clave: `pytubefix` no requiere API key.
