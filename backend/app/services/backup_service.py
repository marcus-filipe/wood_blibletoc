import os
import shutil
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.core.config import DB_PATH, DEFAULT_BACKUP_DIR
from backend.app.models.logs import LogBackup
from backend.app.schemas.backup import BackupResponse

class BackupService:
    def __init__(self, db: Session):
        self.db = db

    def get_backup_dir(self) -> Path:
        custom_dir = os.getenv("BIBLIOTECA_BACKUP_DIR", DEFAULT_BACKUP_DIR)
        path = Path(custom_dir)
        try:
            path.mkdir(parents=True, exist_ok=True)
            return path
        except Exception:
            # Fallback para pasta de usuário se o HDD externo não estiver montado
            fallback = Path.home() / ".local" / "share" / "biblioteca" / "backups"
            fallback.mkdir(parents=True, exist_ok=True)
            return fallback

    def realizar_backup(self, destino_customizado: str | None = None) -> BackupResponse:
        data_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        target_dir = Path(destino_customizado) if destino_customizado else self.get_backup_dir()

        try:
            target_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            msg = f"Falha ao acessar diretório de backup: {str(e)}"
            self._registrar_log(data_str, str(target_dir), "falha", msg)
            return BackupResponse(sucesso=False, mensagem=msg)

        backup_file = target_dir / f"backup_biblioteca_{timestamp}.db"

        try:
            # Usar API nativa de backup do SQLite (Seção 12)
            source_conn = sqlite3.connect(str(DB_PATH))
            dest_conn = sqlite3.connect(str(backup_file))
            with dest_conn:
                source_conn.backup(dest_conn)
            source_conn.close()
            dest_conn.close()

            # Validar integridade do arquivo gerado
            verify_conn = sqlite3.connect(str(backup_file))
            cursor = verify_conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            result = cursor.fetchone()
            verify_conn.close()

            if not result or result[0] != "ok":
                raise Exception(f"Verificação de integridade falhou: {result}")

            msg = f"Backup concluído com sucesso e validado em: {backup_file.name}"
            self._registrar_log(data_str, str(backup_file), "sucesso", msg)
            return BackupResponse(sucesso=True, caminho=str(backup_file), mensagem=msg)

        except Exception as e:
            msg = f"Erro ao executar backup SQLite: {str(e)}"
            self._registrar_log(data_str, str(target_dir), "falha", msg)
            return BackupResponse(sucesso=False, mensagem=msg)

    def restaurar_backup(self, caminho_arquivo: str) -> BackupResponse:
        file_path = Path(caminho_arquivo)
        data_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if not file_path.exists():
            msg = f"Arquivo de backup não encontrado: {caminho_arquivo}"
            self._registrar_log(data_str, caminho_arquivo, "falha", msg)
            raise HTTPException(status_code=404, detail=msg)

        try:
            # Verificar integridade do arquivo antes de restaurar
            test_conn = sqlite3.connect(str(file_path))
            cursor = test_conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            res = cursor.fetchone()
            test_conn.close()

            if not res or res[0] != "ok":
                raise Exception("O arquivo de backup selecionado está corrompido.")

            # Fazer cópia de segurança do banco atual antes de substituir (Seção 12)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            seguranca_path = DB_PATH.parent / f"biblioteca_pre_restore_{timestamp}.bak"
            if DB_PATH.exists():
                shutil.copy2(DB_PATH, seguranca_path)

            # Restaurar usando sqlite backup
            src_conn = sqlite3.connect(str(file_path))
            dest_conn = sqlite3.connect(str(DB_PATH))
            with dest_conn:
                src_conn.backup(dest_conn)
            src_conn.close()
            dest_conn.close()

            msg = "Banco de dados restaurado com sucesso. Cópia de segurança anterior preservada."
            self._registrar_log(data_str, caminho_arquivo, "sucesso", msg)
            return BackupResponse(sucesso=True, caminho=str(DB_PATH), mensagem=msg)

        except Exception as e:
            msg = f"Falha na restauração do backup: {str(e)}"
            self._registrar_log(data_str, caminho_arquivo, "falha", msg)
            raise HTTPException(status_code=500, detail=msg)

    def listar_historico(self) -> list[LogBackup]:
        return self.db.query(LogBackup).order_by(LogBackup.data.desc()).limit(50).all()

    def _registrar_log(self, data: str, destino: str, status: str, mensagem: str):
        try:
            log = LogBackup(
                id=f"log-bkp-{uuid.uuid4().hex[:8]}",
                data=data,
                destino=destino,
                status=status,
                mensagem=mensagem
            )
            self.db.add(log)
            self.db.commit()
        except Exception:
            self.db.rollback()
