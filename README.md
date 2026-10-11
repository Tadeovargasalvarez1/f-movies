# F Movies

**Tus videos, a tu manera.**

F Movies es una aplicación web estática que analiza enlaces de video o audio y permite
descargar el contenido —en distintos formatos y calidades— **solo cuando la fuente y los
permisos lo permiten**. Está diseñada para publicarse en **GitHub Pages** sin necesidad de
un backend propio, e incluye la arquitectura para conectar, de forma opcional, un servicio
externo autorizado.

> Honestidad técnica: F Movies **no simula descargas**, **no inventa** resoluciones, tamaños ni
> duraciones y **no afirma** compatibilidad universal con plataformas como YouTube, TikTok,
> Instagram, Facebook o Vimeo. Solo muestra lo que puede verificar.

---

## Índice

- [Estado del proyecto](#estado-del-proyecto)
- [Funciones implementadas](#funciones-implementadas)
- [Funciones que dependen de proveedores externos](#funciones-que-dependen-de-proveedores-externos)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Comandos de desarrollo](#comandos-de-desarrollo)
- [Compilación de producción](#compilación-de-producción)
- [Pruebas](#pruebas)
- [Configuración de GitHub Pages](#configuración-de-github-pages)
- [Configuración de la URL base](#configuración-de-la-url-base)
- [Cómo añadir proveedores](#cómo-añadir-proveedores)
- [Cómo configurar un backend externo autorizado](#cómo-configurar-un-backend-externo-autorizado)
- [Limitaciones de CORS](#limitaciones-de-cors)
- [Limitaciones de FFmpeg.wasm](#limitaciones-de-ffmpegwasm)
- [Seguridad, privacidad y derechos de autor](#seguridad-privacidad-y-derechos-de-autor)
- [Diseño: Liquid Glass](#diseño-liquid-glass)
- [Estructura del proyecto](#estructura-del-proyecto)

---

## Estado del proyecto

- Disponible (funciona 100% en el navegador, sin backend).
- Experimental (requiere hardware/navegador compatible).
- Pendiente de servicio externo (necesita `VITE_API_BASE_URL`).

| Área | Estado |
| --- | --- |
| Analizar y descargar archivos multimedia directos | **Disponible** |
| Detección de metadatos por cabeceras HTTP | **Disponible** |
| Selección de formato (video/audio) y resolución real | **Disponible** |
| Historial local (desactivado por defecto) | **Disponible** |
| Conversión local con FFmpeg.wasm (MP4/WebM/MP3/WAV/M4A/Opus/OGG) | **Experimental** |
| Extracción desde plataformas de streaming | **Pendiente de servicio externo** |
| Combinar pistas de video y audio separadas | **Pendiente de servicio externo** |

---

## Funciones implementadas

- Interfaz **Liquid Glass** oscura, cinematográfica y responsive (móvil, tablet, escritorio).
- Campo principal para pegar un enlace, botón de **pegar desde el portapapeles** y botón de limpiar.
- **Validación estricta de URL**: solo `http`/`https`, sin credenciales embebidas y sin hosts privados.
- **Clasificación** de recursos: archivo directo vs. página de plataforma.
- **Metadatos reales de YouTube** vía la API pública oEmbed (título, miniatura, autor), sin autenticación.
- **Panel de resultados** con miniatura (si existe), título, dominio, duración, formatos, calidad y tamaño.
- **Selector de modo** Video/Audio, contenedor y resolución **solo con opciones realmente disponibles**.
- **Descarga real** de archivos directos, con progreso medido y cancelación.
- **Conversión local opcional** con FFmpeg.wasm cargado bajo demanda.
- **Estados de interfaz** diferenciados y mensajes con acción sugerida.
- Navegación por teclado, etiquetas accesibles, `focus-visible` y `prefers-reduced-motion`.
- **Enrutado por hash**: no hay errores 404 al refrescar o abrir enlaces internos en Pages.

## Funciones que dependen de proveedores externos

- Analizar páginas de plataformas (extracción de streams).
- **Descargar videos de YouTube**: el navegador no puede extraer los streams (CORS, firmas cifradas y medidas anti-automatización). YouTube muestra sus metadatos, pero los formatos requieren un backend externo autorizado (por ejemplo, con `yt-dlp` en un servidor propio).
- Producir salidas que requieren servidor (remux/merge, reencode pesado, formatos no soportados localmente).
- Descargar recursos que el navegador no puede leer por CORS.

Si no hay backend configurado, F Movies muestra:

> «Esta fuente necesita un motor de procesamiento externo. La interfaz está preparada para
> conectarlo, pero el servicio todavía no está configurado».

---

## Tecnologías utilizadas

- **React 19** + **TypeScript**.
- **Vite** (con `base` configurable para GitHub Pages).
- **CSS moderno** con tokens (variables CSS) para el sistema Liquid Glass. Sin framework CSS añadido.
- **lucide-react** para iconografía.
- **FFmpeg.wasm** (`@ffmpeg/ffmpeg` + `@ffmpeg/util`) como módulo **opcional y perezoso**.
- **Web Worker** propio para la conversión, con respaldo al worker interno de FFmpeg.
- **Vitest** para pruebas automatizadas.

## Requisitos

- Node.js 20.19+ o 22+ (recomendado 22).
- npm 10+.
- Un navegador moderno con WebAssembly para la conversión local (Chromium/Firefox; Safari con limitaciones).

## Instalación

```bash
npm install
```

## Comandos de desarrollo

```bash
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm run typecheck  # comprobación de tipos
npm run test       # pruebas automatizadas (una vez)
npm run test:watch # pruebas en modo vigilancia
```

## Compilación de producción

```bash
npm run build      # tsc --noEmit && vite build  -> genera dist/
npm run preview    # sirve dist/ localmente para comprobar
```

## Pruebas

Se ejecutan con **Vitest** (entorno Node) y cubren:

- Validación de URL (válida, malformada, protocolo no permitido, credenciales, hosts privados).
- Identificación de recursos multimedia directos y de páginas no analizables.
- Proveedor externo sin configurar.
- Respuestas incompletas de proveedores y errores de red.
- Construcción de argumentos de FFmpeg y conversión no disponible.
- **Descarga real** de un recurso servido por un servidor HTTP local de prueba.
- Resolución de la **URL base** de GitHub Pages.

```bash
npm run test
```

---

## Configuración de GitHub Pages

El repositorio incluye el workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
que compila y publica automáticamente.

1. Sube el proyecto a un repositorio (por ejemplo `f-movies`).
2. En GitHub, ve a **Settings → Pages**.
3. En **Build and deployment → Source**, selecciona **GitHub Actions**.
4. Haz *push* a la rama `main` (o ejecuta el workflow manualmente desde **Actions**).
5. La app quedará disponible en:

   ```
   https://USUARIO.github.io/f-movies/
   ```

El workflow usa permisos mínimos (`contents: read`, `pages: write`, `id-token: write`),
ejecuta las pruebas, compila y despliega el artefacto `dist/`. No se almacena ningún secreto.

### Evitar errores 404

La aplicación usa **enrutado por hash** (`#/ayuda`, `#/configuracion`), por lo que refrescar o
abrir directamente un enlace interno no produce 404. Además se incluye `public/404.html`
como respaldo para rutas sin hash y `public/.nojekyll` para desactivar Jekyll.

## Configuración de la URL base

La `base` de Vite debe coincidir con la ruta del repositorio, **nunca** asumas la raíz del dominio.

- En **producción** se deduce del nombre del repositorio (`GITHUB_REPOSITORY`) → `/<repo>/`.
- Por defecto es `/f-movies/`.
- Puedes forzarla con la variable pública `VITE_BASE`:

  ```bash
  VITE_BASE=/mi-repo/ npm run build
  ```

  o en `.env.local`:

  ```dotenv
  VITE_BASE=/mi-repo/
  ```

La lógica de resolución es una función pura y probada: `src/utils/basePath.ts`.

---

## Cómo añadir proveedores

La arquitectura es modular (carpeta `src/providers/`). Un proveedor implementa:

```ts
interface Provider {
  id: string
  name: string
  priority: number // menor = se intenta antes
  canHandle(url: URL): boolean
  analyze(ctx: AnalysisContext): Promise<SourceMetadata | null>
  capabilities: ProviderCapabilities
}
```

Pasos para añadir uno nuevo:

1. Crea `src/providers/miProveedor.ts` implementando `Provider`.
2. Devuelve `null` si no puedes resolver la fuente (nunca inventes datos).
3. Regístralo en `src/providers/registry.ts` con la prioridad adecuada.
4. Añade pruebas en `src/**/*.test.ts`.

Proveedores incluidos:

- `DirectMediaProvider` — archivos multimedia accesibles directamente.
- `YouTubeProvider` — metadatos reales vía oEmbed; formatos vía backend externo si está configurado.
- `BackendDownloadProvider` — integración opcional con un backend externo autorizado.
- `UnsupportedSourceProvider` — explica incompatibilidad (último recurso).
- `ConversionProvider` (`localFfmpegConversionProvider`) — descriptores del motor local.

## Cómo configurar un backend externo autorizado

1. Define la URL base (variable pública, **no es un secreto**): `VITE_API_BASE_URL=https://tu-servicio`.
2. Implementa en tu servicio los endpoints documentados:

   **POST `/analyze`**

   ```json
   { "url": "https://..." }
   ```

   Respuesta:

   ```json
   {
     "title": "Título",
     "thumbnailUrl": "https://...",
     "durationSeconds": 120,
     "mimeType": "video/mp4",
     "contentLengthBytes": 12345678,
     "formats": [
       { "id": "v1080", "mediaType": "video", "container": "mp4", "resolution": "1080p" },
       { "id": "a128",  "mediaType": "audio", "container": "mp3", "audioBitrateKbps": 128 }
     ]
   }
   ```

   **POST `/download`**

   ```json
   { "url": "https://...", "formatId": "v1080" }
   ```

   Responde con `{ "downloadUrl": "..." }` o con el binario directamente.

3. Protege ese backend contra **SSRF**, abuso automatizado y consumo excesivo de recursos;
   aplica límites de tamaño, duración, concurrencia y tiempo de ejecución.

Sin `VITE_API_BASE_URL`, F Movies opera en modo estático y lo indica con claridad.

### Backend incluido (YouTube con pytubefix)

En `backend/` hay un servicio listo que implementa `/analyze` y `/download` usando
[`pytubefix`](https://pypi.org/project/pytubefix/), para analizar y descargar videos de YouTube:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Luego, en la raíz del proyecto, crea `.env.local` con `VITE_API_BASE_URL=http://localhost:8000`
y ejecuta `npm run dev`. Al analizar un enlace de YouTube aparecerán los formatos reales.

Para producción, el backend debe servirse por **HTTPS** (GitHub Pages es HTTPS y el navegador
bloquea el contenido mixto). Detalles, Docker y notas de seguridad en
[`backend/README.md`](backend/README.md).

> ⚠️ Descargar contenido puede infringir derechos de autor y los términos de servicio de
> YouTube. Es responsabilidad tuya usar este backend solo con contenido autorizado, y de
> protegerlo (CORS, límites y rate limiting) si lo expones públicamente.

---

## Limitaciones de CORS

Muchos servidores no envían las cabeceras CORS necesarias, por lo que el navegador **no puede
leer** el cuerpo del archivo ni medir su tamaño. En ese caso:

- Se ofrece igualmente la **descarga directa** (el navegador la gestiona).
- La **conversión local no está disponible** (no se puede leer el archivo).
- El tamaño y la duración pueden aparecer como «desconocidos» en lugar de inventarse.

## Limitaciones de FFmpeg.wasm

- Se **carga solo cuando el usuario lo necesita**; nunca al abrir la página.
- El núcleo (`@ffmpeg/core`) se descarga de un **CDN público** (unpkg) en el momento de usar la conversión.
- Depende de la **memoria** del dispositivo y del soporte de **WebAssembly** y **Web Workers**.
- Archivos grandes pueden no procesarse: hay un **límite configurable** (`LOCAL_CONVERSION_LIMITS.maxBytes`, 400 MB por defecto) y se avisa al usuario.
- Algunos códecs dependen del build del núcleo de FFmpeg.

## Seguridad, privacidad y derechos de autor

- **Validación estricta** de URL y protocolos; rechazo de credenciales y hosts privados (útil también frente a SSRF en el backend).
- **Sin XSS**: React escapa el contenido y las URLs de recursos se validan con `safeUrl`.
- **Sin secretos** en el código público. `VITE_*` son variables públicas por diseño.
- **Sin envío a terceros** sin consentimiento: en modo estático, la app solo contacta con la fuente introducida y con el CDN público al activar la conversión.
- **No se solicitan credenciales** de terceros y **no se elude** DRM, autenticación ni controles de acceso.
- La sección de ayuda y el pie de página recuerdan la **responsabilidad del usuario** sobre los derechos de autor.

## Diseño: Liquid Glass

Identidad visual propia inspirada en el material Liquid Glass de Apple, **adaptada a la web** (no
se reproduce el motor nativo de Apple).

- Tokens CSS en `src/styles/tokens.css` (`--glass-blur`, `--glass-saturation`, `--glass-fill`, radios, sombras, acentos violeta/azul/magenta).
- Material base `.liquid-glass` con `backdrop-filter` y `-webkit-backdrop-filter`, reflejo interno y variantes de jerarquía: `lg-clear`, `lg-regular`, `lg-subtle`.
- **Degradación progresiva** con `@supports not (backdrop-filter)`: superficie sólida que conserva contraste.
- **Refracción SVG opcional** (`.lg-refract` + `feTurbulence`/`feDisplacementMap`) aplicada solo al campo principal; es estática y no consume recursos de forma continua.
- Respeto por `prefers-reduced-motion` y `focus-visible`.

## Estructura del proyecto

```
src/
  components/   # UI (Header, Hero, UrlInput, ResultPanel, FormatSelector, StatusZone, Toasts...)
  pages/        # Home, Help, Settings
  providers/    # Arquitectura de proveedores + registro
  services/     # analyzer, downloader, converter, ffmpegArgs, history, theme, clipboard
  hooks/        # useAnalyzer, useTheme, useToast, useHashRoute
  types/        # Modelos de datos compartidos
  utils/        # url, format, http, basePath
  workers/      # Web Worker de conversión (FFmpeg.wasm)
  styles/       # tokens, global, liquid-glass, components
public/         # favicon, .nojekyll, 404.html
.github/workflows/deploy.yml
```

---

## Licencia y responsabilidad

Proyecto con fines educativos y de utilidad personal. Usa F Movies únicamente con contenido
sobre el que tengas derechos o permisos. Respeta los términos de servicio de cada plataforma y
la legislación aplicable.
