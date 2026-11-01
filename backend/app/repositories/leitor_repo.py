from sqlalchemy.orm import Session
from backend.app.models.leitor import Leitor
from backend.app.schemas.leitor import LeitorCreate, LeitorUpdate

class LeitorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, leitor_id: str) -> Leitor | None:
        return self.db.query(Leitor).filter(Leitor.id == leitor_id).first()

    def get_by_matricula(self, matricula: str) -> Leitor | None:
        if not matricula:
            return None
        return self.db.query(Leitor).filter(Leitor.matricula == matricula).first()

    def list_all(self, apenas_ativos: bool = False) -> list[Leitor]:
        query = self.db.query(Leitor)
        if apenas_ativos:
            query = query.filter(Leitor.ativo == True)
        return query.order_by(Leitor.nome.asc()).all()

    def create(self, leitor_id: str, data: LeitorCreate) -> Leitor:
        leitor = Leitor(
            id=leitor_id,
            nome=data.nome,
            matricula=data.matricula,
            tipo_leitor_id=data.tipo_leitor_id,
            ano=data.ano,
            sala=data.sala,
            contato=data.contato,
            ativo=data.ativo
        )
        self.db.add(leitor)
        self.db.commit()
        self.db.refresh(leitor)
        return leitor

    def update(self, leitor: Leitor, data: LeitorUpdate) -> Leitor:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(leitor, key, value)
        self.db.commit()
        self.db.refresh(leitor)
        return leitor
