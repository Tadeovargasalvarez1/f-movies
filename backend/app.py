"""
F Movies — backend opcional de extraccion y descarga (YouTube via pytubefix).

Expone el contrato que el frontend ya documenta:

  POST /analyze   { "url": "<url youtube>" }
    -> { title, thumbnailUrl, durationSeconds, mimeType, contentLengthBytes,
         formats: [ { id, mediaType, container, label, resolution,
                      audioBitrateKbps, estimatedSizeBytes } ] }

  POST /download  { "url": "<url youtube>", "formatId": "<itag>" }
    -> archivo binario (Content-Disposition con el nombre real)

  GET /           -> estado del servicio

AVISO: descargar contenido protegido por derechos de autor o saltarse los terminos
de servicio de una plataforma es responsabilidad de quien despliega y usa este
servicio. Usalo solo con contenido sobre el que tengas derechos o permisos.
"""

import os
import shutil
import tempfile
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pytubefix import YouTube
from starlette.background import BackgroundTask

ALLOWED_HOSTS = {
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "music.youtube.com",
}

# Clientes de pytubefix a probar, en orden. Si uno no da streams, se prueba el siguiente.
CLIENT_CANDIDATES = ["ANDROID", "IOS", "TV", "WEB"]

VALID_RESOLUTIONS = {"144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p"}

RESOLUTION_ORDER = {
    "2160p": 0,
    "1440p": 1,
    "1080p": 2,
    "720p": 3,
    "480p": 4,
    "360p": 5,
    "240p": 6,
    "144p": 7,
    "original": 8,
}

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:4173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="F Movies backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


class AnalyzeBody(BaseModel):
    url: str


class DownloadBody(BaseModel):
    url: str
    formatId: str


def validate_youtube_url(url: str) -> None:
    """Solo se admiten enlaces de YouTube (proteccion basica frente a SSRF)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Solo se admiten enlaces http o https.")
    host = parsed.netloc.lower().split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    if host.startswith("m."):
        host = host[2:]
    if host not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail="Solo se admiten enlaces de YouTube.")


def create_youtube(url: str) -> YouTube:
    """Crea el objeto YouTube probando varios clientes hasta obtener streams."""
    last_error: Exception | None = None
    for client in CLIENT_CANDIDATES:
        try:
            candidate = YouTube(url, client=client)
            if list(candidate.streams):
                return candidate
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    try:
        fallback = YouTube(url)
        if list(fallback.streams):
            return fallback
    except Exception as exc:  # noqa: BLE001
        last_error = exc
    raise HTTPException(
        status_code=502,
        detail=f"No se pudieron obtener los formatos: {last_error or 'cliente no disponible'}",
    )


def video_container(stream) -> str:
    subtype = (stream.subtype or "").lower()
    if subtype == "mp4":
        return "mp4"
    if subtype == "webm":
        return "webm"
    if subtype == "3gpp":
        return "mp4"
    return "original"


def audio_container(stream) -> str:
    subtype = (stream.subtype or "").lower()
    codec = (stream.audio_codec or "").lower()
    if subtype == "mp4":
        return "m4a"
    if subtype == "webm":
        return "opus" if "opus" in codec else "ogg"
    if subtype == "mp3":
        return "mp3"
    return "original"


def _video_score(stream) -> int:
    score = 0
    if (stream.subtype or "").lower() == "mp4":
        score += 2
    if "avc1" in (stream.video_codec or "").lower():
        score += 1
    return score


def _resolution_label(stream) -> str:
    res = stream.resolution
    return res if res in VALID_RESOLUTIONS else "original"


def build_formats(yt: YouTube) -> list[dict]:
    # 1. Deduplicar por itag (pytubefix repite itags en pistas de audio/video).
    unique: list = []
    seen: set[int] = set()
    for stream in yt.streams:
        if stream.itag in seen:
            continue
        seen.add(stream.itag)
        unique.append(stream)

    videos = [s for s in unique if s.includes_video_track]
    audios = [s for s in unique if not s.includes_video_track and s.includes_audio_track]

    # 2. Una entrada por resolucion: preferir progresiva (con audio) y luego mp4/avc1.
    progressive: dict[str, object] = {}
    adaptive: dict[str, object] = {}
    for stream in videos:
        res = stream.resolution or "original"
        bucket = progressive if stream.is_progressive else adaptive
        current = bucket.get(res)
        if current is None or _video_score(stream) > _video_score(current):
            bucket[res] = stream

    formats: list[dict] = []

    def add_video(stream, has_audio: bool) -> None:
        resolution = _resolution_label(stream)
        container = video_container(stream)
        label = f"{resolution if resolution != 'original' else 'Original'} · {container.upper()}"
        label += " · con audio" if has_audio else " · sin audio (video)"
        formats.append(
            {
                "id": str(stream.itag),
                "mediaType": "video",
                "container": container,
                "label": label,
                "resolution": resolution,
                "estimatedSizeBytes": stream.filesize or stream.filesize_approx,
            }
        )

    for stream in progressive.values():
        add_video(stream, True)
    for res, stream in adaptive.items():
        if res in progressive:
            continue  # ya hay una version con audio de esa resolucion
        add_video(stream, False)

    # 3. Audio: una entrada por subtipo, la de mayor tasa de bits.
    audio_best: dict[str, object] = {}
    for stream in audios:
        key = (stream.subtype or "audio").lower()
        current = audio_best.get(key)
        if current is None or (stream.abr or "") > (current.abr or ""):
            audio_best[key] = stream

    for stream in audio_best.values():
        container = audio_container(stream)
        abr = stream.abr
        label = f"Audio {container.upper()}"
        if abr:
            label += f" · {abr}"
        formats.append(
            {
                "id": str(stream.itag),
                "mediaType": "audio",
                "container": container,
                "label": label,
                "audioBitrateKbps": int(abr.replace("kbps", "")) if abr else None,
                "estimatedSizeBytes": stream.filesize or stream.filesize_approx,
            }
        )

    def sort_key(item: dict) -> tuple[int, int]:
        if item["mediaType"] == "audio":
            return (1, 0)
        return (0, RESOLUTION_ORDER.get(str(item.get("resolution", "original")), 99))

    formats.sort(key=sort_key)
    return formats


@app.get("/")
def health() -> dict:
    return {"service": "f-movies-backend", "status": "ok", "engine": "pytubefix"}


@app.post("/analyze")
def analyze(body: AnalyzeBody) -> dict:
    validate_youtube_url(body.url)
    yt = create_youtube(body.url)
    formats = build_formats(yt)

    if not formats:
        raise HTTPException(status_code=502, detail="No se encontraron formatos disponibles.")

    return {
        "title": yt.title,
        "thumbnailUrl": yt.thumbnail_url,
        "durationSeconds": yt.length,
        "mimeType": None,
        "contentLengthBytes": None,
        "formats": formats,
    }


@app.post("/download")
def download(body: DownloadBody) -> FileResponse:
    validate_youtube_url(body.url)
    yt = create_youtube(body.url)
    stream = next((s for s in yt.streams if str(s.itag) == body.formatId), None)

    if stream is None:
        raise HTTPException(status_code=404, detail="El formato solicitado no existe.")

    tmp_dir = tempfile.mkdtemp(prefix="fmovies-")
    try:
        file_path = stream.download(output_path=tmp_dir)
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(status_code=502, detail=f"Fallo la descarga: {exc}") from exc

    filename = os.path.basename(file_path)
    return FileResponse(
        file_path,
        filename=filename,
        media_type=stream.mime_type or "application/octet-stream",
        background=BackgroundTask(shutil.rmtree, tmp_dir, True),
    )
