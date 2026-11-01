from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.backup_service import BackupService
from backend.app.schemas.backup import (
    BackupResponse,
    RestaurarBackupRequest,
    LogBackupResponse,
    BackupConfigUpdate
)

router = APIRouter(prefix="/api/backup", tags=["Backup e Restauração"])

@router.post("", response_model=BackupResponse)
def executar_backup(
    destino: str | None = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = BackupService(db)
    return service.realizar_backup(destino_customizado=destino)

@router.post("/restaurar", response_model=BackupResponse)
def restaurar_backup(
    payload: RestaurarBackupRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = BackupService(db)
    return service.restaurar_backup(payload.caminho_arquivo)

@router.get("/historico", response_model=list[LogBackupResponse])
def listar_historico(db: Session = Depends(get_db)):
    service = BackupService(db)
    return service.listar_historico()

@router.get("/destino")
def obter_destino_padrao(db: Session = Depends(get_db)):
    service = BackupService(db)
    return {"destino": str(service.get_backup_dir())}
