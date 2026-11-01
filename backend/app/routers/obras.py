from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.acervo_service import AcervoService
from backend.app.schemas.obra import ObraCreate, ObraUpdate, ObraResponse

router = APIRouter(prefix="/api/obras", tags=["Obras"])

@router.get("", response_model=list[ObraResponse])
def listar_obras(apenas_ativas: bool = False, db: Session = Depends(get_db)):
    service = AcervoService(db)
    return service.list_obras(apenas_ativas=apenas_ativas)

@router.post("", response_model=ObraResponse)
def criar_obra(payload: ObraCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    service = AcervoService(db)
    return service.create_obra(payload)

@router.get("/{obra_id}", response_model=ObraResponse)
def obter_obra(obra_id: str, db: Session = Depends(get_db)):
    service = AcervoService(db)
    return service.get_obra(obra_id)

@router.put("/{obra_id}", response_model=ObraResponse)
def atualizar_obra(
    obra_id: str,
    payload: ObraUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = AcervoService(db)
    return service.update_obra(obra_id, payload)

@router.delete("/{obra_id}", response_model=ObraResponse)
def inativar_obra(
    obra_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = AcervoService(db)
    return service.inativar_obra(obra_id)
