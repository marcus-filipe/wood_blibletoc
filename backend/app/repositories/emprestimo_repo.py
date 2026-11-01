from datetime import date
from sqlalchemy.orm import Session
from backend.app.models.emprestimo import Emprestimo

class EmprestimoRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, emprestimo_id: str) -> Emprestimo | None:
        return self.db.query(Emprestimo).filter(Emprestimo.id == emprestimo_id).first()

    def get_open_loan_by_exemplar(self, exemplar_id: str) -> Emprestimo | None:
        return self.db.query(Emprestimo).filter(
            Emprestimo.exemplar_id == exemplar_id,
            Emprestimo.data_devolucao.is_(None)
        ).first()

    def count_open_loans_by_leitor(self, leitor_id: str) -> int:
        return self.db.query(Emprestimo).filter(
            Emprestimo.leitor_id == leitor_id,
            Emprestimo.data_devolucao.is_(None)
        ).count()

    def list_open_loans_by_leitor(self, leitor_id: str) -> list[Emprestimo]:
        return self.db.query(Emprestimo).filter(
            Emprestimo.leitor_id == leitor_id,
            Emprestimo.data_devolucao.is_(None)
        ).all()

    def list_all(self, apenas_abertos: bool = False) -> list[Emprestimo]:
        query = self.db.query(Emprestimo)
        if apenas_abertos:
            query = query.filter(Emprestimo.data_devolucao.is_(None))
        return query.order_by(Emprestimo.data_emprestimo.desc()).all()

    def list_overdue(self, data_referencia: str | None = None) -> list[Emprestimo]:
        if not data_referencia:
            data_referencia = date.today().isoformat()
        return self.db.query(Emprestimo).filter(
            Emprestimo.data_devolucao.is_(None),
            Emprestimo.data_prevista < data_referencia
        ).all()

    def has_overdue_loans(self, leitor_id: str, data_referencia: str | None = None) -> bool:
        if not data_referencia:
            data_referencia = date.today().isoformat()
        return self.db.query(Emprestimo).filter(
            Emprestimo.leitor_id == leitor_id,
            Emprestimo.data_devolucao.is_(None),
            Emprestimo.data_prevista < data_referencia
        ).count() > 0

    def create(
        self,
        emprestimo_id: str,
        exemplar_id: str,
        leitor_id: str,
        data_emprestimo: str,
        data_prevista: str,
        ano_leitor: str | None = None,
        sala_leitor: str | None = None
    ) -> Emprestimo:
        emprestimo = Emprestimo(
            id=emprestimo_id,
            exemplar_id=exemplar_id,
            leitor_id=leitor_id,
            data_emprestimo=data_emprestimo,
            data_prevista=data_prevista,
            renovacoes=0,
            ano_leitor=ano_leitor,
            sala_leitor=sala_leitor
        )
        self.db.add(emprestimo)
        self.db.commit()
        self.db.refresh(emprestimo)
        return emprestimo

    def registrar_devolucao(self, emprestimo: Emprestimo, data_devolucao: str) -> Emprestimo:
        emprestimo.data_devolucao = data_devolucao
        self.db.commit()
        self.db.refresh(emprestimo)
        return emprestimo

    def registrar_renovacao(self, emprestimo: Emprestimo, nova_data_prevista: str) -> Emprestimo:
        emprestimo.renovacoes += 1
        emprestimo.data_prevista = nova_data_prevista
        self.db.commit()
        self.db.refresh(emprestimo)
        return emprestimo
