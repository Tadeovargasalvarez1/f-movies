"""
F Movies — backend opcional de extracción y descarga (yt-dlp).

Expone el contrato que el frontend ya documenta:

  POST /analyze   { "url": "<url youtube u otra fuente>" }
    -> { title, thumbnailUrl, durationSeconds, mimeType, contentLengthBytes,
         formats: [ { id, mediaType, container, label, resolution,
                      audioBitrateKbps, estimatedSizeBytes } ] }

  POST /download  { "url": "<url>", "formatId": "<id>" }
    -> archivo binario (Content-Disposition con el nombre real)

  GET /           -> estado del servicio

AVISO: descargar contenido protegido por derechos de autor o saltarse los términos
de servicio de una plataforma es responsabilidad de quien despliega y usa este
servicio. Úsalo solo con contenido sobre el que tengas derechos o permisos.

Motor: yt-dlp (soporta YouTube y +1000 sitios).
Nota: Para YouTube los streams de alta resolución son adaptativos (video sin audio).
      El backend sirve el stream progresivo 360p (video+audio) como opción "con audio",
      y las demás resoluciones como streams independientes (video o audio por separado).
      Para obtener 1080p con audio se necesita ffmpeg instalado en el servidor.
"""

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:4173,https://tadeovargasalvarez1.github.io",
    ).split(",")
    if origin.strip()
]

RESOLUTION_ORDER = {
    "2160p": 0, "1440p": 1, "1080p": 2, "720p": 3,
    "480p": 4, "360p": 5, "240p": 6, "144p": 7, "original": 8,
}

# Detectar si ffmpeg está disponible para combinar video+audio
FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None

app = FastAPI(title="F Movies backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# ---------------------------------------------------------------------------
# Modelos
# ---------------------------------------------------------------------------

class AnalyzeBody(BaseModel):
    url: str


class DownloadBody(BaseModel):
    url: str
    formatId: str


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def validate_url(url: str) -> None:
    """Validación básica anti-SSRF: solo URLs http/https públicas."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Solo se admiten URLs http o https.")
    host = (parsed.hostname or "").lower()
    private_patterns = [
        r"^localhost$", r"^127\.", r"^10\.",
        r"^192\.168\.", r"^172\.(1[6-9]|2\d|3[01])\.", r"^::1$",
    ]
    for pattern in private_patterns:
        if re.match(pattern, host):
            raise HTTPException(status_code=400, detail="No se admiten URLs de redes privadas.")


def _resolution_label(height: int | None) -> str:
    if height is None:
        return "original"
    for label, min_h in [("2160p", 2000), ("1440p", 1350), ("1080p", 980),
                          ("720p", 620), ("480p", 420), ("360p", 300),
                          ("240p", 200), ("144p", 0)]:
        if height >= min_h:
            return label
    return "original"


def _container_video(ext: str | None) -> str:
    ext = (ext or "").lower()
    return ext if ext in ("mp4", "webm", "mkv") else "original"


def _container_audio(ext: str | None, acodec: str | None) -> str:
    ext = (ext or "").lower()
    acodec = (acodec or "").lower()
    if ext in ("m4a", "mp3", "opus", "ogg", "wav"):
        return ext
    if "opus" in acodec:
        return "opus"
    if "aac" in acodec or "mp4a" in acodec:
        return "m4a"
    if "vorbis" in acodec:
        return "ogg"
    return "original"


def extract_info(url: str) -> dict:
    """Obtiene metadatos con yt-dlp sin descargar."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as exc:
            raise HTTPException(status_code=502, detail=f"No se pudieron obtener los formatos: {exc}") from exc
    return info or {}


def build_formats(info: dict) -> list[dict]:
    """
    Construye la lista de formatos descargables.
    
    Estrategia para YouTube:
    - Streams progresivos (video+audio): etiquetados como "con audio" — descarga directa.
    - Si hay ffmpeg: ofrecemos resoluciones altas combinando video+audio (formato compuesto).
    - Streams de solo audio: M4A, OPUS, etc.
    - Streams de solo video: etiquetados claramente como "solo video".
    """
    raw_formats = info.get("formats") or []
    seen: set[str] = set()
    result: list[dict] = []

    # Separar en categorías
    progressive: dict[str, dict] = {}  # res -> mejor stream progresivo
    video_only: dict[str, dict] = {}   # res -> mejor stream de solo video
    audio_only: dict[str, dict] = {}   # container -> mejor stream de solo audio

    # El mejor stream de audio puro (para combinar con ffmpeg)
    best_audio: dict | None = None
    best_audio_abr: float = 0

    for f in raw_formats:
        vcodec = f.get("vcodec") or "none"
        acodec = f.get("acodec") or "none"
        has_video = vcodec != "none"
        has_audio = acodec != "none"

        if not has_video and not has_audio:
            continue

        if has_video and has_audio:
            res = _resolution_label(f.get("height"))
            current = progressive.get(res)
            if current is None or (f.get("tbr") or 0) > (current.get("tbr") or 0):
                progressive[res] = f

        elif has_video and not has_audio:
            res = _resolution_label(f.get("height"))
            current = video_only.get(res)
            if current is None:
                video_only[res] = f
            else:
                prio_new = (1 if (f.get("ext") or "") == "mp4" else 0, f.get("tbr") or 0)
                prio_cur = (1 if (current.get("ext") or "") == "mp4" else 0, current.get("tbr") or 0)
                if prio_new > prio_cur:
                    video_only[res] = f

        elif has_audio and not has_video:
            container = _container_audio(f.get("ext"), acodec)
            current = audio_only.get(container)
            abr = f.get("abr") or 0
            if current is None or abr > (current.get("abr") or 0):
                audio_only[container] = f
            # Rastrear el mejor audio para combinar
            if abr > best_audio_abr:
                best_audio = f
                best_audio_abr = abr

    # 1. Streams progresivos (video+audio real)
    for res, f in progressive.items():
        fid = str(f.get("format_id", ""))
        if fid in seen:
            continue
        seen.add(fid)
        ext = f.get("ext") or "mp4"
        container = _container_video(ext)
        label = f"{res if res != 'original' else 'Original'} · {container.upper()} · con audio"
        result.append({
            "id": fid,
            "mediaType": "video",
            "container": container,
            "label": label,
            "resolution": res,
            "hasAudio": True,
            "estimatedSizeBytes": f.get("filesize") or f.get("filesize_approx"),
        })

    # 2. Si hay ffmpeg: formatos combinados (video adaptativo + mejor audio)
    if FFMPEG_AVAILABLE and best_audio:
        best_audio_id = str(best_audio.get("format_id", ""))
        for res, f in video_only.items():
            if res in progressive:
                continue  # ya hay versión progresiva
            fid = str(f.get("format_id", ""))
            composite_id = f"merged:{fid}+{best_audio_id}"
            ext = f.get("ext") or "mp4"
            container = _container_video(ext)
            video_size = f.get("filesize") or f.get("filesize_approx") or 0
            audio_size = best_audio.get("filesize") or best_audio.get("filesize_approx") or 0
            label = f"{res if res != 'original' else 'Original'} · {container.upper()} · con audio (fusionado)"
            result.append({
                "id": composite_id,
                "mediaType": "video",
                "container": container,
                "label": label,
                "resolution": res,
                "hasAudio": True,
                "estimatedSizeBytes": (video_size + audio_size) or None,
            })

    # 3. Streams de solo video (cuando no hay ffmpeg o para las resoluciones que ya tienen progresiva)
    for res, f in video_only.items():
        if res in progressive:
            continue
        fid = str(f.get("format_id", ""))
        if fid in seen:
            continue
        # Si ya lo pusimos como merged con ffmpeg, no duplicar como solo video
        if FFMPEG_AVAILABLE and best_audio:
            continue
        seen.add(fid)
        ext = f.get("ext") or "mp4"
        container = _container_video(ext)
        label = f"{res if res != 'original' else 'Original'} · {container.upper()} · solo video"
        result.append({
            "id": fid,
            "mediaType": "video",
            "container": container,
            "label": label,
            "resolution": res,
            "hasAudio": False,
            "estimatedSizeBytes": f.get("filesize") or f.get("filesize_approx"),
        })

    # 4. Streams de solo audio
    for container, f in audio_only.items():
        fid = str(f.get("format_id", ""))
        if fid in seen:
            continue
        seen.add(fid)
        abr = f.get("abr")
        label = f"Audio {container.upper()}"
        if abr:
            label += f" · {int(abr)}kbps"
        result.append({
            "id": fid,
            "mediaType": "audio",
            "container": container,
            "label": label,
            "audioBitrateKbps": int(abr) if abr else None,
            "estimatedSizeBytes": f.get("filesize") or f.get("filesize_approx"),
        })

    def sort_key(item: dict) -> tuple[int, int]:
        if item["mediaType"] == "audio":
            return (1, 0)
        return (0, RESOLUTION_ORDER.get(str(item.get("resolution", "original")), 99))

    result.sort(key=sort_key)
    return result


def _download_format(url: str, format_id: str, tmp_dir: str) -> Path:
    """Descarga un formato (o compuesto merged:X+Y) en tmp_dir. Retorna la ruta del archivo."""
    
    if format_id.startswith("merged:"):
        # Formato compuesto: video_id+audio_id, fusionar con ffmpeg
        _, ids = format_id.split(":", 1)
        video_id, audio_id = ids.split("+", 1)
        fmt_spec = f"{video_id}+{audio_id}"
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "format": fmt_spec,
            "outtmpl": str(Path(tmp_dir) / "%(title)s.%(ext)s"),
            "noplaylist": True,
            "merge_output_format": "mp4",
            "postprocessors": [{
                "key": "FFmpegVideoConvertor",
                "preferedformat": "mp4",
            }],
        }
    else:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "format": format_id,
            "outtmpl": str(Path(tmp_dir) / "%(title)s.%(ext)s"),
            "noplaylist": True,
        }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    files = list(Path(tmp_dir).iterdir())
    if not files:
        raise RuntimeError("La descarga no produjo ningún archivo.")
    return files[0]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def health() -> dict:
    return {
        "service": "f-movies-backend",
        "status": "ok",
        "engine": "yt-dlp",
        "ffmpeg": FFMPEG_AVAILABLE,
    }


@app.post("/analyze")
def analyze(body: AnalyzeBody) -> dict:
    validate_url(body.url)
    info = extract_info(body.url)
    formats = build_formats(info)

    if not formats:
        raise HTTPException(status_code=502, detail="No se encontraron formatos disponibles.")

    # Miniatura de mayor resolución
    thumbnails = info.get("thumbnails") or []
    thumbnail_url = info.get("thumbnail")
    if thumbnails:
        best = max(
            (t for t in thumbnails if t.get("url")),
            key=lambda t: (t.get("width") or 0) * (t.get("height") or 0),
            default=None,
        )
        if best:
            thumbnail_url = best["url"]

    return {
        "title": info.get("title"),
        "thumbnailUrl": thumbnail_url,
        "durationSeconds": info.get("duration"),
        "mimeType": None,
        "contentLengthBytes": None,
        "formats": formats,
        "ffmpegAvailable": FFMPEG_AVAILABLE,
    }


@app.post("/download")
def download(body: DownloadBody) -> FileResponse:
    validate_url(body.url)

    tmp_dir = tempfile.mkdtemp(prefix="fmovies-")

    try:
        file_path = _download_format(body.url, body.formatId, tmp_dir)

        ext = file_path.suffix.lstrip(".")
        mime_map = {
            "mp4": "video/mp4", "webm": "video/webm", "mkv": "video/x-matroska",
            "m4a": "audio/mp4", "mp3": "audio/mpeg", "opus": "audio/ogg",
            "ogg": "audio/ogg", "wav": "audio/wav",
        }
        mime = mime_map.get(ext, "application/octet-stream")

        return FileResponse(
            str(file_path),
            filename=file_path.name,
            media_type=mime,
            background=BackgroundTask(shutil.rmtree, tmp_dir, True),
        )

    except HTTPException:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(status_code=502, detail=f"Falló la descarga: {exc}") from exc
