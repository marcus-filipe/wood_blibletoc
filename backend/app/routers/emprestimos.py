from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.emprestimo_service import EmprestimoService
from backend.app.services.atraso_service import AtrasoService
from backend.app.schemas.emprestimo import (
    EmprestimoCreate,
    EmprestimoResponse,
    EmprestimoDetailResponse
)
from backend.app.models.emprestimo import Emprestimo
from backend.app.models.exemplar import Exemplar
from backend.app.models.obra import Obra
from backend.app.models.leitor import Leitor

router = APIRouter(prefix="/api/emprestimos", tags=["Empréstimos"])

def _enrich_loan(e: Emprestimo, db: Session, atraso_service: AtrasoService) -> dict:
    ex = db.query(Exemplar).filter(Exemplar.id == e.exemplar_id).first()
    ob = db.query(Obra).filter(Obra.id == ex.obra_id).first() if ex else None
    lei = db.query(Leitor).filter(Leitor.id == e.leitor_id).first()

    is_overdue = atraso_service.is_loan_overdue(e)
    dias_atraso = atraso_service.calcular_dias_atraso(e.data_prevista) if is_overdue else 0

    return {
        "id": e.id,
        "exemplar_id": e.exemplar_id,
        "leitor_id": e.leitor_id,
        "data_emprestimo": e.data_emprestimo,
        "data_prevista": e.data_prevista,
        "data_devolucao": e.data_devolucao,
        "renovacoes": e.renovacoes,
        "ano_leitor": e.ano_leitor,
        "sala_leitor": e.sala_leitor,
        "codigo_barras": ex.codigo_barras if ex else "",
        "titulo_obra": ob.titulo if ob else "",
        "nome_leitor": lei.nome if lei else "",
        "dias_atraso": dias_atraso,
        "esta_atrasado": is_overdue
    }

@router.get("", response_model=list[EmprestimoDetailResponse])
def listar_emprestimos(
    apenas_abertos: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Emprestimo)
    if apenas_abertos:
        query = query.filter(Emprestimo.data_devolucao.is_(None))
    loans = query.order_by(Emprestimo.data_emprestimo.desc()).all()
    atraso_service = AtrasoService(db)
    return [_enrich_loan(e, db, atraso_service) for e in loans]

@router.get("/atrasados", response_model=list[EmprestimoDetailResponse])
def listar_atrasados(db: Session = Depends(get_db)):
    atraso_service = AtrasoService(db)
    loans = atraso_service.list_emprestimos_atrasados()
    return [_enrich_loan(e, db, atraso_service) for e in loans]

@router.post("", response_model=EmprestimoResponse)
def registrar_emprestimo(
    payload: EmprestimoCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = EmprestimoService(db)
    return service.registrar_emprestimo(
        leitor_id=payload.leitor_id,
        exemplar_id=payload.exemplar_id,
        codigo_barras=payload.codigo_barras
    )

@router.post("/{emprestimo_id}/devolucao", response_model=EmprestimoResponse)
def registrar_devolucao(
    emprestimo_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = EmprestimoService(db)
    return service.registrar_devolucao(emprestimo_id)

@router.post("/{emprestimo_id}/renovacao", response_model=EmprestimoResponse)
def registrar_renovacao(
    emprestimo_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    service = EmprestimoService(db)
    return service.registrar_renovacao(emprestimo_id)
