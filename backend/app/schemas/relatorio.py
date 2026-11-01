from pydantic import BaseModel

class ObraEstatistica(BaseModel):
    obra_id: str
    titulo: str
    autor: str
    categoria: str | None = None
    total_emprestimos: int
    total_exemplares: int

class AlunoEstatistica(BaseModel):
    leitor_id: str
    nome: str
    matricula: str | None = None
    ano: str | None = None
    sala: str | None = None
    total_emprestimos: int
