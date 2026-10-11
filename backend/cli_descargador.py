"""
Descargador de YouTube para uso local (linea de comandos).

Uso:
    python cli_descargador.py "https://www.youtube.com/watch?v=XXXXXXXXXXX"
    python cli_descargador.py            # pide la URL por consola

Requiere: pip install pytubefix
"""

import sys

from pytubefix import YouTube
from pytubefix.cli import on_progress


def descargar(url: str) -> None:
    try:
        yt = YouTube(url, on_progress_callback=on_progress)
        print(f"\nDescargando: {yt.title}")

        stream = yt.streams.get_highest_resolution()
        if stream is None:
            print("No se encontro una transmision progresiva (video + audio).")
            return

        stream.download()
        print("\nDescarga completada con exito.")
    except Exception as exc:  # noqa: BLE001
        print(f"\nOcurrio un error: {exc}")


if __name__ == "__main__":
    enlace = sys.argv[1].strip() if len(sys.argv) > 1 else input("Pega el enlace del video de YouTube: ").strip()
    descargar(enlace)
