"""Exporta cada post (*.html de esta carpeta) a PNG de 1080 × 1350 en png/.

    python redes/instagram-advance-salud/exportar.py

Usa Microsoft Edge (o Chrome, con NAVEGADOR=ruta) sin ventana y necesita
internet para las tipografías. Si «Common Rejection» está instalada en el
computador, se usa en vez de Satisfy.
"""
import os
import pathlib
import shutil
import subprocess
import tempfile
import time

CARPETA = pathlib.Path(__file__).resolve().parent
SALIDA = CARPETA / "png"
CANDIDATOS = [
    os.environ.get("NAVEGADOR"),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
]
NAVEGADOR = next((c for c in CANDIDATOS if c and os.path.exists(c)), None)
if not NAVEGADOR:
    raise SystemExit("No encontré Edge ni Chrome. Indica la ruta con NAVEGADOR=...")

SALIDA.mkdir(exist_ok=True)
for html in sorted(CARPETA.glob("*.html")):
    png = SALIDA / (html.stem + ".png")
    png.unlink(missing_ok=True)
    perfil = tempfile.mkdtemp(prefix="advance-ig-")   # un perfil por archivo evita bloqueos
    subprocess.run([NAVEGADOR, "--headless=new", "--disable-gpu", f"--user-data-dir={perfil}",
                    "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1080,1350",
                    "--virtual-time-budget=8000", f"--screenshot={png}", html.as_uri()], capture_output=True)
    # Edge puede terminar en segundo plano: se espera a que el PNG quede escrito.
    inicio, tamaño = time.time(), -1
    while time.time() - inicio < 90:
        if png.exists() and png.stat().st_size == tamaño and tamaño > 0:
            break
        tamaño = png.stat().st_size if png.exists() else -1
        time.sleep(1)
    shutil.rmtree(perfil, ignore_errors=True)
    print("listo:" if png.exists() else "FALLO:", png.name)
