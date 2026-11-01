from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.relatorio_service import RelatorioService

router = APIRouter(prefix="/api/relatorios", tags=["Relatórios e Estatísticas"])

@router.get("/mais-emprestados")
def livros_mais_emprestados(
    periodo: str = Query("todos", pattern="^(todos|7dias|30dias|ano)$"),
    db: Session = Depends(get_db)
):
    service = RelatorioService(db)
    return service.livros_mais_emprestados(periodo=periodo)

@router.get("/menos-emprestados")
def livros_menos_emprestados(
    periodo: str = Query("todos", pattern="^(todos|7dias|30dias|ano)$"),
    db: Session = Depends(get_db)
):
    service = RelatorioService(db)
    return service.livros_menos_emprestados(periodo=periodo)

@router.get("/alunos-top")
def alunos_top(
    ano: str | None = None,
    sala: str | None = None,
    periodo: str = Query("todos", pattern="^(todos|7dias|30dias|ano)$"),
    db: Session = Depends(get_db)
):
    service = RelatorioService(db)
    return service.alunos_top(ano=ano, sala=sala, periodo=periodo)

@router.get("/{nome}/exportar")
def exportar_relatorio(
    nome: str,
    formato: str = Query("csv", pattern="^(csv|xlsx)$"),
    periodo: str = "todos",
    ano: str | None = None,
    sala: str | None = None,
    db: Session = Depends(get_db)
):
    service = RelatorioService(db)
    content, mime, filename = service.exportar(
        nome_relatorio=nome,
        formato=formato,
        periodo=periodo,
        ano=ano,
        sala=sala
    )
    return Response(
        content=content,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
