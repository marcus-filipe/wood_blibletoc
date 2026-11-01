from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.acervo_service import AcervoService
from backend.app.schemas.exemplar import (
    ExemplarCreate,
    ExemplarStatusUpdate,
    ExemplarResponse
)

router = APIRouter(prefix="/api/exemplares", tags=["Exemplares"])

@router.get("", response_model=list[ExemplarResponse])
def listar_exemplares(obra_id: str | None = None, db: Session = Depends(get_db)):
    service = AcervoService(db)
    return service.list_exemplares(obra_id=obra_id)

@router.post("", response_model=ExemplarResponse)
def criar_exemplar(
    payload: ExemplarCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = AcervoService(db)
    return service.create_exemplar(payload)

@router.patch("/{exemplar_id}/status", response_model=ExemplarResponse)
def alterar_status_exemplar(
    exemplar_id: str,
    payload: ExemplarStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = AcervoService(db)
    return service.update_exemplar_status(exemplar_id, payload.status)
