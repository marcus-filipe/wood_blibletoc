from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.emprestimo import Emprestimo
from backend.app.models.exemplar import Exemplar
from backend.app.models.obra import Obra
from backend.app.models.leitor import Leitor
from backend.app.schemas.relatorio import ObraEstatistica, AlunoEstatistica

class RelatorioRepository:
    def __init__(self, db: Session):
        self.db = db

    def mais_emprestados(self, data_inicio: str | None = None, limite: int = 20) -> list[dict]:
        query = (
            self.db.query(
                Obra.id.label("obra_id"),
                Obra.titulo.label("titulo"),
                Obra.autor.label("autor"),
                Obra.categoria.label("categoria"),
                func.count(Emprestimo.id).label("total_emprestimos")
            )
            .join(Exemplar, Exemplar.obra_id == Obra.id)
            .outerjoin(Emprestimo, Emprestimo.exemplar_id == Exemplar.id)
        )
        if data_inicio:
            query = query.filter(Emprestimo.data_emprestimo >= data_inicio)

        results = (
            query.group_by(Obra.id)
            .order_by(func.count(Emprestimo.id).desc())
            .limit(limite)
            .all()
        )
        return [r._asdict() for r in results]

    def menos_emprestados(self, data_inicio: str | None = None, limite: int = 20) -> list[dict]:
        query = (
            self.db.query(
                Obra.id.label("obra_id"),
                Obra.titulo.label("titulo"),
                Obra.autor.label("autor"),
                Obra.categoria.label("categoria"),
                func.count(Emprestimo.id).label("total_emprestimos")
            )
            .join(Exemplar, Exemplar.obra_id == Obra.id)
            .outerjoin(Emprestimo, Emprestimo.exemplar_id == Exemplar.id)
        )
        if data_inicio:
            query = query.filter(Emprestimo.data_emprestimo >= data_inicio)

        results = (
            query.group_by(Obra.id)
            .order_by(func.count(Emprestimo.id).asc())
            .limit(limite)
            .all()
        )
        return [r._asdict() for r in results]

    def alunos_top(
        self,
        ano: str | None = None,
        sala: str | None = None,
        data_inicio: str | None = None,
        limite: int = 20
    ) -> list[dict]:
        query = (
            self.db.query(
                Leitor.id.label("leitor_id"),
                Leitor.nome.label("nome"),
                Leitor.matricula.label("matricula"),
                func.coalesce(Emprestimo.ano_leitor, Leitor.ano).label("ano"),
                func.coalesce(Emprestimo.sala_leitor, Leitor.sala).label("sala"),
                func.count(Emprestimo.id).label("total_emprestimos")
            )
            .join(Emprestimo, Emprestimo.leitor_id == Leitor.id)
        )
        if data_inicio:
            query = query.filter(Emprestimo.data_emprestimo >= data_inicio)
        if ano and ano != "todos":
            query = query.filter(func.coalesce(Emprestimo.ano_leitor, Leitor.ano) == ano)
        if sala and sala != "todos":
            query = query.filter(func.coalesce(Emprestimo.sala_leitor, Leitor.sala) == sala)

        results = (
            query.group_by(Leitor.id)
            .order_by(func.count(Emprestimo.id).desc())
            .limit(limite)
            .all()
        )
        return [r._asdict() for r in results]
