#!/usr/bin/env python3
import os
import sys
import time
import socket
import threading
import webbrowser
import subprocess
from pathlib import Path

# Se executado via sudo, preservar XAUTHORITY e home do usuário real
if os.geteuid() == 0:
    sudo_user = os.environ.get("SUDO_USER")
    if sudo_user:
        user_home = Path(f"/home/{sudo_user}")
        xauth = user_home / ".Xauthority"
        if xauth.exists() and "XAUTHORITY" not in os.environ:
            os.environ["XAUTHORITY"] = str(xauth)
        if "BIBLIOTECA_DATA_DIR" not in os.environ:
            os.environ["BIBLIOTECA_DATA_DIR"] = str(user_home / ".local/share/biblioteca")
    if "DISPLAY" not in os.environ:
        os.environ["DISPLAY"] = ":0.0"

# Adicionar raiz do projeto ao path se executado via script
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import uvicorn
from backend.app.main import app

def obter_porta(preferencial: int = 49200) -> int:
    """Tenta alocar uma porta estável para manter persistência de cache/localStorage do WebKit."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", preferencial))
            return preferencial
    except OSError:
        pass
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

PORTA = obter_porta(49200)
URL = f"http://127.0.0.1:{PORTA}"

def iniciar_servidor():
    uvicorn.run(app, host="127.0.0.1", port=PORTA, log_level="warning")

def aguardar_servidor(porta: int, timeout: int = 15) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", porta), timeout=0.5):
                return True
        except (OSError, ConnectionRefusedError):
            time.sleep(0.2)
    return False

def abrir_janela():
    # 1. Tentar abrir diretamente na Janela Nativa Desktop GTK / WebKit2 (Seção 14.3)
    try:
        import gi
        gi.require_version('Gtk', '3.0')
        gi.require_version('WebKit2', '4.1')
    except Exception:
        try:
            import gi
            gi.require_version('WebKit2', '4.0')
        except Exception:
            pass

    try:
        import webview
        webview.create_window(
            title="Sistema de Biblioteca",
            url=URL,
            width=1280,
            height=800,
            min_size=(960, 640)
        )
        # Inicia a janela nativa GTK
        webview.start(gui="gtk")
        return
    except Exception as e:
        print(f"[Aviso] Janela GTK falhou ({e}). Tentando fallback em modo aplicativo...", file=sys.stderr)

    # 2. Fallback Chromium / Chrome em modo aplicativo desktop (--app)
    for browser_cmd in ["chromium", "google-chrome", "chromium-browser"]:
        try:
            proc = subprocess.Popen([browser_cmd, f"--app={URL}", "--window-size=1280,800"])
            proc.wait()
            return
        except FileNotFoundError:
            continue

    # 3. Fallback navegador padrão se nada mais estiver disponível
    print(f"Abrindo no navegador padrão: {URL}")
    webbrowser.open(URL)
    while True:
        time.sleep(1)

if __name__ == "__main__":
    # Iniciar FastAPI em thread daemon
    thread_servidor = threading.Thread(target=iniciar_servidor, daemon=True)
    thread_servidor.start()

    if not aguardar_servidor(PORTA):
        print("Erro: O servidor FastAPI não respondeu no tempo esperado.", file=sys.stderr)
        sys.exit(1)

    print(f"Sistema de Biblioteca em execução em: {URL}")
    try:
        abrir_janela()
    except KeyboardInterrupt:
        print("\nEncerrando Sistema de Biblioteca...")
    finally:
        # Encerramento limpo e imediato de todas as threads (uvicorn, GTK, webview)
        os._exit(0)
