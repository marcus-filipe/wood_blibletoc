from pydantic import BaseModel, Field

class LeitorBase(BaseModel):
    nome: str = Field(..., min_length=2)
    matricula: str | None = None
    tipo_leitor_id: str
    ano: str | None = None
    sala: str | None = None
    contato: str | None = None
    ativo: bool = True

class LeitorCreate(LeitorBase):
    pass

class LeitorUpdate(BaseModel):
    nome: str | None = None
    matricula: str | None = None
    tipo_leitor_id: str | None = None
    ano: str | None = None
    sala: str | None = None
    contato: str | None = None
    ativo: bool | None = None

class LeitorResponse(LeitorBase):
    id: str

    class Config:
        from_attributes = True
