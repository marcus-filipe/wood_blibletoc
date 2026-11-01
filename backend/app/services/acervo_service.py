import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.repositories.obra_repo import ObraRepository
from backend.app.repositories.exemplar_repo import ExemplarRepository
from backend.app.schemas.obra import ObraCreate, ObraUpdate, ObraResponse
from backend.app.schemas.exemplar import ExemplarCreate, ExemplarResponse

class AcervoService:
    def __init__(self, db: Session):
        self.db = db
        self.obra_repo = ObraRepository(db)
        self.exemplar_repo = ExemplarRepository(db)

    def list_obras(self, apenas_ativas: bool = False):
        return self.obra_repo.list_all(apenas_ativas=apenas_ativas)

    def get_obra(self, obra_id: str):
        obra = self.obra_repo.get_by_id(obra_id)
        if not obra:
            raise HTTPException(status_code=404, detail="Obra não encontrada.")
        return obra

    def create_obra(self, data: ObraCreate):
        obra_id = f"obra-{uuid.uuid4().hex[:8]}"
        return self.obra_repo.create(obra_id, data)

    def update_obra(self, obra_id: str, data: ObraUpdate):
        obra = self.get_obra(obra_id)
        return self.obra_repo.update(obra, data)

    def inativar_obra(self, obra_id: str):
        obra = self.get_obra(obra_id)
        return self.obra_repo.inativar(obra)

    def list_exemplares(self, obra_id: str | None = None):
        if obra_id:
            return self.exemplar_repo.list_by_obra(obra_id)
        return self.exemplar_repo.list_all()

    def get_exemplar(self, exemplar_id: str):
        exemplar = self.exemplar_repo.get_by_id(exemplar_id)
        if not exemplar:
            raise HTTPException(status_code=404, detail="Exemplar não encontrado.")
        return exemplar

    def create_exemplar(self, data: ExemplarCreate):
        # Verificar código de barras único
        existente = self.exemplar_repo.get_by_barcode(data.codigo_barras)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O código de barras '{data.codigo_barras}' já está cadastrado."
            )
        
        # Validar obra pai
        self.get_obra(data.obra_id)
        exemplar_id = f"ex-{uuid.uuid4().hex[:8]}"
        return self.exemplar_repo.create(exemplar_id, data)

    def update_exemplar_status(self, exemplar_id: str, novo_status: str):
        exemplar = self.get_exemplar(exemplar_id)
        return self.exemplar_repo.update_status(exemplar, novo_status)
