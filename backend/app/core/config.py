import os
from pathlib import Path

# Section 5.1: Dados do usuário em ~/.local/share/biblioteca/
# Se executado via sudo, preservar home do usuário real para não bifurcar o banco em /root
sudo_user = os.environ.get("SUDO_USER")
if sudo_user and os.geteuid() == 0:
    base_user_home = Path(f"/home/{sudo_user}")
else:
    base_user_home = Path.home()

USER_DATA_DIR = os.getenv(
    "BIBLIOTECA_DATA_DIR",
    str(base_user_home / ".local/share/biblioteca")
)

DATA_PATH = Path(USER_DATA_DIR)
DATA_PATH.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_PATH / "biblioteca.db"
LOGS_DIR = DATA_PATH / "logs"
EXPORTS_DIR = DATA_PATH / "exportacoes"

LOGS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Configurações do servidor
HOST = "127.0.0.1"
SECRET_KEY = os.getenv("SECRET_KEY", "biblioteca-secret-key-desktop-v1-linux")
SESSION_EXPIRE_HOURS = 24
DEFAULT_BACKUP_DIR = os.getenv("BIBLIOTECA_BACKUP_DIR", "/media/hdd_externo/backups")
