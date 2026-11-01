from pydantic import BaseModel, Field

class EmprestimoCreate(BaseModel):
    exemplar_id: str | None = None
    codigo_barras: str | None = None  # Suporte para bipagem direta no balcão
    leitor_id: str

class EmprestimoResponse(BaseModel):
    id: str
    exemplar_id: str
    leitor_id: str
    data_emprestimo: str
    data_prevista: str
    data_devolucao: str | None = None
    renovacoes: int
    ano_leitor: str | None = None
    sala_leitor: str | None = None

    class Config:
        from_attributes = True

class EmprestimoDetailResponse(EmprestimoResponse):
    titulo_obra: str | None = None
    codigo_barras: str | None = None
    nome_leitor: str | None = None
    dias_atraso: int = 0
    esta_atrasado: bool = False
