from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.leitor_service import LeitorService
from backend.app.schemas.tipo_leitor import TipoLeitorUpdate, TipoLeitorResponse

router = APIRouter(prefix="/api/tipos-leitor", tags=["Políticas de Tipo de Leitor"])

@router.get("", response_model=list[TipoLeitorResponse])
def listar_tipos_leitor(db: Session = Depends(get_db)):
    service = LeitorService(db)
    return service.list_tipos_leitor()

@router.put("/{tipo_id}", response_model=TipoLeitorResponse)
def atualizar_tipo_leitor(
    tipo_id: str,
    payload: TipoLeitorUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = LeitorService(db)
    return service.update_tipo_leitor(tipo_id, payload)
