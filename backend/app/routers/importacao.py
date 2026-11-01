from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.importacao_service import ImportacaoService
from backend.app.schemas.importacao import (
    PreviaResponse,
    ImportarConfirmRequest,
    ImportarResponse
)
from backend.app.models.logs import LogImportacao

router = APIRouter(prefix="/api/importacao", tags=["Importação de Acervo"])

@router.post("/previa", response_model=PreviaResponse)
async def gerar_previa(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    content = await file.read()
    service = ImportacaoService(db)
    return service.processar_previa(file, content)

@router.post("/confirmar", response_model=ImportarResponse)
def confirmar_importacao(
    payload: ImportarConfirmRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = ImportacaoService(db)
    return service.confirmar_importacao(payload.arquivo, payload.itens)

@router.get("/historico")
def listar_historico(db: Session = Depends(get_db)):
    logs = db.query(LogImportacao).order_by(LogImportacao.data.desc()).limit(50).all()
    return logs
