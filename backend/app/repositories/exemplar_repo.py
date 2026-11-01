from sqlalchemy.orm import Session
from backend.app.models.exemplar import Exemplar
from backend.app.schemas.exemplar import ExemplarCreate

class ExemplarRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, exemplar_id: str) -> Exemplar | None:
        return self.db.query(Exemplar).filter(Exemplar.id == exemplar_id).first()

    def get_by_barcode(self, codigo_barras: str) -> Exemplar | None:
        return self.db.query(Exemplar).filter(Exemplar.codigo_barras == codigo_barras.strip()).first()

    def list_by_obra(self, obra_id: str) -> list[Exemplar]:
        return self.db.query(Exemplar).filter(Exemplar.obra_id == obra_id).all()

    def list_all(self) -> list[Exemplar]:
        return self.db.query(Exemplar).all()

    def create(self, exemplar_id: str, data: ExemplarCreate) -> Exemplar:
        exemplar = Exemplar(
            id=exemplar_id,
            obra_id=data.obra_id,
            codigo_barras=data.codigo_barras.strip(),
            status=data.status
        )
        self.db.add(exemplar)
        self.db.commit()
        self.db.refresh(exemplar)
        return exemplar

    def update_status(self, exemplar: Exemplar, novo_status: str) -> Exemplar:
        exemplar.status = novo_status
        self.db.commit()
        self.db.refresh(exemplar)
        return exemplar
