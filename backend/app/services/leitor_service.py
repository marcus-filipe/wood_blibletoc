import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.tipo_leitor import TipoLeitor
from backend.app.repositories.leitor_repo import LeitorRepository
from backend.app.schemas.leitor import LeitorCreate, LeitorUpdate
from backend.app.schemas.tipo_leitor import TipoLeitorUpdate

class LeitorService:
    def __init__(self, db: Session):
        self.db = db
        self.leitor_repo = LeitorRepository(db)

    def ensure_default_tipos(self):
        """Garante os tipos de leitor padrão do sistema (Seção 7.5)."""
        defaults = [
            {"id": "tipo-aluno", "codigo": "aluno", "nome": "Aluno", "prazo_dias": 7, "limite_emprestimos": 3, "max_renovacoes": 2},
            {"id": "tipo-professor", "codigo": "professor", "nome": "Professor", "prazo_dias": 15, "limite_emprestimos": 5, "max_renovacoes": 3},
            {"id": "tipo-publico", "codigo": "publico", "nome": "Público", "prazo_dias": 7, "limite_emprestimos": 2, "max_renovacoes": 1},
        ]
        for t in defaults:
            existente = self.db.query(TipoLeitor).filter(TipoLeitor.codigo == t["codigo"]).first()
            if not existente:
                tipo = TipoLeitor(**t)
                self.db.add(tipo)
        self.db.commit()

    def list_tipos_leitor(self) -> list[TipoLeitor]:
        self.ensure_default_tipos()
        return self.db.query(TipoLeitor).all()

    def update_tipo_leitor(self, tipo_id: str, data: TipoLeitorUpdate) -> TipoLeitor:
        tipo = self.db.query(TipoLeitor).filter(TipoLeitor.id == tipo_id).first()
        if not tipo:
            raise HTTPException(status_code=404, detail="Tipo de leitor não encontrado.")
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tipo, key, value)
        self.db.commit()
        self.db.refresh(tipo)
        return tipo

    def list_leitores(self, apenas_ativos: bool = False):
        return self.leitor_repo.list_all(apenas_ativos=apenas_ativos)

    def get_leitor(self, leitor_id: str):
        leitor = self.leitor_repo.get_by_id(leitor_id)
        if not leitor:
            raise HTTPException(status_code=404, detail="Leitor não encontrado.")
        return leitor

    def create_leitor(self, data: LeitorCreate):
        if data.matricula:
            existente = self.leitor_repo.get_by_matricula(data.matricula)
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe leitor cadastrado com a matrícula '{data.matricula}'."
                )
        
        # Validar tipo de leitor
        tipo = self.db.query(TipoLeitor).filter(TipoLeitor.id == data.tipo_leitor_id).first()
        if not tipo:
            raise HTTPException(status_code=400, detail="Tipo de leitor inválido.")

        leitor_id = f"lei-{uuid.uuid4().hex[:8]}"
        return self.leitor_repo.create(leitor_id, data)

    def update_leitor(self, leitor_id: str, data: LeitorUpdate):
        leitor = self.get_leitor(leitor_id)
        if data.matricula and data.matricula != leitor.matricula:
            existente = self.leitor_repo.get_by_matricula(data.matricula)
            if existente and existente.id != leitor.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe leitor cadastrado com a matrícula '{data.matricula}'."
                )
        return self.leitor_repo.update(leitor, data)
