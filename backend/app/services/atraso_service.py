from datetime import date, datetime
from sqlalchemy.orm import Session
from backend.app.models.emprestimo import Emprestimo

class AtrasoService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def get_today_str() -> str:
        return date.today().isoformat()

    def is_loan_overdue(self, emprestimo: Emprestimo, data_ref: str | None = None) -> bool:
        if emprestimo.data_devolucao:
            return False
        ref = data_ref or self.get_today_str()
        return emprestimo.data_prevista < ref

    def calcular_dias_atraso(self, data_prevista: str, data_ref: str | None = None) -> int:
        ref_str = data_ref or self.get_today_str()
        d_prev = datetime.strptime(data_prevista, "%Y-%m-%d").date()
        d_ref = datetime.strptime(ref_str, "%Y-%m-%d").date()
        diff = (d_ref - d_prev).days
        return max(0, diff)

    def leitor_possui_atraso(self, leitor_id: str, data_ref: str | None = None) -> bool:
        ref = data_ref or self.get_today_str()
        return self.db.query(Emprestimo).filter(
            Emprestimo.leitor_id == leitor_id,
            Emprestimo.data_devolucao.is_(None),
            Emprestimo.data_prevista < ref
        ).count() > 0

    def list_emprestimos_atrasados(self, data_ref: str | None = None) -> list[Emprestimo]:
        ref = data_ref or self.get_today_str()
        return self.db.query(Emprestimo).filter(
            Emprestimo.data_devolucao.is_(None),
            Emprestimo.data_prevista < ref
        ).order_by(Emprestimo.data_prevista.asc()).all()
