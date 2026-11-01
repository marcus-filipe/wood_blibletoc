from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.leitor_service import LeitorService
from backend.app.schemas.leitor import LeitorCreate, LeitorUpdate, LeitorResponse

router = APIRouter(prefix="/api/leitores", tags=["Leitores"])

@router.get("", response_model=list[LeitorResponse])
def listar_leitores(apenas_ativos: bool = False, db: Session = Depends(get_db)):
    service = LeitorService(db)
    return service.list_leitores(apenas_ativos=apenas_ativos)

@router.post("", response_model=LeitorResponse)
def criar_leitor(
    payload: LeitorCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = LeitorService(db)
    return service.create_leitor(payload)

@router.get("/{leitor_id}", response_model=LeitorResponse)
def obter_leitor(leitor_id: str, db: Session = Depends(get_db)):
    service = LeitorService(db)
    return service.get_leitor(leitor_id)

@router.put("/{leitor_id}", response_model=LeitorResponse)
def atualizar_leitor(
    leitor_id: str,
    payload: LeitorUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = LeitorService(db)
    return service.update_leitor(leitor_id, payload)
