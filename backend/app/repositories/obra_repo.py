from sqlalchemy.orm import Session
from backend.app.models.obra import Obra
from backend.app.schemas.obra import ObraCreate, ObraUpdate

class ObraRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, obra_id: str) -> Obra | None:
        return self.db.query(Obra).filter(Obra.id == obra_id).first()

    def list_all(self, apenas_ativas: bool = False) -> list[Obra]:
        query = self.db.query(Obra)
        if apenas_ativas:
            query = query.filter(Obra.ativo == True)
        return query.order_by(Obra.titulo.asc()).all()

    def create(self, obra_id: str, data: ObraCreate) -> Obra:
        obra = Obra(
            id=obra_id,
            titulo=data.titulo,
            autor=data.autor,
            editora=data.editora,
            ano_publicacao=data.ano_publicacao,
            isbn=data.isbn,
            categoria=data.categoria,
            tipo_material=data.tipo_material,
            ativo=data.ativo
        )
        self.db.add(obra)
        self.db.commit()
        self.db.refresh(obra)
        return obra

    def update(self, obra: Obra, data: ObraUpdate) -> Obra:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(obra, key, value)
        self.db.commit()
        self.db.refresh(obra)
        return obra

    def inativar(self, obra: Obra) -> Obra:
        obra.ativo = False
        self.db.commit()
        self.db.refresh(obra)
        return obra
